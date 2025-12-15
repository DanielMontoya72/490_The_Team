import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobDescription, userSkills } = await req.json();

    if (!jobDescription) {
      throw new Error('Job description is required');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert resume optimization specialist and ATS (Applicant Tracking System) analyst. Your role is to analyze job postings and optimize skills sections for maximum impact.

You must analyze the job description and provide detailed skills optimization recommendations in the following JSON format:

{
  "matchingScore": <number 0-100>,
  "skillsToEmphasize": [
    {
      "skill": "<skill name>",
      "category": "technical|soft|language|industry",
      "relevance": "high|medium|low",
      "reason": "<why this skill is important for the job>"
    }
  ],
  "skillsToAdd": [
    {
      "skill": "<skill name>",
      "category": "technical|soft|language|industry",
      "proficiency": "beginner|intermediate|advanced|expert",
      "priority": "critical|important|nice-to-have",
      "reason": "<why adding this skill would help>"
    }
  ],
  "skillGaps": [
    {
      "skill": "<missing skill>",
      "category": "technical|soft|language|industry",
      "importance": "critical|important|nice-to-have",
      "suggestion": "<how to acquire or demonstrate this skill>"
    }
  ],
  "reorderedSkills": [
    {
      "skill": "<skill name>",
      "category": "technical|soft|language|industry",
      "position": <number>,
      "reason": "<why this order>"
    }
  ],
  "industryRecommendations": [
    {
      "skill": "<skill name>",
      "category": "technical|soft|language|industry",
      "trend": "<why this skill is trending in the industry>",
      "priority": "high|medium|low"
    }
  ],
  "categorization": {
    "technical": ["<skill1>", "<skill2>"],
    "soft": ["<skill1>", "<skill2>"],
    "languages": ["<skill1>", "<skill2>"],
    "industry": ["<skill1>", "<skill2>"]
  },
  "summary": "<brief summary of the optimization recommendations>"
}`;

    const userSkillsContext = userSkills && userSkills.length > 0
      ? `Current user skills:\n${userSkills.map((s: any) => `- ${s.skill_name} (${s.category}, ${s.proficiency_level})`).join('\n')}`
      : 'User has not added any skills yet.';

    const userPrompt = `Analyze this job description and optimize the skills section:

Job Description:
${jobDescription}

${userSkillsContext}

Provide comprehensive skills optimization including:
1. Overall matching score (0-100) based on current skills vs job requirements
2. Which existing skills to emphasize for this job
3. New skills to add that align with job requirements
4. Critical skill gaps and how to address them
5. Optimal skill ordering by relevance
6. Industry-specific recommendations
7. Categorization of all skills (technical, soft, languages, industry-specific)

Return ONLY valid JSON in the exact format specified.`;

    console.log('Calling Gemini AI for skills optimization...');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }
          ],
          generationConfig: { temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini AI error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini AI response received');

    let optimizationResult;
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        optimizationResult = JSON.parse(jsonMatch[0]);
      } else {
        optimizationResult = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      throw new Error('Failed to parse AI response. Please try again.');
    }

    return new Response(
      JSON.stringify(optimizationResult),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in optimize-resume-skills:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
