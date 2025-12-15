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
    const { jobTitle, jobDescription, techStack, difficultyLevel, challengeType } = await req.json();
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (challengeType === 'coding') {
      systemPrompt = `You are an expert technical interviewer specializing in creating coding challenges. Generate realistic, role-specific coding problems that match the job requirements.`;
      
      userPrompt = `Create a coding challenge for a ${jobTitle} position.

Job Description: ${jobDescription || 'Not provided'}
Tech Stack: ${techStack || 'General'}
Difficulty: ${difficultyLevel || 'medium'}

Generate a coding challenge with:
1. Problem title (concise and descriptive)
2. Problem description (clear requirements)
3. Input/Output examples (at least 2)
4. Constraints and edge cases
5. Hints for solving
6. Time complexity expectations
7. Suggested tech stack/language

Format the response as a structured JSON object.`;
    } else if (challengeType === 'system-design') {
      systemPrompt = `You are a senior software architect specializing in system design interviews. Create comprehensive system design questions that test scalability, architecture, and real-world problem-solving.`;
      
      userPrompt = `Create a system design question for a ${jobTitle} position.

Job Description: ${jobDescription || 'Not provided'}
Tech Stack: ${techStack || 'General'}
Seniority: ${difficultyLevel === 'hard' ? 'Senior/Staff' : difficultyLevel === 'medium' ? 'Mid-level' : 'Junior'}

Generate a system design challenge with:
1. Problem statement (realistic business scenario)
2. Functional requirements
3. Non-functional requirements (scale, performance, availability)
4. Key components to consider
5. Trade-offs to discuss
6. Suggested approach outline
7. Common pitfalls to avoid

Format the response as a structured JSON object.`;
    } else if (challengeType === 'case-study') {
      systemPrompt = `You are a business analyst and consultant specializing in case study interviews. Create realistic business scenarios that test analytical thinking and problem-solving.`;
      
      userPrompt = `Create a case study for a ${jobTitle} position.

Job Description: ${jobDescription || 'Not provided'}
Industry Context: ${techStack || 'General business'}
Complexity: ${difficultyLevel || 'medium'}

Generate a case study with:
1. Business scenario (realistic context)
2. Key problem statement
3. Available data/context
4. Questions to answer
5. Success metrics to consider
6. Framework suggestions (e.g., SWOT, Porter's Five Forces)
7. Expected deliverables

Format the response as a structured JSON object.`;
    }

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
          tools: [{
            functionDeclarations: [{
              name: 'generate_challenge',
              description: 'Generate a structured technical challenge',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Challenge title' },
                  description: { type: 'string', description: 'Detailed problem description' },
                  requirements: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of requirements or functional specs'
                  },
                  examples: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        input: { type: 'string' },
                        output: { type: 'string' },
                        explanation: { type: 'string' }
                      }
                    },
                    description: 'Input/output examples (for coding challenges)'
                  },
                  constraints: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Constraints and edge cases'
                  },
                  hints: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Hints for solving'
                  },
                  expectedApproach: { type: 'string', description: 'Suggested solution approach' },
                  timeComplexity: { type: 'string', description: 'Expected time complexity (for coding)' },
                  difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Relevant tags (e.g., arrays, graphs, microservices, etc.)'
                  }
                },
                required: ['title', 'description', 'requirements', 'hints', 'difficulty', 'tags']
              }
            }]
          }],
          toolConfig: {
            functionCallingConfig: { mode: 'ANY' }
          }
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Gemini AI error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data));

    // Extract the function call result from Gemini response
    const functionCall = data.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    if (!functionCall) {
      throw new Error('No function call in AI response');
    }

    const challenge = functionCall.args;

    return new Response(
      JSON.stringify({ challenge }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating technical questions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate questions';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
