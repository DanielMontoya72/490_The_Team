import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { metrics } = await req.json();
    console.log('Received metrics:', metrics);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Prepare the prompt with user metrics
    const prompt = `You are a career coach analyzing job search performance data. Generate 3-5 actionable, personalized recommendations based on these metrics:

Applications: ${metrics.totalApplications || 0}
Response Rate: ${metrics.responseRate || 0}%
Interview Rate: ${metrics.interviewRate || 0}%
Offer Rate: ${metrics.offerRate || 0}%
Avg Response Time: ${metrics.avgResponseDays || 0} days
Avg Interview Scheduling: ${metrics.avgInterviewDays || 0} days
Interview Success Predictions: ${metrics.predictionCount || 0}
Mock Interview Sessions: ${metrics.mockSessionCount || 0}
Prepared Question Responses: ${metrics.questionResponseCount || 0}

Analyze these metrics and provide specific, actionable recommendations. Each recommendation should:
1. Address a specific weakness or opportunity
2. Be concrete and actionable
3. Include a priority level (high/medium/low)
4. Suggest specific next steps

Return your response as a JSON array with this structure:
[
  {
    "priority": "high" | "medium" | "low",
    "category": "Applications" | "Networking" | "Interview Prep" | "Materials" | "Follow-up",
    "title": "Brief, compelling title",
    "description": "Detailed explanation with specific advice and context",
    "action": "Specific action user should take"
  }
]

Focus on the most impactful areas for improvement based on the metrics.`;

    const systemInstruction = "You are an expert career coach specializing in job search optimization. Provide data-driven, actionable recommendations.";

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
          generationConfig: {
            responseMimeType: "application/json"
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", data);
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    let recommendations;
    
    try {
      // Parse the JSON response from the AI
      const parsed = JSON.parse(content);
      recommendations = Array.isArray(parsed) ? parsed : parsed.recommendations || [];
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      // Fallback to basic recommendations if parsing fails
      recommendations = [
        {
          priority: "medium",
          category: "General",
          title: "Continue Your Job Search Efforts",
          description: "Keep applying consistently and track your progress.",
          action: "Review your application materials"
        }
      ];
    }

    return new Response(
      JSON.stringify({ recommendations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-job-search-recommendations:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate recommendations";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
