import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, interviewFormat = 'mixed', sessionName, questionCount = 8 } = await req.json();
    console.log('Generating mock interview session for job:', jobId);

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

    // Generate mock interview questions using Gemini AI
    const systemPrompt = `You are an expert interview scenario designer. Generate a realistic, comprehensive mock interview session. Return your response as a valid JSON object with the following structure:
{
  "questions": [
    {
      "order": 1,
      "question_text": "The interview question",
      "question_type": "behavioral|technical|situational|case_study",
      "difficulty": "entry|intermediate|senior",
      "context": "Additional context or scenario details",
      "follow_up_prompts": ["Follow-up question 1", "Follow-up question 2"],
      "evaluation_criteria": ["Criterion 1", "Criterion 2"],
      "time_recommendation_seconds": 120
    }
  ],
  "session_guidance": {
    "introduction": "How the interviewer would introduce the session",
    "pacing_notes": "Guidance on pacing and flow",
    "confidence_tips": ["Tip 1", "Tip 2"]
  }
}`;

    const formatDescriptions = {
      behavioral: 'Focus on behavioral questions using the STAR method',
      technical: 'Focus on technical skills, problem-solving, and domain knowledge',
      case_study: 'Focus on analytical thinking and problem-solving through case scenarios',
      mixed: 'Balanced mix of behavioral, technical, and situational questions'
    };

    const userPrompt = `Generate a comprehensive mock interview session:

Job Title: ${job.job_title}
Company: ${job.company_name}
Industry: ${job.industry || 'Not specified'}
Interview Format: ${interviewFormat}
Format Description: ${formatDescriptions[interviewFormat as keyof typeof formatDescriptions]}
Number of Questions: ${questionCount}

Generate exactly ${questionCount} interview questions that:
1. Progress from easier warm-up questions to more challenging scenarios
2. Include a realistic mix appropriate for the interview format
3. Have clear evaluation criteria
4. Include relevant follow-up prompts
5. Consider the seniority level appropriate for the role
6. Reflect common interview patterns for this industry
7. Include time recommendations for each response

Also provide:
- A professional introduction the interviewer would use
- Pacing and flow guidance
- Confidence-building tips for the candidate`;

    // Retry logic with exponential backoff for AI API calls
    let aiResponse;
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`AI API call attempt ${attempt}/${maxRetries}`);
        
        aiResponse = await fetch(
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
              tools: [{
                functionDeclarations: [{
                  name: "generate_mock_interview",
                  description: "Generate comprehensive mock interview session",
                  parameters: {
                    type: "object",
                    properties: {
                      questions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            order: { type: "number" },
                            question_text: { type: "string" },
                            question_type: { 
                              type: "string",
                              enum: ["behavioral", "technical", "situational", "case_study"]
                            },
                            difficulty: {
                              type: "string",
                              enum: ["entry", "intermediate", "senior"]
                            },
                            context: { type: "string" },
                            follow_up_prompts: {
                              type: "array",
                              items: { type: "string" }
                            },
                            evaluation_criteria: {
                              type: "array",
                              items: { type: "string" }
                            },
                            time_recommendation_seconds: { type: "number" }
                          },
                          required: ["order", "question_text", "question_type", "difficulty"]
                        }
                      },
                      session_guidance: {
                        type: "object",
                        properties: {
                          introduction: { type: "string" },
                          pacing_notes: { type: "string" },
                          confidence_tips: {
                            type: "array",
                            items: { type: "string" }
                          }
                        }
                      }
                    },
                    required: ["questions"]
                  }
                }]
              }],
              toolConfig: {
                functionCallingConfig: { mode: 'ANY' }
              }
            }),
          }
        );

        if (aiResponse.ok) {
          console.log('AI API call successful');
          break; // Success, exit retry loop
        }

        // Handle specific error codes
        if (aiResponse.status === 429) {
          console.error('Rate limit exceeded, will retry after delay');
          lastError = new Error('Rate limit exceeded. Please try again in a few moments.');
        } else if (aiResponse.status === 503 || aiResponse.status === 502) {
          console.error(`Service unavailable (${aiResponse.status}), will retry`);
          lastError = new Error(`AI service temporarily unavailable (${aiResponse.status}). Retrying...`);
        } else {
          const errorText = await aiResponse.text();
          console.error('AI API error:', aiResponse.status, errorText);
          throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`Waiting ${delayMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (fetchError) {
        console.error('Fetch error on attempt', attempt, fetchError);
        lastError = fetchError;
        
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000;
          console.log(`Network error, waiting ${delayMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    if (!aiResponse || !aiResponse.ok) {
      console.error('All retry attempts failed');
      throw lastError || new Error('Failed to generate mock interview after multiple attempts');
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    const functionCall = aiData.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    const mockData = functionCall?.args || {};

    // Store mock interview session in database
    const { data: session, error: insertError } = await supabase
      .from('mock_interview_sessions')
      .insert({
        user_id: job.user_id,
        job_id: jobId,
        session_name: sessionName || `Mock Interview - ${job.job_title}`,
        interview_format: interviewFormat,
        questions: mockData.questions || [],
        status: 'in_progress'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    console.log('Mock interview session generated and stored successfully');

    return new Response(JSON.stringify({ 
      session,
      sessionGuidance: mockData.session_guidance || {}
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-mock-interview:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});