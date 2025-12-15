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

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const { data: skills } = await supabase
      .from("skills")
      .select("*")
      .eq("user_id", user.id);

    const { data: experience } = await supabase
      .from("employment_history")
      .select("*")
      .eq("user_id", user.id)
      .order("start_date", { ascending: false });

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const prompt = `As a LinkedIn profile optimization expert, analyze this professional's profile and provide specific, actionable suggestions to improve their LinkedIn presence.

Profile Information:
- Name: ${profile?.first_name} ${profile?.last_name}
- Current Headline: ${profile?.linkedin_headline || "Not set"}
- Target Industries: ${profile?.target_industries?.join(", ") || "Not specified"}
- Skills: ${skills?.map(s => s.skill_name).join(", ") || "None listed"}
- Recent Experience: ${experience?.[0] ? `${experience[0].job_title} at ${experience[0].company_name}` : "Not provided"}

Provide comprehensive optimization suggestions covering:
1. Profile headline optimization (compelling, keyword-rich)
2. About section structure and content suggestions
3. Experience descriptions enhancement tips
4. Skills endorsement strategy
5. Content sharing recommendations for visibility
6. Networking and connection-building strategies
7. Profile completeness improvements
8. Personal branding tips`;

    const systemInstruction = "You are a LinkedIn optimization expert who provides specific, actionable advice for improving professional profiles.";

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
              name: "provide_linkedin_optimization",
              description: "Provide LinkedIn profile optimization suggestions",
              parameters: {
                type: "object",
                properties: {
                  headline_suggestions: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 optimized headline options",
                  },
                  about_section_tips: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key tips for writing an effective about section",
                  },
                  experience_enhancement: {
                    type: "array",
                    items: { type: "string" },
                    description: "Tips for improving experience descriptions",
                  },
                  skills_strategy: {
                    type: "array",
                    items: { type: "string" },
                    description: "Skills endorsement and showcasing strategies",
                  },
                  content_sharing: {
                    type: "array",
                    items: { type: "string" },
                    description: "Content posting strategies for visibility",
                  },
                  networking_tips: {
                    type: "array",
                    items: { type: "string" },
                    description: "Connection-building and networking strategies",
                  },
                  profile_completeness: {
                    type: "array",
                    items: { type: "string" },
                    description: "Missing or incomplete profile sections to address",
                  },
                  branding_advice: {
                    type: "array",
                    items: { type: "string" },
                    description: "Personal branding recommendations",
                  },
                },
                required: [
                  "headline_suggestions",
                  "about_section_tips",
                  "experience_enhancement",
                  "skills_strategy",
                  "content_sharing",
                  "networking_tips",
                  "profile_completeness",
                  "branding_advice",
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
      throw new Error("Failed to generate optimization suggestions");
    }

    const aiData = await aiResponse.json();
    const functionCall = aiData.candidates?.[0]?.content?.parts?.[0]?.functionCall;

    if (!functionCall) {
      throw new Error("No function call in AI response");
    }

    const suggestions = functionCall.args;

    return new Response(JSON.stringify(suggestions), {
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