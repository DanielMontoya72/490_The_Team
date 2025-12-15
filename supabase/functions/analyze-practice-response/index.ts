import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, questionType, practiceResponse, bestResponse, timeSpentSeconds } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert interview coach analyzing practice responses to interview questions. 
Evaluate the response quality and provide constructive feedback.

Scoring criteria (0.0 to 1.0 scale):
- clarity: How clear and easy to understand is the response?
- structure: Does it follow STAR method (Situation, Task, Action, Result) for behavioral questions?
- relevance: Does it directly address the question?
- impact: Does it highlight achievements and quantifiable results?
- communication: Is the language professional and engaging?

Provide:
1. Individual scores for each criterion
2. Detailed feedback explaining strengths and areas for improvement
3. Specific suggestions for improvement`;

    const userPrompt = `Question Type: ${questionType}
Question: ${question}

Practice Response (${timeSpentSeconds} seconds):
${practiceResponse}

${bestResponse ? `User's Best Response (for reference):
${bestResponse}` : ''}

Analyze this practice response and provide structured feedback.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }
          ],
          tools: [{
            functionDeclarations: [{
              name: "provide_feedback",
              description: "Provide structured feedback on the practice response",
              parameters: {
                type: "object",
                properties: {
                  scores: {
                    type: "object",
                    properties: {
                      clarity: { type: "number" },
                      structure: { type: "number" },
                      relevance: { type: "number" },
                      impact: { type: "number" },
                      communication: { type: "number" },
                    },
                    required: ["clarity", "structure", "relevance", "impact", "communication"],
                  },
                  feedback: {
                    type: "string",
                    description: "Detailed feedback explaining strengths and areas for improvement",
                  },
                  improvements: {
                    type: "array",
                    items: { type: "string" },
                    description: "Specific actionable suggestions for improvement",
                  },
                  overallScore: {
                    type: "number",
                    description: "Overall score as average of all criteria",
                  },
                },
                required: ["scores", "feedback", "improvements", "overallScore"],
              },
            }]
          }],
          toolConfig: {
            functionCallingConfig: { mode: "ANY" }
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const functionCall = data.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    
    if (!functionCall?.args) {
      throw new Error("Invalid response from AI");
    }

    const feedbackData = functionCall.args;

    return new Response(JSON.stringify(feedbackData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
