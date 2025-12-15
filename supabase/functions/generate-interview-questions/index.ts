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
    const { jobId, interviewId, difficultyLevel = 'intermediate' } = await req.json();
    console.log('Generating interview questions for job:', jobId);

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

    // Generate interview questions using Gemini AI
    const systemPrompt = `You are an expert interview coach. Generate relevant interview questions for job preparation. Return your response as a valid JSON array of question objects with the following structure:
[
  {
    "question_text": "The interview question",
    "question_category": "behavioral|technical|situational",
    "difficulty_level": "entry|intermediate|senior",
    "star_guidance": {
      "situation_guidance": "Tips for describing the situation",
      "task_guidance": "Tips for describing the task",
      "action_guidance": "Tips for describing the action",
      "result_guidance": "Tips for describing the result"
    }
  }
]`;

    const userPrompt = `Generate 8-12 diverse interview questions for:
Job Title: ${job.job_title}
Industry: ${job.industry || 'Not specified'}
Difficulty Level: ${difficultyLevel}
Job Description: ${job.job_description || 'Not available'}
Company: ${job.company_name}

Include:
- 3-4 behavioral questions with STAR method guidance
- 3-4 technical/skills questions relevant to the role
- 2-3 situational questions about challenges and problem-solving
- Questions should be relevant to ${difficultyLevel} level positions

For each behavioral question, provide specific guidance for the STAR method (Situation, Task, Action, Result).`;

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
          tools: [{
            functionDeclarations: [{
              name: "generate_questions",
              description: "Generate interview questions with categories and STAR guidance",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_text: { type: "string" },
                        question_category: { 
                          type: "string",
                          enum: ["behavioral", "technical", "situational"]
                        },
                        difficulty_level: {
                          type: "string",
                          enum: ["entry", "intermediate", "senior"]
                        },
                        star_guidance: {
                          type: "object",
                          properties: {
                            situation_guidance: { type: "string" },
                            task_guidance: { type: "string" },
                            action_guidance: { type: "string" },
                            result_guidance: { type: "string" }
                          }
                        }
                      },
                      required: ["question_text", "question_category", "difficulty_level"]
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

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    const functionCall = aiData.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    const questionsData = functionCall?.args || { questions: [] };

    // Store questions in database
    const questionInserts = questionsData.questions.map((q: any) => ({
      user_id: job.user_id,
      job_id: jobId,
      interview_id: interviewId || null,
      question_text: q.question_text,
      question_category: q.question_category,
      difficulty_level: q.difficulty_level,
      star_method: q.question_category === 'behavioral' ? {
        situation: '',
        task: '',
        action: '',
        result: '',
        guidance: q.star_guidance || {}
      } : {}
    }));

    const { data: questions, error: insertError } = await supabase
      .from('interview_question_responses')
      .insert(questionInserts)
      .select();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    console.log('Interview questions generated and stored successfully');

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-interview-questions:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});