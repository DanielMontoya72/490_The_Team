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
    const { difficulty, category, language, scenarioType, industry } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get("Authorization")?.replace("Bearer ", "") || ""
    );

    if (!user) {
      throw new Error("Unauthorized");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (category === "system-design") {
      systemPrompt = `You are an expert system design interviewer. Generate realistic system design scenarios.`;
      userPrompt = `Generate a ${difficulty} level system design scenario for: ${scenarioType}.
      
      Include:
      - Clear problem statement
      - Functional and non-functional requirements
      - Scale requirements (users, data volume, traffic)
      - Constraints (budget, timeline, technology)
      - Key considerations and hints
      
      Format as JSON with: title, description, functionalRequirements[], nonFunctionalRequirements[], constraints[], hints[], category.`;
    } else if (category === "case-study") {
      systemPrompt = `You are an expert business case interviewer. Generate realistic case studies.`;
      userPrompt = `Generate a ${difficulty} level case study for ${industry} industry.
      
      Include:
      - Business situation and context
      - Key challenge or problem
      - Relevant data and metrics
      - Questions to address
      - Analytical hints
      
      Format as JSON with: title, industry, situation, challenge, task, data{}, questions[], hints[], duration (in minutes).`;
    } else {
      // Coding challenge
      systemPrompt = `You are an expert technical interviewer. Generate realistic coding challenges.`;
      userPrompt = `Generate a ${difficulty} level coding challenge in ${language || "JavaScript"}.
      
      Include:
      - Clear problem description
      - Input/output examples
      - Test cases (at least 5, including edge cases)
      - Starter code template
      - Complete solution
      - Hints for solving
      - Time complexity expectations
      
      Format as JSON with: title, description, difficulty, category, timeLimit (minutes), testCases[], starterCode, solution, hints[].`;
    }

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
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

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API Error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const challenge = JSON.parse(aiContent);

    // Store the challenge
    const { data: savedChallenge, error: saveError } = await supabase
      .from("technical_challenges")
      .insert({
        user_id: user.id,
        title: challenge.title,
        description: challenge.description,
        difficulty: difficulty,
        category: category,
        challenge_data: challenge,
        status: "active",
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving challenge:", saveError);
    }

    return new Response(
      JSON.stringify({ ...challenge, id: savedChallenge?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
