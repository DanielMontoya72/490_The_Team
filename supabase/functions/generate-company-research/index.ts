import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    console.log('Generating company research for job:', jobId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    // Generate company research using Gemini AI
    const systemPrompt = `You are an expert company research analyst. Generate comprehensive company research for interview preparation. 

CRITICAL: You must respond with ONLY a valid JSON object, no other text. Use this exact structure:
{
  "company_profile": {
    "history": "Company history and background",
    "mission": "Mission statement",
    "values": ["value1", "value2"],
    "recent_developments": ["development1", "development2"],
    "summary": "Brief 2-3 sentence executive summary of the company"
  },
  "social_media": {
    "linkedin": "LinkedIn URL or null",
    "twitter": "Twitter/X URL or null",
    "facebook": "Facebook URL or null",
    "instagram": "Instagram URL or null",
    "youtube": "YouTube URL or null"
  },
  "leadership_info": [
    {
      "name": "Leader name",
      "role": "Position",
      "background": "Brief background"
    }
  ],
  "market_position": {
    "market_standing": "Market position: leader, challenger, niche player, or emerging",
    "market_share_estimate": "Estimated market share or ranking",
    "growth_stage": "Startup, growth, mature, or declining stage",
    "target_segments": ["segment1", "segment2"],
    "competitive_advantages": ["advantage1", "advantage2", "advantage3"],
    "differentiators": ["differentiator1", "differentiator2"],
    "market_trends": "Key market trends affecting the company's position"
  },
  "competitive_landscape": "Overview of competitive position and market landscape",
  "recent_news": [
    {
      "title": "News title",
      "date": "YYYY-MM-DD format",
      "summary": "2-3 sentence summary of the news",
      "url": null,
      "category": "funding|product_launch|hiring|partnership|award|general",
      "relevance_score": 85,
      "key_points": ["Key point 1", "Key point 2", "Key point 3"],
      "source": "News source name (e.g., TechCrunch, Bloomberg, Company Blog)"
    }
  ],
  "talking_points": [
    "Key point 1",
    "Key point 2"
  ],
  "questions_to_ask": [
    "Intelligent question 1",
    "Intelligent question 2"
  ]
}

IMPORTANT RULES FOR NEWS GENERATION:
1. ONLY include news items with REAL, verifiable URLs if you have specific knowledge of them
2. If you don't have real URLs, generate 5-7 plausible news items but set url to null
3. Base news on typical company activities and industry patterns
4. Categorize news accurately: funding, product_launch, hiring, partnership, award, or general
5. Relevance scores (0-100) should reflect how important the news is for interview prep:
   - 90-100: Major company changes, funding, leadership changes
   - 70-89: Product launches, significant partnerships, awards
   - 50-69: Hiring announcements, minor updates
   - 30-49: General news, industry mentions
6. Include 2-4 specific key points per news item
7. Use realistic date ranges (within past 6 months) in YYYY-MM-DD format
8. Vary the news sources to show comprehensive research
9. If including URLs, they MUST be real and verifiable - never fabricate news article URLs`;

    const userPrompt = `Generate comprehensive company research for interview preparation:
Company: ${job.company_name}
Industry: ${job.industry || 'Not specified'}
Job Title: ${job.job_title}
Company Description: ${job.company_description || 'Not available'}
Company Website: ${job.company_website || 'Not available'}

Generate detailed research including:
- Company history, mission, values, and a brief executive summary
- Social media presence (LinkedIn, Twitter, Facebook, Instagram, YouTube URLs - use null if unknown)
- Leadership team information with realistic names and roles
- Market position analysis:
  * Market standing (leader, challenger, niche player, emerging)
  * Market share estimate or industry ranking
  * Growth stage (startup, growth, mature, declining)
  * Target market segments (who they serve)
  * 3-4 competitive advantages (what they do better)
  * 2-3 key differentiators (what makes them unique)
  * Current market trends affecting their position
- Competitive landscape analysis
- 5-7 recent news items with proper categorization, relevance scores (0-100), key points, and sources
  * CRITICAL: Set url to null for ALL news items - DO NOT generate or construct URLs
  * Only include a real URL if you have 100% verified knowledge of that exact article from your training data
  * Make news items realistic and relevant for interview preparation based on company activities
  * Include specific key points that demonstrate research depth
  * Use dates within the past 6 months in YYYY-MM-DD format
  * Vary news categories and sources
- Key talking points for the interview that reference the news and research
- Intelligent questions to ask that show awareness of company developments

Return ONLY the JSON object, no additional text.`;

    console.log('Calling Gemini AI for company research...');
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
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
          tools: [{
            functionDeclarations: [{
              name: "generate_company_research",
              description: "Generate comprehensive company research for interview preparation",
              parameters: {
                type: "object",
                properties: {
                  company_profile: {
                    type: "object",
                    properties: {
                      history: { type: "string" },
                      mission: { type: "string" },
                      values: { type: "array", items: { type: "string" } },
                      recent_developments: { type: "array", items: { type: "string" } },
                      summary: { type: "string" }
                    },
                    required: ["history", "mission", "values", "recent_developments", "summary"]
                  },
                  social_media: {
                    type: "object",
                    properties: {
                      linkedin: { type: "string" },
                      twitter: { type: "string" },
                      facebook: { type: "string" },
                      instagram: { type: "string" },
                      youtube: { type: "string" }
                    }
                  },
                  leadership_info: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        role: { type: "string" },
                        background: { type: "string" }
                      },
                      required: ["name", "role", "background"]
                    }
                  },
                  market_position: {
                    type: "object",
                    properties: {
                      market_standing: { type: "string" },
                      market_share_estimate: { type: "string" },
                      growth_stage: { type: "string" },
                      target_segments: { type: "array", items: { type: "string" } },
                      competitive_advantages: { type: "array", items: { type: "string" } },
                      differentiators: { type: "array", items: { type: "string" } },
                      market_trends: { type: "string" }
                    },
                    required: ["market_standing", "market_share_estimate", "growth_stage", "target_segments", "competitive_advantages", "differentiators", "market_trends"]
                  },
                  competitive_landscape: { type: "string" },
                  recent_news: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        date: { type: "string" },
                        summary: { type: "string" },
                        url: { type: "string" },
                        category: { type: "string", enum: ["funding", "product_launch", "hiring", "partnership", "award", "general"] },
                        relevance_score: { type: "number" },
                        key_points: { type: "array", items: { type: "string" } },
                        source: { type: "string" }
                      },
                      required: ["title", "date", "summary", "category", "relevance_score", "key_points", "source"]
                    }
                  },
                  talking_points: {
                    type: "array",
                    items: { type: "string" }
                  },
                  questions_to_ask: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["company_profile", "social_media", "leadership_info", "market_position", "competitive_landscape", "recent_news", "talking_points", "questions_to_ask"]
              }
            }]
          }],
          toolConfig: {
            functionCallingConfig: { mode: 'ANY' }
          }
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      // Handle specific error codes
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a few moments.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI credits depleted. Please add credits to your workspace.');
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received successfully');

    // Extract structured output from Gemini function call
    const functionCall = aiData.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    if (!functionCall || !functionCall.args) {
      console.error('No function call found in response');
      throw new Error('AI did not return structured data');
    }

    let researchData: any = functionCall.args;
    console.log('Successfully parsed research data from function call');

    // Store in database
    const { data: research, error: insertError } = await supabase
      .from('company_research')
      .insert({
        user_id: job.user_id,
        job_id: jobId,
        company_profile: researchData.company_profile || {},
        social_media: researchData.social_media || {},
        leadership_info: researchData.leadership_info || [],
        market_position: researchData.market_position || {},
        competitive_landscape: researchData.competitive_landscape || '',
        recent_news: researchData.recent_news || [],
        talking_points: researchData.talking_points || [],
        questions_to_ask: researchData.questions_to_ask || []
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    console.log('Company research generated and stored successfully');

    return new Response(JSON.stringify({ research }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-company-research:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});