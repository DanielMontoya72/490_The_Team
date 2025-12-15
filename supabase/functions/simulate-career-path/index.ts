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
    const { 
      startingRole, 
      startingSalary, 
      startingIndustry,
      targetRoles,
      simulationYears,
      customCriteria,
      jobOffers
    } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const systemPrompt = `You are a career simulation expert. Analyze career trajectories and provide detailed projections.
You must respond with a JSON object containing the following structure:
{
  "trajectories": [
    {
      "pathName": "string - descriptive name for this career path",
      "startingRole": "string",
      "milestones": [
        {
          "year": number,
          "role": "string",
          "salary": number,
          "title": "string",
          "keyAchievements": ["string"]
        }
      ],
      "totalEarnings": number,
      "growthRate": number (percentage),
      "riskLevel": "low" | "medium" | "high",
      "satisfactionScore": number (1-10)
    }
  ],
  "probabilityDistributions": {
    "bestCase": { "salary": number, "role": "string", "probability": number },
    "averageCase": { "salary": number, "role": "string", "probability": number },
    "worstCase": { "salary": number, "role": "string", "probability": number }
  },
  "decisionPoints": [
    {
      "year": number,
      "description": "string",
      "options": ["string"],
      "impact": "string"
    }
  ],
  "recommendations": {
    "optimalPath": "string - name of best trajectory",
    "reasoning": "string",
    "nextSteps": ["string"],
    "skillsToAcquire": ["string"],
    "risksToConsider": ["string"]
  },
  "lifetimeEarnings": {
    "conservative": number,
    "moderate": number,
    "optimistic": number
  },
  "customCriteriaAnalysis": {
    "criteriaName": { "score": number, "analysis": "string" }
  }
}`;

    const userPrompt = `Simulate career trajectories for the following scenario:

Current Position:
- Role: ${startingRole || 'Not specified'}
- Salary: $${startingSalary || 'Not specified'}
- Industry: ${startingIndustry || 'Not specified'}

${targetRoles?.length > 0 ? `Target Roles to Consider: ${JSON.stringify(targetRoles)}` : ''}

${jobOffers?.length > 0 ? `Active Job Offers to Evaluate:
${jobOffers.map((o: any) => `- ${o.position_title} at ${o.company_name}: $${o.base_salary} base, $${o.total_compensation} total comp`).join('\n')}` : ''}

Simulation Period: ${simulationYears || 5} years

${customCriteria && Object.keys(customCriteria).length > 0 ? `Custom Success Criteria (weight 1-10):
${Object.entries(customCriteria).map(([k, v]) => `- ${k}: ${v}`).join('\n')}` : ''}

Please provide:
1. Multiple career trajectory simulations (at least 3 paths if multiple options exist)
2. Year-by-year projections with salary and title progression
3. Probability distributions for outcomes (best/worst/average case)
4. Key decision points where paths diverge significantly
5. Lifetime earnings calculations for each path
6. Optimal path recommendation based on the criteria provided
7. Industry trends and economic factors consideration

Factor in:
- Typical promotion timelines in the industry
- Salary growth rates for the industry and role
- Company growth stage impact on career progression
- Economic conditions and market demand
- Skills gap analysis for career advancement`;

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
          generationConfig: { temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse simulation results");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in simulate-career-path:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});