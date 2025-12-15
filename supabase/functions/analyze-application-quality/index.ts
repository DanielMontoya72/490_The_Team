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
    const { jobDescription, jobTitle, companyName, resumeContent, coverLetterContent, linkedInProfile, userSkills } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert application quality analyzer. Analyze job application materials against job requirements and provide detailed quality scoring.

Evaluate:
1. Keyword and skill alignment between materials and job description
2. Experience relevance and match
3. Formatting consistency across materials
4. Professional tone and clarity
5. Missing critical elements

Provide scores from 0-100 for each category and overall.`;

    const userPrompt = `Analyze these application materials for the following job:

JOB TITLE: ${jobTitle || 'Not specified'}
COMPANY: ${companyName || 'Not specified'}
JOB DESCRIPTION:
${jobDescription || 'Not provided'}

RESUME CONTENT:
${resumeContent || 'Not provided'}

COVER LETTER CONTENT:
${coverLetterContent || 'Not provided'}

LINKEDIN PROFILE:
${linkedInProfile || 'Not provided'}

USER SKILLS:
${userSkills?.join(', ') || 'Not provided'}

Provide a comprehensive quality analysis in JSON format:
{
  "overall_score": <0-100>,
  "resume_score": <0-100 or null if not provided>,
  "cover_letter_score": <0-100 or null if not provided>,
  "linkedin_score": <0-100 or null if not provided>,
  "keyword_match_score": <0-100>,
  "formatting_score": <0-100>,
  "missing_keywords": ["keyword1", "keyword2"],
  "missing_skills": ["skill1", "skill2"],
  "missing_experiences": ["experience1", "experience2"],
  "formatting_issues": [
    {"type": "typo", "location": "resume", "description": "...", "severity": "low|medium|high"},
    {"type": "inconsistency", "location": "cover_letter", "description": "...", "severity": "low|medium|high"}
  ],
  "improvement_suggestions": [
    {"priority": 1, "category": "keywords", "title": "...", "description": "...", "impact": "high|medium|low"},
    {"priority": 2, "category": "experience", "title": "...", "description": "...", "impact": "high|medium|low"}
  ],
  "strengths": ["strength1", "strength2"],
  "alignment_details": {
    "skills_matched": ["skill1", "skill2"],
    "experiences_matched": ["exp1", "exp2"],
    "keywords_matched": ["keyword1", "keyword2"]
  }
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
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
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const aiResponse = data.candidates[0].content.parts[0].text;
    
    let analysis;
    try {
      analysis = JSON.parse(aiResponse);
    } catch (e) {
      console.error("Failed to parse AI response:", aiResponse);
      analysis = {
        overall_score: 50,
        resume_score: null,
        cover_letter_score: null,
        linkedin_score: null,
        keyword_match_score: 50,
        formatting_score: 50,
        missing_keywords: [],
        missing_skills: [],
        missing_experiences: [],
        formatting_issues: [],
        improvement_suggestions: [
          { priority: 1, category: "general", title: "Analysis Error", description: "Could not fully analyze materials. Please try again.", impact: "high" }
        ],
        strengths: [],
        alignment_details: { skills_matched: [], experiences_matched: [], keywords_matched: [] }
      };
    }

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Quality analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
