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
    const { jobDescription, userProfile, resumeType, variationCount = 3 } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Build comprehensive profile context
    const profileContext = `
User Profile:
Name: ${userProfile.first_name} ${userProfile.last_name}
Email: ${userProfile.email}
${userProfile.headline ? `Headline: ${userProfile.headline}` : ''}
${userProfile.bio ? `Bio: ${userProfile.bio}` : ''}
${userProfile.location ? `Location: ${userProfile.location}` : ''}

Work Experience:
${userProfile.employment_history?.map((job: any) => `
- ${job.job_title} at ${job.company_name} (${job.start_date} - ${job.is_current ? 'Present' : job.end_date})
  Location: ${job.location || 'N/A'}
  ${job.job_description || ''}
`).join('\n') || 'No work experience listed'}

Skills:
${userProfile.skills?.map((skill: any) => 
  `- ${skill.skill_name} (${skill.proficiency_level}) - ${skill.category}`
).join('\n') || 'No skills listed'}

Education:
${userProfile.education?.map((edu: any) => `
- ${edu.degree_type} in ${edu.field_of_study}
  ${edu.institution_name} (${edu.graduation_date || 'In Progress'})
  ${edu.gpa && edu.show_gpa ? `GPA: ${edu.gpa}` : ''}
  ${edu.achievements || ''}
`).join('\n') || 'No education listed'}

Certifications:
${userProfile.certifications?.map((cert: any) => `
- ${cert.certification_name}
  ${cert.issuing_organization} (${cert.date_earned})
  ${cert.category ? `Category: ${cert.category}` : ''}
`).join('\n') || 'No certifications listed'}

Projects:
${userProfile.projects?.map((proj: any) => `
- ${proj.project_name} (${proj.role})
  ${proj.description}
  Technologies: ${proj.technologies?.join(', ') || 'N/A'}
  ${proj.outcomes || ''}
`).join('\n') || 'No projects listed'}
`;

    const systemPrompt = `You are an expert resume writer and ATS optimization specialist. Your task is to generate tailored resume content that:

1. Analyzes the job description to identify key requirements, skills, and keywords
2. Matches user's experience and skills to job requirements
3. Creates compelling, action-oriented bullet points using strong verbs
4. Optimizes for ATS (Applicant Tracking Systems) with relevant keywords
5. Maintains factual accuracy - NEVER fabricate experience or skills
6. Uses quantifiable achievements where possible
7. Tailors content to the resume type: ${resumeType}

Resume Type Guidelines:
- Chronological: Focus on work history in reverse chronological order, emphasize career progression
- Functional: Focus on skills and achievements, group by skill categories
- Hybrid: Balance between work history and skills, highlight both timeline and capabilities

You MUST return ONLY a valid JSON object with this exact structure:
{
  "variations": [
    {
      "professionalSummary": "2-3 sentence tailored professional summary",
      "experienceBullets": {
        "job_title_company": [
          "3-5 tailored bullet points for this role that align with job requirements"
        ]
      },
      "recommendedSkills": [
        "skill names from user profile that match job requirements"
      ],
      "atsKeywords": [
        "important keywords from job description found in user profile"
      ],
      "suggestions": [
        "specific suggestions for improving the resume"
      ]
    }
  ]
}

Generate ${variationCount} variations, each with a different tone or emphasis while remaining professional and accurate.`;

    const userPrompt = `Job Description:
${jobDescription}

${profileContext}

Generate ${variationCount} distinct variations of resume content tailored to this job posting.`;

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
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const generatedContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedContent) {
      throw new Error("No content generated");
    }

    // Parse JSON from the response
    let parsedContent;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = generatedContent.match(/```json\n([\s\S]*?)\n```/) || 
                       generatedContent.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : generatedContent;
      parsedContent = JSON.parse(jsonString);
      
      // Ensure variations array exists
      if (!parsedContent.variations || !Array.isArray(parsedContent.variations)) {
        // If old format, convert to new format
        parsedContent = {
          variations: [{
            professionalSummary: parsedContent.professionalSummary || generatedContent,
            experienceBullets: parsedContent.experienceBullets || {},
            recommendedSkills: parsedContent.recommendedSkills || [],
            atsKeywords: parsedContent.atsKeywords || [],
            suggestions: parsedContent.suggestions || []
          }]
        };
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      // Return raw content if parsing fails
      parsedContent = {
        variations: [{
          professionalSummary: generatedContent,
          experienceBullets: {},
          recommendedSkills: [],
          atsKeywords: [],
          suggestions: ["Review and edit the generated content"]
        }]
      };
    }

    return new Response(
      JSON.stringify({ variations: parsedContent.variations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-resume-content:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
