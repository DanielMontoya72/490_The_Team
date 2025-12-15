import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisInput {
  totalApplications: number;
  successfulApplications: number;
  interviewedApplications: number;
  rejectedApplications: number;
  industryData: Array<{ industry: string; total: number; successRate: number; interviewRate: number }>;
  companySizeData: Array<{ size: string; total: number; successRate: number; interviewRate: number }>;
  roleTypeData: Array<{ roleType: string; total: number; successRate: number; interviewRate: number }>;
  sourceData: Array<{ source: string; total: number; successRate: number; interviewRate: number }>;
  patterns: {
    successful: { avgDescriptionLength: number; hasNotes: number; hasSalary: number; remoteRate: number };
    rejected: { avgDescriptionLength: number; hasNotes: number; hasSalary: number; remoteRate: number };
  };
  timingData: {
    dayData: Array<{ day: string; total: number; successRate: number; interviewRate: number }>;
    hourData: Array<{ hour: string; total: number; successRate: number; interviewRate: number }>;
  };
  customizationImpact: {
    customizedSuccessRate: number;
    nonCustomizedSuccessRate: number;
    jobsWithCustomResume: number;
    jobsWithCustomCoverLetter: number;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input: AnalysisInput = await req.json();

    console.log("Analyzing application success data:", {
      totalApplications: input.totalApplications,
      industriesCount: input.industryData?.length,
    });

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const overallSuccessRate = input.totalApplications > 0 
      ? (input.successfulApplications / input.totalApplications) * 100 
      : 0;
    const overallInterviewRate = input.totalApplications > 0 
      ? (input.interviewedApplications / input.totalApplications) * 100 
      : 0;

    const prompt = `Analyze this job application data and provide actionable recommendations.

DATA SUMMARY:
- Total Applications: ${input.totalApplications}
- Successful (Offers): ${input.successfulApplications} (${overallSuccessRate.toFixed(1)}%)
- Interviews: ${input.interviewedApplications} (${overallInterviewRate.toFixed(1)}%)
- Rejected: ${input.rejectedApplications}

INDUSTRY PERFORMANCE:
${input.industryData?.slice(0, 5).map(i => `- ${i.industry}: ${i.successRate.toFixed(1)}% success, ${i.interviewRate.toFixed(1)}% interviews (${i.total} apps)`).join('\n') || 'No industry data'}

COMPANY SIZE PERFORMANCE:
${input.companySizeData?.map(c => `- ${c.size}: ${c.successRate.toFixed(1)}% success, ${c.interviewRate.toFixed(1)}% interviews`).join('\n') || 'No company size data'}

APPLICATION SOURCE PERFORMANCE:
${input.sourceData?.map(s => `- ${s.source}: ${s.successRate.toFixed(1)}% success, ${s.interviewRate.toFixed(1)}% interviews`).join('\n') || 'No source data'}

PATTERNS IN SUCCESSFUL VS REJECTED:
Successful apps: avg ${input.patterns?.successful?.avgDescriptionLength || 0} char descriptions, ${input.patterns?.successful?.remoteRate?.toFixed(0) || 0}% remote
Rejected apps: avg ${input.patterns?.rejected?.avgDescriptionLength || 0} char descriptions, ${input.patterns?.rejected?.remoteRate?.toFixed(0) || 0}% remote

MATERIALS CUSTOMIZATION:
- With custom materials: ${input.customizationImpact?.customizedSuccessRate?.toFixed(1) || 0}% success
- Without custom materials: ${input.customizationImpact?.nonCustomizedSuccessRate?.toFixed(1) || 0}% success

TIMING:
Best performing days: ${input.timingData?.dayData?.sort((a, b) => b.interviewRate - a.interviewRate).slice(0, 2).map(d => d.day).join(', ') || 'N/A'}
Best performing times: ${input.timingData?.hourData?.sort((a, b) => b.interviewRate - a.interviewRate).slice(0, 2).map(h => h.hour).join(', ') || 'N/A'}

Generate a JSON response with:
1. "keyFindings": Array of 3-5 key observations from the data
2. "recommendations": Array of objects with {title, description, priority: "high"|"medium"|"low"}
3. "focusAreas": Array of 3-5 areas to focus on

Be specific and actionable. Reference the actual data.`;

    const systemPrompt = "You are a career analytics expert. Analyze job application data and provide actionable, data-driven recommendations. Always return valid JSON.";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error("Failed to generate recommendations");
    }

    const aiData = await response.json();
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }

    const recommendations = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(recommendations), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error analyzing application success:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
