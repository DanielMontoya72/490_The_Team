import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', job.user_id)
      .single();

    // Check if insights already exist
    const { data: existing } = await supabase
      .from('interview_insights')
      .select('id')
      .eq('job_id', jobId)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ message: 'Interview insights already exist for this job' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const systemPrompt = `You are an expert interview preparation advisor with deep knowledge of company hiring practices. Analyze the job position and company to provide comprehensive interview insights.

CRITICAL: For interviewer_info, you MUST provide 2-4 realistic interviewer profiles based on the company size and role level:
- For each interviewer, specify their likely role (e.g., "Senior Engineering Manager", "HR Business Partner", "Director of Product")
- Provide detailed background including years of experience, previous companies, education (if relevant for the role)
- List 3-5 specific focus areas they typically evaluate (e.g., "System design skills", "Team collaboration", "Problem-solving approach")

Return a JSON object with this exact structure:
{
  "interview_process": [
    {"stage": "string (e.g., Phone Screen, Technical Round)", "description": "detailed description of what happens in this stage", "duration": "string (e.g., 30-45 minutes)"}
  ],
  "common_questions": [
    {"question": "specific question they might ask", "category": "behavioral|technical|situational", "tips": "specific tips for answering this question well"}
  ],
  "interviewer_info": [
    {"role": "specific job title of interviewer", "background": "detailed background: years of experience, previous roles/companies, education if relevant, their specialty areas", "focus_areas": ["specific evaluation criteria 1", "specific evaluation criteria 2", "specific evaluation criteria 3"]}
  ],
  "interview_formats": [
    {"type": "string (e.g., Panel Interview, One-on-One)", "description": "what this format involves", "preparation_tips": "specific tips for this format"}
  ],
  "preparation_recommendations": [
    {"area": "specific area to prepare", "recommendation": "detailed, actionable recommendation", "priority": "high|medium|low"}
  ],
  "timeline_expectations": "detailed timeline from application to offer, with typical durations for each stage",
  "success_tips": [
    {"tip": "specific, actionable tip", "category": "preparation|during|follow-up"}
  ],
  "preparation_checklist": [
    {"item": "specific preparation task", "completed": false, "priority": "high|medium|low"}
  ]
}

IMPORTANT: interviewer_info MUST include at least 2-4 realistic profiles. For technical roles, include technical interviewers. For management roles, include senior leaders. For entry-level, include team leads and HR.`;

    const userPrompt = `Provide detailed, realistic interview insights for this position:

Job Title: ${job.job_title}
Company: ${job.company_name}
Industry: ${job.industry || 'Not specified'}
Location: ${job.location || 'Not specified'}
Job Type: ${job.job_type || 'Not specified'}
Company Size: ${job.company_size || 'Not specified'}

Job Description:
${job.job_description || 'No description provided'}

User Background:
Experience Level: ${profile?.experience_level || 'Not specified'}
Industry: ${profile?.industry || 'Not specified'}

Provide comprehensive interview insights:

1. **Interview Process**: Detailed stages from application to offer
2. **Common Questions**: 8-12 specific questions they're likely to ask, with tips for each
3. **Interviewer Information (CRITICAL)**: 2-4 realistic interviewer profiles:
   - For technical roles: include Senior Engineers, Engineering Managers, Tech Leads
   - For product roles: include Product Managers, Directors, cross-functional partners
   - For business roles: include team leads, department heads, HR partners
   - Each profile must have: specific job title, detailed background (experience, previous companies, expertise), and 3-5 focus areas
4. **Interview Formats**: What types of interviews to expect (phone, video, onsite, panel, etc.)
5. **Preparation Recommendations**: Specific, actionable preparation steps prioritized by importance
6. **Timeline Expectations**: Realistic timeline from application to decision
7. **Success Tips**: Insider tips for succeeding in this company's interview process
8. **Preparation Checklist**: Comprehensive list of preparation tasks

Base the interviewer profiles on the company size and role level. Make them realistic and specific to the industry and company type.`;

    console.log('Calling Gemini AI for interview insights...');

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    console.log('AI Response received, parsing...');

    let insights;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        insights = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse interview insights from AI response');
    }

    // Insert interview insights
    const { data: insertedInsights, error: insertError } = await supabase
      .from('interview_insights')
      .insert({
        job_id: jobId,
        user_id: job.user_id,
        interview_process: insights.interview_process || [],
        common_questions: insights.common_questions || [],
        interviewer_info: insights.interviewer_info || [],
        interview_formats: insights.interview_formats || [],
        preparation_recommendations: insights.preparation_recommendations || [],
        timeline_expectations: insights.timeline_expectations || '',
        success_tips: insights.success_tips || [],
        preparation_checklist: insights.preparation_checklist || []
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ insights: insertedInsights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-interview-insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});