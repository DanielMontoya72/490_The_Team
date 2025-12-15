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
    const { questionId, responseText, questionText, questionCategory } = await req.json();
    console.log('Coaching response for question:', questionId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get previous feedback count for this question
    const { data: previousFeedback } = await supabase
      .from('response_coaching_feedback')
      .select('practice_number')
      .eq('question_response_id', questionId)
      .order('practice_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const practiceNumber = previousFeedback ? previousFeedback.practice_number + 1 : 1;

    // Generate coaching feedback using Gemini AI
    const systemPrompt = `You are an expert interview coach specializing in helping candidates improve their interview responses. Provide constructive, actionable feedback. Return your response as a valid JSON object with the following structure:
{
  "feedback": {
    "content": "Feedback on the content quality and relevance",
    "structure": "Feedback on organization and flow",
    "clarity": "Feedback on clarity and communication",
    "overall": "Overall assessment and key strengths"
  },
  "scores": {
    "relevance": 85,
    "specificity": 75,
    "impact": 80,
    "overall": 80
  },
  "improvement_suggestions": [
    "Specific suggestion 1",
    "Specific suggestion 2"
  ],
  "alternative_approaches": [
    {
      "approach": "Alternative way to frame the response",
      "example": "Brief example of this approach"
    }
  ],
  "star_adherence": {
    "situation_score": 80,
    "task_score": 75,
    "action_score": 85,
    "result_score": 70,
    "analysis": "Analysis of STAR method usage"
  },
  "weak_patterns": [
    {
      "pattern": "Weak language pattern identified",
      "replacement": "Stronger alternative"
    }
  ],
  "timing": {
    "word_count": 250,
    "estimated_seconds": 90,
    "recommendation": "Optimal length feedback"
  }
}`;

    const userPrompt = `Analyze this interview response and provide detailed coaching feedback:

Question Type: ${questionCategory}
Question: ${questionText}

Candidate's Response:
${responseText}

Provide comprehensive feedback focusing on:
1. Content quality and relevance to the question
2. Structure and organization
3. Clarity and communication effectiveness
4. STAR method adherence (if behavioral question)
5. Specific improvement suggestions
6. Alternative approaches to strengthen the response
7. Weak language patterns and stronger alternatives
8. Response length and timing guidance

Score each aspect from 0-100 and provide actionable recommendations.`;

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
              name: "provide_coaching",
              description: "Provide comprehensive interview coaching feedback",
              parameters: {
                type: "object",
                properties: {
                  feedback: {
                    type: "object",
                    properties: {
                      content: { type: "string" },
                      structure: { type: "string" },
                      clarity: { type: "string" },
                      overall: { type: "string" }
                    }
                  },
                  scores: {
                    type: "object",
                    properties: {
                      relevance: { type: "number" },
                      specificity: { type: "number" },
                      impact: { type: "number" },
                      overall: { type: "number" }
                    }
                  },
                  improvement_suggestions: {
                    type: "array",
                    items: { type: "string" }
                  },
                  alternative_approaches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        approach: { type: "string" },
                        example: { type: "string" }
                      }
                    }
                  },
                  star_adherence: {
                    type: "object",
                    properties: {
                      situation_score: { type: "number" },
                      task_score: { type: "number" },
                      action_score: { type: "number" },
                      result_score: { type: "number" },
                      analysis: { type: "string" }
                    }
                  },
                  weak_patterns: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        pattern: { type: "string" },
                        replacement: { type: "string" }
                      }
                    }
                  },
                  timing: {
                    type: "object",
                    properties: {
                      word_count: { type: "number" },
                      estimated_seconds: { type: "number" },
                      recommendation: { type: "string" }
                    }
                  }
                }
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
    const coachingData = functionCall?.args || {};

    // Get auth header to get user_id
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Store coaching feedback in database
    const { data: feedback, error: insertError } = await supabase
      .from('response_coaching_feedback')
      .insert({
        user_id: user.id,
        question_response_id: questionId,
        response_text: responseText,
        feedback: coachingData.feedback || {},
        scores: coachingData.scores || {},
        improvement_suggestions: coachingData.improvement_suggestions || [],
        alternative_approaches: coachingData.alternative_approaches || [],
        star_adherence: coachingData.star_adherence || {},
        practice_number: practiceNumber
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    console.log('Coaching feedback generated and stored successfully');

    return new Response(JSON.stringify({ 
      feedback,
      weakPatterns: coachingData.weak_patterns || [],
      timing: coachingData.timing || {}
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in coach-interview-response:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});