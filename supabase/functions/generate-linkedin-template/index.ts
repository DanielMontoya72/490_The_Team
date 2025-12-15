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
    const { templateType, recipientName, recipientTitle, recipientCompany, context } = await req.json();

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

    let systemPrompt = "";
    let userPrompt = "";

    if (templateType === "connection_request") {
      systemPrompt = "You are a professional networking expert who writes compelling LinkedIn connection request messages.";
      userPrompt = `Generate a personalized LinkedIn connection request message.

Sender: ${profile?.first_name} ${profile?.last_name}
Recipient: ${recipientName}${recipientTitle ? `, ${recipientTitle}` : ""}${recipientCompany ? ` at ${recipientCompany}` : ""}
Context: ${context || "General networking"}

The message should be:
- Under 300 characters (LinkedIn's limit)
- Professional yet friendly
- Specific to the recipient
- Clear about the connection reason
- Include a call to action`;
    } else if (templateType === "follow_up") {
      systemPrompt = "You are a professional networking expert who writes effective LinkedIn follow-up messages.";
      userPrompt = `Generate a professional LinkedIn follow-up message.

Sender: ${profile?.first_name} ${profile?.last_name}
Recipient: ${recipientName}${recipientTitle ? `, ${recipientTitle}` : ""}${recipientCompany ? ` at ${recipientCompany}` : ""}
Context: ${context || "Following up on previous connection"}

The message should:
- Reference previous interaction
- Add value to the conversation
- Be concise and respectful of their time
- Include a specific next step or question`;
    } else if (templateType === "informational_interview") {
      systemPrompt = "You are a professional networking expert who writes compelling informational interview requests.";
      userPrompt = `Generate a LinkedIn message requesting an informational interview.

Sender: ${profile?.first_name} ${profile?.last_name}
Recipient: ${recipientName}${recipientTitle ? `, ${recipientTitle}` : ""}${recipientCompany ? ` at ${recipientCompany}` : ""}
Context: ${context || "Seeking career insights"}

The message should:
- Be respectful of their time (suggest 15-20 minutes)
- Explain why you're reaching out to them specifically
- Be clear about what you hope to learn
- Offer flexibility in scheduling
- Include appreciation for their consideration`;
    } else {
      systemPrompt = "You are a professional networking expert who writes effective LinkedIn messages.";
      userPrompt = `Generate a professional LinkedIn message.

Sender: ${profile?.first_name} ${profile?.last_name}
Recipient: ${recipientName}${recipientTitle ? `, ${recipientTitle}` : ""}${recipientCompany ? ` at ${recipientCompany}` : ""}
Purpose: ${templateType}
Context: ${context || "Professional networking"}

The message should be professional, personalized, and achieve the stated purpose.`;
    }

    const aiResponse = await fetch(
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
              name: "generate_linkedin_message",
              description: "Generate a LinkedIn message template",
              parameters: {
                type: "object",
                properties: {
                  subject: {
                    type: "string",
                    description: "Subject line or opening hook",
                  },
                  message: {
                    type: "string",
                    description: "The complete message body",
                  },
                  tips: {
                    type: "array",
                    items: { type: "string" },
                    description: "Tips for personalizing or sending this message",
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
      throw new Error("Failed to generate template");
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