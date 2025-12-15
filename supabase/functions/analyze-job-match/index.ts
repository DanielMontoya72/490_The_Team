import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Job ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header to extract user ID
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing job match for job ${jobId}, user ${user.id}`);

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      console.error('Job fetch error:', jobError);
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch user skills
    const { data: skills } = await supabase
      .from('skills')
      .select('*')
      .eq('user_id', user.id);

    // Fetch education
    const { data: education } = await supabase
      .from('education')
      .select('*')
      .eq('user_id', user.id)
      .order('graduation_date', { ascending: false });

    // Fetch employment history
    const { data: employment } = await supabase
      .from('employment_history')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });

    // Fetch certifications
    const { data: certifications } = await supabase
      .from('certifications')
      .select('*')
      .eq('user_id', user.id);

    // Fetch projects
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id);

    // Fetch user's matching preferences (weights)
    const { data: preferences } = await supabase
      .from('user_matching_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const weights = preferences || {
      skills_weight: 40,
      experience_weight: 35,
      education_weight: 25,
    };

    // Build AI prompt
    const prompt = `
Analyze how well this candidate matches this job opportunity. Provide a detailed assessment.

JOB INFORMATION:
- Title: ${job.job_title}
- Company: ${job.company_name}
- Location: ${job.location || 'Not specified'}
- Industry: ${job.industry || 'Not specified'}
- Type: ${job.job_type || 'Not specified'}
- Description: ${job.job_description || 'Not provided'}
- Required Skills/Qualifications: Extract from description above

CANDIDATE PROFILE:
- Name: ${profile?.first_name || ''} ${profile?.last_name || ''}
- Headline: ${profile?.headline || 'Not provided'}
- Bio: ${profile?.bio || 'Not provided'}
- Industry: ${profile?.industry || 'Not specified'}
- Experience Level: ${profile?.experience_level || 'Not specified'}
- Location: ${profile?.location || 'Not specified'}

SKILLS (${skills?.length || 0} total):
${skills?.map(s => `- ${s.skill_name} (${s.proficiency_level}, ${s.category})`).join('\n') || 'No skills listed'}

EDUCATION (${education?.length || 0} total):
${education?.map(e => `- ${e.degree_type} in ${e.field_of_study} from ${e.institution_name}${e.gpa ? ` (GPA: ${e.gpa})` : ''}`).join('\n') || 'No education listed'}

EMPLOYMENT HISTORY (${employment?.length || 0} total):
${employment?.map(e => `- ${e.job_title} at ${e.company_name} (${e.start_date} - ${e.is_current ? 'Present' : e.end_date || 'Unknown'})\n  ${e.job_description || ''}`).join('\n') || 'No employment history'}

CERTIFICATIONS (${certifications?.length || 0} total):
${certifications?.map(c => `- ${c.certification_name} from ${c.issuing_organization} (${c.date_earned})`).join('\n') || 'No certifications'}

PROJECTS (${projects?.length || 0} total):
${projects?.map(p => `- ${p.project_name}: ${p.description} (${p.role})`).join('\n') || 'No projects'}

MATCHING WEIGHTS:
- Skills: ${weights.skills_weight}%
- Experience: ${weights.experience_weight}%
- Education: ${weights.education_weight}%

Please provide your analysis in this exact structure using tool calling.
`;

    console.log('Calling Gemini AI for match analysis...');

    const systemInstruction = 'You are an expert career counselor and job matching analyst. Analyze candidate-job fit comprehensively and provide actionable insights.';

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
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
          tools: [{
            functionDeclarations: [{
              name: 'provide_match_analysis',
              description: 'Provide a comprehensive job match analysis with scores and recommendations',
              parameters: {
                type: 'object',
                properties: {
                  skills_score: {
                    type: 'integer',
                    description: 'Skills match score from 0-100'
                  },
                  experience_score: {
                    type: 'integer',
                    description: 'Experience match score from 0-100'
                  },
                  education_score: {
                    type: 'integer',
                    description: 'Education match score from 0-100'
                  },
                  strengths: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        category: { type: 'string', description: 'Category (skills/experience/education/other)' },
                        description: { type: 'string', description: 'Detailed description of this strength' }
                      },
                      required: ['category', 'description']
                    },
                    description: '3-5 key strengths that make the candidate a good fit'
                  },
                  gaps: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        category: { type: 'string', description: 'Category (skills/experience/education/other)' },
                        description: { type: 'string', description: 'Detailed description of this gap' },
                        severity: { type: 'string', enum: ['low', 'medium', 'high'], description: 'How critical is this gap' }
                      },
                      required: ['category', 'description', 'severity']
                    },
                    description: '2-5 gaps or areas where candidate falls short'
                  },
                  improvement_suggestions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        suggestion: { type: 'string', description: 'Specific actionable suggestion' },
                        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Priority level' },
                        impact: { type: 'string', description: 'Expected impact on match score' }
                      },
                      required: ['suggestion', 'priority', 'impact']
                    },
                    description: '3-7 specific suggestions to improve candidacy'
                  },
                  summary: {
                    type: 'string',
                    description: 'Brief 2-3 sentence overall assessment'
                  },
                  recommendation: {
                    type: 'string',
                    enum: ['highly_recommended', 'recommended', 'consider', 'not_recommended'],
                    description: 'Overall application recommendation'
                  }
                },
                required: ['skills_score', 'experience_score', 'education_score', 'strengths', 'gaps', 'improvement_suggestions', 'summary', 'recommendation']
              }
            }]
          }],
          toolConfig: {
            functionCallingConfig: { mode: 'ANY' }
          }
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to analyze match' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    // Extract function call result from Gemini response
    const candidate = aiData.candidates?.[0];
    const functionCall = candidate?.content?.parts?.[0]?.functionCall;
    if (!functionCall || functionCall.name !== 'provide_match_analysis') {
      console.error('No valid function call in AI response');
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const analysis = functionCall.args;

    // Calculate overall score using user's preferred weights
    const overallScore = Math.round(
      (analysis.skills_score * weights.skills_weight / 100) +
      (analysis.experience_score * weights.experience_weight / 100) +
      (analysis.education_score * weights.education_weight / 100)
    );

    // Store the analysis in database
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('job_match_analyses')
      .insert({
        job_id: jobId,
        user_id: user.id,
        overall_score: overallScore,
        skills_score: analysis.skills_score,
        experience_score: analysis.experience_score,
        education_score: analysis.education_score,
        strengths: analysis.strengths,
        gaps: analysis.gaps,
        improvement_suggestions: analysis.improvement_suggestions,
        match_details: {
          summary: analysis.summary,
          recommendation: analysis.recommendation,
          weights_used: weights
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving analysis:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save analysis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Match analysis completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis: savedAnalysis 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-job-match function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
