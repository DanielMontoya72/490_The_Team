import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interviewId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: interview } = await supabase
      .from("informational_interviews")
      .select("*")
      .eq("id", interviewId)
      .eq("user_id", user.id)
      .single();

    if (!interview) {
      throw new Error("Interview not found");
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const prompt = `Generate a comprehensive preparation framework for an informational interview.

Interview Details:
- Candidate: ${interview.candidate_name}
- Title: ${interview.candidate_title || "Not specified"}
- Company: ${interview.candidate_company || "Not specified"}
- Notes: ${interview.notes || "General career guidance"}

Provide a detailed preparation framework including:
1. Research areas to focus on (company, industry, person)
2. Thoughtful questions to ask (5-7 questions covering career path, industry insights, advice)
3. Topics to discuss and explore
4. How to structure the conversation (opening, main discussion, closing)
5. Follow-up best practices
6. Things to avoid or be careful about`;

    const systemInstruction = "You are an expert career coach who helps people prepare for informational interviews.";

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemInstruction}\n\n${prompt}` }]
            }
          ],
          tools: [{
            functionDeclarations: [{
              name: "generate_prep_framework",
              description: "Generate informational interview preparation framework",
              parameters: {
                type: "object",
                properties: {
                  research_areas: {
                    type: "array",
                    items: { type: "string" },
                    description: "Areas to research before the interview",
                  },
                  suggested_questions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Thoughtful questions to ask during the interview",
                  },
                  discussion_topics: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key topics to explore",
                  },
                  conversation_structure: {
                    type: "object",
                    properties: {
                      opening: { type: "string" },
                      main_discussion: { type: "string" },
                      closing: { type: "string" },
                    },
                    description: "How to structure the conversation flow",
                  },
                  follow_up_tips: {
                    type: "array",
                    items: { type: "string" },
                    description: "Best practices for following up",
                  },
                  things_to_avoid: {
                    type: "array",
                    items: { type: "string" },
                    description: "Common mistakes to avoid",
                  },
                },
                required: [
                  "research_areas",
                  "suggested_questions",
                  "discussion_topics",
                  "conversation_structure",
                  "follow_up_tips",
                  "things_to_avoid",
                ],
              },
            }]
          }],
          toolConfig: {
            functionCallingConfig: { mode: "ANY" }
          }
        }),
      }
    );

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      console.error("AI API error:", error);
      throw new Error("Failed to generate preparation framework");
    }

    const aiData = await aiResponse.json();
    const functionCall = aiData.candidates?.[0]?.content?.parts?.[0]?.functionCall;

    if (!functionCall) {
      throw new Error("No function call in AI response");
    }

    const framework = functionCall.args;

    // Store the preparation notes
    await supabase
      .from("informational_interviews")
      .update({ preparation_notes: JSON.stringify(framework) })
      .eq("id", interviewId);

    return new Response(JSON.stringify(framework), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});