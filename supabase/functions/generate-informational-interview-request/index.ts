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
    const { candidateName, candidateTitle, candidateCompany, reason, topics } = await req.json();

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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const prompt = `Generate a professional informational interview request email.

From: ${profile?.first_name} ${profile?.last_name}
To: ${candidateName}, ${candidateTitle} at ${candidateCompany}
Reason for reaching out: ${reason}
Topics of interest: ${topics?.join(", ") || "Career insights and industry trends"}

The email should:
- Be respectful and professional
- Clearly state the purpose (informational interview)
- Explain why you're reaching out to them specifically
- Suggest a brief time commitment (15-20 minutes)
- Offer flexibility in format (phone, video, coffee)
- Express genuine interest in learning from their experience
- Be concise but warm
- Include a clear call to action`;

    const systemInstruction = "You are an expert at writing professional, warm, and effective informational interview requests.";

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
              name: "generate_interview_request",
              description: "Generate an informational interview request",
              parameters: {
                type: "object",
                properties: {
                  subject: {
                    type: "string",
                    description: "Email subject line",
                  },
                  message: {
                    type: "string",
                    description: "The complete email body",
                  },
                  tips: {
                    type: "array",
                    items: { type: "string" },
                    description: "Tips for sending and following up",
                  },
                },
                required: ["subject", "message", "tips"],
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
      throw new Error("Failed to generate request template");
    }

    const aiData = await aiResponse.json();
    const functionCall = aiData.candidates?.[0]?.content?.parts?.[0]?.functionCall;

    if (!functionCall) {
      throw new Error("No function call in AI response");
    }

    const template = functionCall.args;

    return new Response(JSON.stringify(template), {
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