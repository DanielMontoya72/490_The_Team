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
    const { jobId } = await req.json();

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Job ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
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

    // Fetch employment history
    const { data: employment } = await supabase
      .from('employment_history')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });

    // Fetch education
    const { data: education } = await supabase
      .from('education')
      .select('*')
      .eq('user_id', user.id);

    // Fetch job match analysis if available
    const { data: matchAnalysis } = await supabase
      .from('job_match_analyses')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a career competitiveness analyst. Analyze how competitive a job applicant is for a specific role and provide strategic insights.

Your analysis must be realistic, data-driven, and actionable. Consider:
- Market conditions for this type of role
- The user's qualifications vs typical requirements
- Unique differentiators the user might have
- Realistic interview likelihood based on profile strength`;

    const userPrompt = `Analyze this user's competitiveness for the following job:

JOB DETAILS:
- Title: ${job.job_title || 'Not specified'}
- Company: ${job.company_name || 'Not specified'}
- Location: ${job.location || 'Not specified'}
- Industry: ${job.industry || 'Not specified'}
- Job Type: ${job.job_type || 'Not specified'}
- Description: ${job.job_description || 'Not provided'}
- Posted: ${job.created_at ? new Date(job.created_at).toLocaleDateString() : 'Unknown'}

USER PROFILE:
- Name: ${profile?.first_name || ''} ${profile?.last_name || ''}
- Current Title: ${profile?.current_job_title || 'Not specified'}
- Experience: ${profile?.years_of_experience || 0} years
- Bio: ${profile?.professional_bio || 'Not provided'}

SKILLS:
${skills?.map(s => `- ${s.skill_name} (${s.proficiency_level || 'intermediate'})`).join('\n') || 'No skills listed'}

WORK EXPERIENCE:
${employment?.slice(0, 5).map(e => `- ${e.job_title} at ${e.company_name} (${e.start_date} - ${e.is_current ? 'Present' : e.end_date})`).join('\n') || 'No experience listed'}

EDUCATION:
${education?.map(e => `- ${e.degree_type} in ${e.field_of_study} from ${e.institution_name}`).join('\n') || 'No education listed'}

${matchAnalysis ? `
JOB MATCH ANALYSIS:
- Overall Score: ${matchAnalysis.overall_score || 'N/A'}
- Skills Score: ${matchAnalysis.skills_score || 'N/A'}
- Experience Score: ${matchAnalysis.experience_score || 'N/A'}
` : ''}

Provide a comprehensive competitive analysis.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
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
          tools: [{
            functionDeclarations: [{
              name: 'analyze_competitiveness',
              description: 'Analyze job application competitiveness',
              parameters: {
                type: 'object',
                properties: {
                  estimated_applicants: {
                    type: 'integer',
                    description: 'Estimated number of applicants for this role (50-500 range typically)'
                  },
                  applicant_estimation_factors: {
                    type: 'object',
                    properties: {
                      posting_age_days: { type: 'integer' },
                      company_size_factor: { type: 'string', enum: ['small', 'medium', 'large', 'enterprise'] },
                      role_popularity: { type: 'string', enum: ['niche', 'moderate', 'popular', 'highly_competitive'] },
                      location_factor: { type: 'string', enum: ['local', 'regional', 'national', 'global'] },
                      platform_visibility: { type: 'string', enum: ['low', 'medium', 'high'] }
                    }
                  },
                  competitive_score: {
                    type: 'integer',
                    description: 'User competitive score 0-100 based on profile vs requirements'
                  },
                  competitive_advantages: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        advantage: { type: 'string' },
                        strength: { type: 'string', enum: ['strong', 'moderate', 'slight'] },
                        description: { type: 'string' }
                      }
                    }
                  },
                  competitive_disadvantages: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        disadvantage: { type: 'string' },
                        severity: { type: 'string', enum: ['critical', 'significant', 'minor'] },
                        description: { type: 'string' }
                      }
                    }
                  },
                  mitigation_strategies: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        for_disadvantage: { type: 'string' },
                        strategy: { type: 'string' },
                        effort_level: { type: 'string', enum: ['low', 'medium', 'high'] },
                        timeline: { type: 'string' }
                      }
                    }
                  },
                  interview_likelihood: {
                    type: 'string',
                    enum: ['low', 'medium', 'high']
                  },
                  interview_confidence: {
                    type: 'integer',
                    description: 'Confidence percentage in the interview likelihood estimate (0-100)'
                  },
                  differentiating_strategies: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        strategy: { type: 'string' },
                        impact: { type: 'string', enum: ['high', 'medium', 'low'] },
                        implementation: { type: 'string' },
                        unique_angle: { type: 'string' }
                      }
                    }
                  },
                  typical_hired_profile: {
                    type: 'object',
                    properties: {
                      years_experience: { type: 'string' },
                      education_level: { type: 'string' },
                      key_skills: { type: 'array', items: { type: 'string' } },
                      background: { type: 'string' },
                      common_traits: { type: 'array', items: { type: 'string' } }
                    }
                  },
                  profile_comparison: {
                    type: 'object',
                    properties: {
                      experience_match: { type: 'string', enum: ['above', 'meets', 'below'] },
                      skills_match: { type: 'string', enum: ['above', 'meets', 'below'] },
                      education_match: { type: 'string', enum: ['above', 'meets', 'below'] },
                      overall_fit: { type: 'string', enum: ['strong', 'good', 'moderate', 'weak'] },
                      standout_factors: { type: 'array', items: { type: 'string' } }
                    }
                  },
                  priority_score: {
                    type: 'integer',
                    description: 'Priority score 0-100 for whether to prioritize this application'
                  },
                  priority_reasoning: {
                    type: 'string',
                    description: 'Brief explanation of why this application should or should not be prioritized'
                  },
                  analysis_summary: {
                    type: 'string',
                    description: 'Brief overall summary of competitiveness (2-3 sentences)'
                  }
                },
                required: ['competitive_score', 'competitive_advantages', 'competitive_disadvantages', 'interview_likelihood', 'interview_confidence', 'differentiating_strategies', 'priority_score', 'analysis_summary']
              }
            }]
          }],
          toolConfig: {
            functionCallingConfig: { mode: 'ANY' }
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const functionCall = aiResponse.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    
    if (!functionCall) {
      return new Response(
        JSON.stringify({ error: 'No analysis generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const analysis = functionCall.args;

    // Save to database
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('job_competitive_analysis')
      .upsert({
        user_id: user.id,
        job_id: jobId,
        estimated_applicants: analysis.estimated_applicants,
        applicant_estimation_factors: analysis.applicant_estimation_factors,
        competitive_score: analysis.competitive_score,
        competitive_advantages: analysis.competitive_advantages,
        competitive_disadvantages: analysis.competitive_disadvantages,
        mitigation_strategies: analysis.mitigation_strategies,
        interview_likelihood: analysis.interview_likelihood,
        interview_confidence: analysis.interview_confidence,
        differentiating_strategies: analysis.differentiating_strategies,
        typical_hired_profile: analysis.typical_hired_profile,
        profile_comparison: analysis.profile_comparison,
        priority_score: analysis.priority_score,
        priority_reasoning: analysis.priority_reasoning,
        analysis_summary: analysis.analysis_summary,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'job_id,user_id'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Save error:', saveError);
      // Return analysis even if save fails
    }

    return new Response(
      JSON.stringify({ success: true, analysis: savedAnalysis || analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
