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
    const { content, resumeName } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const systemPrompt = `You are a professional resume validator and editor. Analyze the resume content for:
1. Spelling and grammar errors
2. Professional tone issues (informal language, slang, etc.)
3. Improvement suggestions for clarity and impact

Provide specific, actionable feedback.`;

    const userPrompt = `Resume Title: ${resumeName}

Resume Content:
${content}

Please analyze this resume and provide:
1. Any spelling or grammar errors (be specific)
2. Any unprofessional tone or language issues
3. Suggestions for improving clarity, impact, and professionalism

Format your response as JSON with these fields:
{
  "spellErrors": ["list of specific spelling/grammar issues"],
  "toneIssues": ["list of professional tone concerns"],
  "suggestions": ["list of improvement suggestions"]
}`;

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
          generationConfig: {
            responseMimeType: "application/json"
          }
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error("Gemini API error");
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    let validation;
    try {
      validation = JSON.parse(aiResponse);
    } catch (e) {
      console.error("Failed to parse AI response:", aiResponse);
      validation = {
        spellErrors: [],
        toneIssues: [],
        suggestions: ["Could not parse validation results. Please try again."]
      };
    }

    return new Response(
      JSON.stringify(validation),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Validation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
