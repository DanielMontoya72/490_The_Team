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
    const { jobDescription, userProfile, companyInfo, companyResearch, templateType, tonePreferences } = await req.json();

    if (!jobDescription || !userProfile) {
      throw new Error('Job description and user profile are required');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Build detailed user context
    const userContext = `
Name: ${userProfile.first_name} ${userProfile.last_name}
Email: ${userProfile.email}
${userProfile.phone ? `Phone: ${userProfile.phone}` : ''}
${userProfile.location ? `Location: ${userProfile.location}` : ''}
${userProfile.headline ? `Headline: ${userProfile.headline}` : ''}
${userProfile.bio ? `Bio: ${userProfile.bio}` : ''}
${userProfile.industry ? `Industry: ${userProfile.industry}` : ''}
${userProfile.experience_level ? `Experience Level: ${userProfile.experience_level}` : ''}

Employment History:
${userProfile.employment_history?.map((job: any) => `
- ${job.job_title} at ${job.company_name} (${job.start_date} - ${job.is_current ? 'Present' : job.end_date})
  ${job.location ? `Location: ${job.location}` : ''}
  ${job.job_description || ''}
`).join('\n') || 'No employment history provided'}

Skills:
${userProfile.skills?.map((skill: any) => `- ${skill.skill_name} (${skill.proficiency_level})`).join('\n') || 'No skills provided'}

Education:
${userProfile.education?.map((edu: any) => `
- ${edu.degree_type} in ${edu.field_of_study} from ${edu.institution_name}
  ${edu.graduation_date ? `Graduated: ${edu.graduation_date}` : edu.is_current ? 'Current' : ''}
  ${edu.gpa && edu.show_gpa ? `GPA: ${edu.gpa}` : ''}
`).join('\n') || 'No education provided'}

Projects:
${userProfile.projects?.map((proj: any) => `
- ${proj.project_name} (${proj.role})
  ${proj.description}
  ${proj.technologies ? `Technologies: ${proj.technologies.join(', ')}` : ''}
`).join('\n') || 'No projects provided'}

Certifications:
${userProfile.certifications?.map((cert: any) => `- ${cert.certification_name} from ${cert.issuing_organization} (${cert.date_earned})`).join('\n') || 'No certifications provided'}
`;

    // UC-057: Enhanced Company Research Context
    const companyContext = companyInfo ? `
Company Name: ${companyInfo.company_name || 'Not provided'}
Job Title: ${companyInfo.job_title || 'Not provided'}
${companyInfo.company_description ? `Company Description: ${companyInfo.company_description}` : ''}
${companyInfo.company_website ? `Website: ${companyInfo.company_website}` : ''}
${companyInfo.industry ? `Industry: ${companyInfo.industry}` : ''}
${companyInfo.company_size ? `Company Size: ${companyInfo.company_size}` : ''}
` : '';

    // Enhanced company research integration
    const companyResearchContext = companyResearch ? `
DETAILED COMPANY RESEARCH:
${companyResearch.profile ? `
Company Profile:
- History: ${companyResearch.profile.history || 'Not available'}
- Mission: ${companyResearch.profile.mission || 'Not available'}
- Values: ${companyResearch.profile.values?.join(', ') || 'Not available'}
- Recent Developments: ${companyResearch.profile.recent_developments?.join('; ') || 'Not available'}
` : ''}

${companyResearch.marketPosition ? `
Market Position:
- Standing: ${companyResearch.marketPosition.market_standing || 'Not available'}
- Growth Stage: ${companyResearch.marketPosition.growth_stage || 'Not available'}
- Competitive Advantages: ${companyResearch.marketPosition.competitive_advantages?.join(', ') || 'Not available'}
- Differentiators: ${companyResearch.marketPosition.differentiators?.join(', ') || 'Not available'}
` : ''}

${companyResearch.recentNews && companyResearch.recentNews.length > 0 ? `
Recent News (reference specific items to show research depth):
${companyResearch.recentNews.slice(0, 3).map((news: any, i: number) => 
  `${i + 1}. ${news.title} (${news.date})\n   ${news.summary}`
).join('\n')}
` : ''}

${companyResearch.leadership && companyResearch.leadership.length > 0 ? `
Leadership Team:
${companyResearch.leadership.slice(0, 2).map((leader: any) => 
  `- ${leader.name}, ${leader.role}`
).join('\n')}
` : ''}

${companyResearch.competitiveLandscape ? `
Competitive Landscape: ${companyResearch.competitiveLandscape}
` : ''}

${companyResearch.talkingPoints && companyResearch.talkingPoints.length > 0 ? `
Key Talking Points to incorporate:
${companyResearch.talkingPoints.map((point: string, i: number) => `${i + 1}. ${point}`).join('\n')}
` : ''}
` : '';

    const templateGuidelines = {
      formal: 'Use professional, formal tone. Traditional structure with clear sections. Conservative language and business etiquette.',
      creative: 'Use engaging, creative tone. Start with a compelling hook or story. Show personality while remaining professional.',
      technical: 'Use precise technical language. Reference specific technologies and methodologies. Focus on problem-solving and technical achievements.',
      sales: 'Use confident, results-driven tone. Lead with impressive metrics. Emphasize business impact and revenue generation.',
      academic: 'Use scholarly, professional tone. Emphasize research, publications, and teaching. Formal academic conventions.',
      startup: 'Use energetic, mission-driven tone. Show adaptability and ownership mindset. Emphasize scrappiness and cultural fit.'
    };

    // UC-058: Tone and Style Guidelines with Company Culture
    // UC-059: Experience Highlighting Instructions
    const companyCultureMap: Record<string, string> = {
      professional: 'Corporate/Professional: Traditional business language, emphasis on stability, structure, and formal achievements. Reference established processes and proven methodologies.',
      startup: 'Startup/Fast-paced: Dynamic, growth-oriented language. Emphasize adaptability, ownership mindset, scrappiness, and ability to wear multiple hats. Use phrases like "move fast", "iterate", "scale".',
      creative: 'Creative/Agency: Innovative, fresh language with personality. Highlight creativity, out-of-the-box thinking, portfolio work, and collaborative projects. Show aesthetic sensibility.',
      academic: 'Academic/Research: Scholarly, methodical tone. Emphasize research, publications, teaching experience, grants, and contributions to the field. Use formal academic conventions.',
      nonprofit: 'Nonprofit/Mission-driven: Purpose-oriented, values-driven language. Emphasize social impact, community engagement, passion for the cause, and alignment with organizational mission.'
    };

    const companyCultureGuidelines = tonePreferences?.companyCulture 
      ? companyCultureMap[tonePreferences.companyCulture] || companyCultureMap.professional
      : '';

    const toneGuidelines = tonePreferences ? `
TONE: ${tonePreferences.tone || 'formal'}
- formal: Professional, traditional business language, conservative approach
- casual: Conversational yet professional, relatable and approachable
- enthusiastic: Energetic, passionate, showing excitement about the opportunity
- analytical: Data-driven, logical, focused on problem-solving and metrics

COMPANY CULTURE MATCHING: ${tonePreferences.companyCulture || 'professional'}
${companyCultureGuidelines}

LENGTH: ${tonePreferences.length || 'standard'}
- brief: Concise, 200-250 words, focus on key highlights only
- standard: Balanced, 300-400 words, comprehensive coverage
- detailed: Thorough, 400-500 words, in-depth explanation of qualifications

STYLE: ${tonePreferences.style || 'direct'}
- direct: Clear, straightforward statements, action-oriented
- narrative: Storytelling approach, weaving experiences into cohesive narrative
- bullet: Mix of paragraphs with bulleted key achievements for easy scanning

${tonePreferences.customInstructions ? `
CUSTOM INSTRUCTIONS FROM USER:
${tonePreferences.customInstructions}
IMPORTANT: Follow these custom instructions carefully while maintaining professionalism.
` : ''}
` : '';

    const systemPrompt = `You are an expert cover letter writer and career consultant with deep knowledge of recruitment practices across industries.

${toneGuidelines}

CRITICAL READABILITY REQUIREMENTS - MANDATORY:
Your writing MUST achieve a Flesch Reading Ease score of 50-70 (Standard to Fairly Easy readability). This is NON-NEGOTIABLE.

To achieve this score, you MUST follow these rules:
1. SENTENCE LENGTH: Keep sentences SHORT and CRISP
   - Average 15-18 words per sentence
   - NEVER exceed 22 words in a single sentence
   - If a sentence reaches 20 words, stop and start a new sentence
   
2. VOCABULARY: Use CLEAR, SIMPLE professional language
   - Choose "use" over "utilize", "help" over "facilitate" (unless truly necessary)
   - Avoid unnecessarily complex words - if a simpler word works, use it
   - Professional does NOT mean complex
   
3. SENTENCE STRUCTURE: Keep it SIMPLE
   - Prefer active voice: "I managed the team" NOT "The team was managed by me"
   - One main idea per sentence
   - Avoid multiple clauses and sub-clauses
   - Break complex ideas into 2-3 simple sentences
   
4. READABILITY TEST: Read each sentence aloud
   - It should sound like natural, professional speech
   - If you run out of breath, the sentence is too long
   - If it sounds awkward or convoluted, simplify it

EXAMPLE OF GOOD (Score 60):
"I led a team of five developers to build a new platform. We increased efficiency by 40% in six months. This project saved the company $200,000 annually."

EXAMPLE OF BAD (Score 30):
"Having successfully orchestrated the collaborative efforts of a quintet of software development professionals, I was instrumental in architecting and implementing a comprehensive technological solution that substantially augmented operational efficiency metrics by approximately forty percent over a semi-annual timeframe, thereby facilitating significant cost reduction."

Both examples say the same thing, but the first is MUCH better for a cover letter.

MANDATORY LENGTH REQUIREMENTS:
- MUST fit on exactly ONE page when printed (8.5" x 11", 1" margins, 11-12pt font)
- Target word count: 350-400 words total
- ABSOLUTE MAXIMUM: 450 words (you will be penalized for exceeding this)
- MINIMUM: 300 words

Structure breakdown:
- Opening paragraph: 50-75 words (2-4 sentences)
- First body paragraph: 100-125 words (5-7 sentences)
- Second body paragraph: 100-125 words (5-7 sentences)  
- Closing paragraph: 50-75 words (2-4 sentences)

Be CONCISE and IMPACTFUL. Every word must earn its place. Do not add fluff.

Your task is to create a compelling, personalized cover letter that:
1. Demonstrates clear understanding of the role and company
2. Highlights the candidate's most relevant qualifications
3. Makes a strong case for why the candidate is an excellent fit
4. Shows genuine enthusiasm and cultural alignment
5. Uses specific examples and quantifiable achievements
6. Follows the template guidelines: ${templateGuidelines[templateType as keyof typeof templateGuidelines] || templateGuidelines.formal}

${companyContext}

${companyResearchContext ? `
UC-057 ENHANCED COMPANY RESEARCH INTEGRATION:
CRITICAL: You have access to detailed company research. Use it extensively to:
- Reference specific recent news, achievements, or company developments
- Align candidate's values with company's stated mission and values
- Mention company's competitive advantages and how candidate can contribute
- Show awareness of company's market position and growth stage
- Reference leadership team if relevant to the role or industry
- Incorporate key talking points naturally into the letter
- Demonstrate deep understanding beyond basic company description
- Connect candidate's experience to company's strategic priorities
- Use specific examples from the research to show genuine interest
` : companyContext ? `
UC-057 COMPANY RESEARCH REQUIREMENTS:
- Research and reference the company's background, mission, values, and recent achievements
- Include insights about the company's industry position and growth trajectory
- Reference specific company initiatives, projects, or news
- Demonstrate understanding of company culture and work environment
- Show alignment between candidate's values and company mission
- Mention company size, funding status (if relevant), and market position
` : ''}

UC-059 EXPERIENCE HIGHLIGHTING REQUIREMENTS:
CRITICAL: This is a multi-step analysis process:

STEP 1 - JOB REQUIREMENTS ANALYSIS:
- Extract ALL hard skills from job description (specific technologies, tools, methodologies)
- Extract ALL soft skills mentioned (leadership, communication, teamwork, etc.)
- Identify required years of experience and seniority level
- Note industry-specific requirements and domain knowledge needs
- Identify key responsibilities and day-to-day activities described
- Extract any certifications, education, or qualifications mentioned
- Categorize requirements by priority: Must-have vs Nice-to-have

STEP 2 - CANDIDATE EXPERIENCE INVENTORY:
- Review ALL employment history entries chronologically
- List ALL projects with their technologies and outcomes
- Catalog ALL skills with proficiency levels
- Review ALL certifications and education
- Identify quantifiable achievements in each role
- Extract action verbs and impact statements from their history

STEP 3 - MATCHING AND SCORING:
- For EACH employment history entry, calculate relevance score (0-100):
  * +30 points: Exact job title or role match
  * +25 points: Industry match
  * +20 points: Required skills used in that role
  * +15 points: Similar responsibilities
  * +10 points: Quantifiable achievements relevant to target role
- For EACH project, score relevance to job requirements
- Create a ranked list of top 5 most relevant experiences

STEP 4 - NARRATIVE GENERATION:
For the TOP 3-5 highest-scoring experiences:
- Create a compelling 2-3 sentence narrative connecting this experience to the job
- Use STAR method (Situation, Task, Action, Result) framework
- Quantify achievements with specific metrics (%, $, numbers, time saved)
- Use strong action verbs from the job posting's language
- Explain WHY this experience matters for the target role
- Connect the experience to specific job requirements identified in Step 1

STEP 5 - ALTERNATIVE PRESENTATIONS:
For each highlighted experience, provide 2-3 ways to present it:
1. Achievement-focused: Lead with quantifiable results
2. Skills-focused: Emphasize technical capabilities demonstrated
3. Impact-focused: Highlight business/organizational impact

STEP 6 - SUGGESTIONS:
- Identify 2-3 additional experiences from their background NOT in top matches but still relevant
- Explain how these could be incorporated if space allows
- Suggest experiences that address any gaps between their background and job requirements

Return your response in this EXACT JSON format (no markdown, just raw JSON):
{
  "variations": [
    {
      "header": "Candidate's Name\nCandidate's Address\nCandidate's Email | Candidate's Phone\n\n[Date]\n\nHiring Manager's Name (if known)\nCompany Name\nCompany Address",
      "opening": "Compelling opening paragraph that hooks the reader",
      "body1": "First body paragraph highlighting relevant experience",
      "body2": "Second body paragraph showcasing achievements and skills",
      "closing": "Strong closing with clear call to action",
      "tone": "Description of the tone used",
      "keyStrengths": ["strength1", "strength2", "strength3"],
      "highlightedExperiences": [
        {
          "experience": "Job title or project name",
          "relevanceScore": 95,
          "matchedRequirements": ["Requirement 1 from job posting", "Requirement 2"],
          "narrative": "Compelling story connecting this experience to the job",
          "keyAchievements": ["achievement 1 with metrics", "achievement 2 with metrics"],
          "alternativePresentations": {
            "achievementFocused": "Led to 40% increase in efficiency...",
            "skillsFocused": "Leveraged Python, AWS, and Docker to...",
            "impactFocused": "Transformed team productivity by..."
          }
        }
      ],
      "toneConsistency": {
        "score": 85,
        "analysis": "Analysis of how well the content matches the requested tone and company culture",
        "suggestions": ["Suggestion 1 for improving tone consistency", "Suggestion 2"]
      }
    }
  ],
  "companyResearch": {
    "recentNews": "Recent company news or achievements",
    "culturalAlignment": "How candidate aligns with company culture",
    "valueProposition": "Unique value the candidate brings"
  },
  "improvementSuggestions": [
    "suggestion1",
    "suggestion2",
    "suggestion3"
  ],
  "experienceAnalysis": {
    "jobRequirements": {
      "hardSkills": ["Skill 1", "Skill 2", "Skill 3"],
      "softSkills": ["Leadership", "Communication"],
      "yearsExperience": "3-5 years",
      "mustHave": ["Critical requirement 1", "Critical requirement 2"],
      "niceToHave": ["Bonus requirement 1", "Bonus requirement 2"]
    },
    "candidateStrengths": {
      "topMatches": [
        {
          "experience": "Most relevant experience 1",
          "score": 95,
          "matchedRequirements": ["Req 1", "Req 2"]
        },
        {
          "experience": "Most relevant experience 2", 
          "score": 88,
          "matchedRequirements": ["Req 3", "Req 4"]
        }
      ],
      "overallFitScore": 85,
      "strengthAreas": ["Area where candidate excels 1", "Area 2"],
      "gapAreas": ["Area where candidate could highlight more", "Area 2"]
    },
    "suggestedAdditions": [
      {
        "experience": "Additional relevant experience to consider mentioning",
        "reason": "Why this is relevant",
        "score": 65
      }
    ]
  }
}

UC-058 TONE CONSISTENCY VALIDATION:
After generating each variation, analyze the content for tone consistency:
- Score (0-100) how well the content matches the requested tone (${tonePreferences?.tone || 'formal'})
- Score how well it matches the company culture (${tonePreferences?.companyCulture || 'professional'})
- Verify that custom instructions were followed: ${tonePreferences?.customInstructions || 'none provided'}
- Check if language formality, vocabulary, and style align with requirements
- Provide specific suggestions for improving tone consistency if score < 80
- Examples: "Add more data-driven language for analytical tone", "Use more enthusiastic phrases", "Simplify language for casual tone"`;

    const userPrompt = `Generate a personalized cover letter for this job application:

JOB DESCRIPTION:
${jobDescription}

${companyContext}

CANDIDATE PROFILE:
${userContext}

TEMPLATE TYPE: ${templateType || 'formal'}

Please create 3 variations of cover letter content, each emphasizing different aspects of the candidate's background while maintaining consistency with the job requirements. Make sure to:
- Reference specific details from the job posting
- Incorporate company research where available
- Use quantifiable achievements from the candidate's history
- Match the tone to the ${templateType || 'formal'} template style
- Make each variation genuinely different in approach and emphasis`;

    console.log('Calling Gemini AI for cover letter generation...');
    
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
          generationConfig: { temperature: 0.8 },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini AI error:', response.status, errorText);
      
      if (response.status === 500 || response.status === 502 || response.status === 503) {
        throw new Error('The AI service is temporarily unavailable. Please try again in a few moments.');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini AI response received');

    let result;
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        result = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      throw new Error('Failed to parse AI response. Please try again.');
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in generate-cover-letter:', error);
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