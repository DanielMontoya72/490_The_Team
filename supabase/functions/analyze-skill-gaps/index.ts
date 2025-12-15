import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { jobId } = await req.json();
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    // Fetch user's current skills
    const { data: userSkills, error: skillsError } = await supabase
      .from('skills')
      .select('*')
      .eq('user_id', user.id);

    if (skillsError) {
      console.error('Skills fetch error:', skillsError);
      throw new Error('Failed to fetch user skills');
    }

    console.log('User skills fetched:', userSkills?.length || 0, 'skills');

    // Fetch user's employment history for context
    const { data: employment, error: employmentError } = await supabase
      .from('employment_history')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });

    if (employmentError) {
      console.error('Failed to fetch employment:', employmentError);
    }

    // Prepare prompt for AI analysis
    const userSkillsList = userSkills?.map(s => `${s.skill_name} (${s.proficiency_level}, ${s.category})`) || [];
    const jobDescription = job.job_description || '';
    const jobTitle = job.job_title || '';
    const experienceSummary = employment?.slice(0, 3).map(e => 
      `${e.job_title} at ${e.company_name}: ${e.job_description?.substring(0, 200) || ''}`
    ).join('\n') || 'No experience listed';

    console.log('Analyzing skills for job:', jobTitle);
    console.log('User has', userSkillsList.length, 'skills:', userSkillsList.join(', '));

    const prompt = `Analyze the skill gaps for this job opportunity and provide a comprehensive learning plan.

JOB TITLE: ${jobTitle}
COMPANY: ${job.company_name}

JOB DESCRIPTION:
${jobDescription}

USER'S CURRENT SKILLS:
${userSkillsList.join(', ') || 'No skills listed'}

USER'S RECENT EXPERIENCE:
${experienceSummary}

IMPORTANT: You MUST return a valid JSON object with these EXACT fields:
{
  "missing_skills": [
    {
      "skill": "skill name",
      "importance": "High/Medium/Low",
      "reason": "why this skill is needed"
    }
  ],
  "weak_skills": [
    {
      "skill": "skill name",
      "current_level": "user's current level",
      "required_level": "level needed for job",
      "gap_description": "description of the gap"
    }
  ],
  "matching_skills": [
    {
      "skill": "skill name",
      "proficiency": "user's level",
      "relevance": "how it applies to the job"
    }
  ],
  "priority_skills": [
    {
      "skill": "skill name",
      "priority": "High/Medium/Low",
      "impact": "expected impact on job performance",
      "reason": "why this is prioritized"
    }
  ],
  "learning_path": [
    {
      "skill": "skill name",
      "order": 1,
      "estimated_weeks": 4,
      "resources": [
        {
          "title": "resource name",
          "type": "Course/Tutorial/Book/Documentation",
          "url": "https://...",
          "description": "brief description"
        }
      ],
      "milestones": ["milestone 1", "milestone 2"]
    }
  ]
}

Analyze the user's ACTUAL skills listed above and compare them to the job requirements. Be specific and actionable.`;

    // Call Gemini AI
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const systemInstruction = 'You are an expert career development advisor and technical skills analyst. Provide detailed, actionable skill gap analyses with specific learning resources.';

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\n${prompt}` }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    console.log('AI Response length:', analysisText?.length);
    
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
      console.log('Successfully parsed AI response');
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('AI response text:', analysisText?.substring(0, 500));
      throw new Error('Failed to parse AI analysis response');
    }

    // Ensure arrays are properly formatted
    const learningPath = Array.isArray(analysis.learning_path) ? analysis.learning_path : [];
    const missingSkills = Array.isArray(analysis.missing_skills) ? analysis.missing_skills : [];
    const weakSkills = Array.isArray(analysis.weak_skills) ? analysis.weak_skills : [];
    const matchingSkills = Array.isArray(analysis.matching_skills) ? analysis.matching_skills : [];
    const prioritySkills = Array.isArray(analysis.priority_skills) ? analysis.priority_skills : [];

    console.log('Analysis results:', {
      missingSkills: missingSkills.length,
      weakSkills: weakSkills.length,
      matchingSkills: matchingSkills.length,
      prioritySkills: prioritySkills.length,
      learningPath: learningPath.length
    });

    // Calculate estimated learning time
    const estimatedWeeks = learningPath.reduce((total: number, item: any) => {
      return total + (item.estimated_weeks || 2);
    }, 0) || 8;

    // Store the analysis
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('skill_gap_analyses')
      .insert({
        user_id: user.id,
        job_id: jobId,
        missing_skills: missingSkills,
        weak_skills: weakSkills,
        matching_skills: matchingSkills,
        learning_path: learningPath,
        priority_skills: prioritySkills,
        estimated_learning_time_weeks: estimatedWeeks
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save analysis:', saveError);
      throw new Error('Failed to save skill gap analysis');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: savedAnalysis,
        fullAnalysis: analysis
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-skill-gaps:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
