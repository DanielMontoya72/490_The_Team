import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  referenceName: string;
  companyName: string;
  roleTitle: string;
  requestType: string;
  referenceSkills: string[];
  existingTalkingPoints: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { referenceName, companyName, roleTitle, requestType, referenceSkills, existingTalkingPoints }: RequestBody = await req.json();

    console.log("Generating reference preparation for:", { referenceName, companyName, roleTitle });

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const prompt = `Generate reference preparation guidance for a job applicant to share with their reference.

Reference: ${referenceName}
Company: ${companyName || "Not specified"}
Position: ${roleTitle || "Not specified"}
Reference Type: ${requestType}
Skills reference can speak to: ${referenceSkills.length > 0 ? referenceSkills.join(", ") : "Not specified"}
Existing talking points: ${existingTalkingPoints.length > 0 ? existingTalkingPoints.join("; ") : "None"}

Generate:
1. Role context: A brief description of what this role typically involves and what employers look for
2. Company context: General advice on what the company might value (if company specified)
3. Key talking points: 5-7 specific points the reference should emphasize based on the role and skills
4. Suggested questions: 4-5 questions the reference might be asked

Return as JSON with this structure:
{
  "roleContext": "string",
  "companyContext": "string (or empty if no company)",
  "keyPoints": ["point1", "point2", ...],
  "suggestedQuestions": ["question1", "question2", ...]
}`;

    const systemInstruction = "You are an expert career coach helping job seekers prepare their references. Always return valid JSON.";

    const response = await fetch(
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
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error("Failed to generate preparation");
    }

    const aiData = await response.json();
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }

    const preparationData = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(preparationData), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error generating reference preparation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
