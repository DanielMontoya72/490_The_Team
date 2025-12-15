import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobDescription, employmentHistory } = await req.json();

    if (!jobDescription || !employmentHistory || !Array.isArray(employmentHistory)) {
      return new Response(
        JSON.stringify({ error: 'Job description and employment history are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert resume optimization specialist. Analyze the job description and tailor the user's work experience to maximize relevance and impact.

For each employment entry, provide:
1. A relevance score (0-100) indicating how well this role aligns with the job
2. Three variations of the job description with different focuses:
   - Version 1: Technical skills and tools emphasis
   - Version 2: Leadership and impact emphasis  
   - Version 3: Results and metrics emphasis
3. Suggested action verbs that are stronger and more relevant
4. Quantified accomplishments where possible (add specific metrics, percentages, dollar amounts based on typical industry standards if not provided)
5. Industry-specific terminology from the job posting
6. Key responsibilities to emphasize based on job requirements

Maintain chronological accuracy and factual integrity. Only suggest realistic quantifications.`;

    const prompt = `Job Description:
${jobDescription}

Employment History:
${JSON.stringify(employmentHistory, null, 2)}

Analyze each role and provide tailored descriptions that highlight the most relevant experience for this specific job opportunity.`;

    console.log('[tailor-resume-experience] Calling Gemini AI');

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
            }
          ],
          tools: [{
            functionDeclarations: [{
              name: 'tailor_experience',
              description: 'Return tailored work experience descriptions for each role',
              parameters: {
                type: 'object',
                properties: {
                  tailoredExperiences: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        roleId: { type: 'string', description: 'The ID of the employment entry' },
                        relevanceScore: { type: 'number', description: 'Score from 0-100 indicating relevance to job' },
                        variations: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              label: { type: 'string', description: 'Name of this variation (e.g., Technical Focus)' },
                              description: { type: 'string', description: 'The tailored job description' }
                            },
                            required: ['label', 'description']
                          }
                        },
                        actionVerbs: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'Suggested strong action verbs relevant to this role'
                        },
                      quantifiedAccomplishments: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Accomplishments with specific metrics and numbers'
                      },
                      industryTerms: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Industry-specific terminology from the job posting'
                      },
                      keyResponsibilities: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Responsibilities to emphasize based on job requirements'
                      }
                    },
                    required: ['roleId', 'relevanceScore', 'variations', 'actionVerbs', 'quantifiedAccomplishments', 'industryTerms', 'keyResponsibilities']
                  }
                },
                overallRecommendations: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'General recommendations for tailoring the entire experience section'
                }
              },
              required: ['tailoredExperiences', 'overallRecommendations']
            }
          }]
        }],
        toolConfig: {
          functionCallingConfig: { mode: 'ANY' }
        }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[tailor-resume-experience] AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to generate tailored experience' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('[tailor-resume-experience] AI response received');

    const functionCall = aiData.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    if (!functionCall?.args) {
      console.error('[tailor-resume-experience] No function call in response');
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = functionCall.args;
    console.log('[tailor-resume-experience] Successfully parsed AI response');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[tailor-resume-experience] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
