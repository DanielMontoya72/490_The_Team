import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { industry, interests, location } = await req.json();
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );

    if (!user) {
      throw new Error('Unauthorized');
    }

    const systemPrompt = `You are an expert at finding networking events, conferences, and professional opportunities. Generate relevant networking opportunities that will help expand professional networks.
    
CRITICAL: All event dates MUST be December 2025 or later. Never generate past dates.`;

    const userPrompt = `Generate 8-12 relevant networking opportunities for a professional.

CONTEXT:
- Industry: ${industry || 'Technology'}
- Location: ${location || 'Not specified'}
- Professional Interests: ${interests?.join(', ') || 'Not specified'}

CRITICAL REQUIREMENT: All event dates must be from December 2025 onwards (2025-12-01 or later). Use realistic future dates between December 2025 and December 2026.

For each opportunity, provide:
1. Event name (realistic professional event)
2. Event type (one of: 'conference', 'meetup', 'webinar', 'alumni_event', 'industry_event')
3. Description (brief overview)
4. Date (MUST be December 2025 or later, in ISO format YYYY-MM-DD)
5. Location (physical or "Virtual")
6. Event URL (realistic format)
7. Organizer name
8. Speakers (array of speaker names and titles)
9. Topics (array of discussion topics)
10. Potential contacts (brief descriptions of who will attend)
11. Relevance score (0-100)
12. Diversity focus (boolean - does this event promote diversity & inclusion?)

Include a mix of:
- Large industry conferences with keynote speakers
- Local meetups for hands-on networking
- Virtual webinars with industry leaders
- Alumni networking events
- Diversity & inclusion focused events
- Technical workshops with speakers

REMEMBER: All dates must be December 2025 or later!

Return as JSON array of opportunities.`;

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
              name: 'generate_networking_opportunities',
              description: 'Generate networking event opportunities',
              parameters: {
                type: 'object',
                properties: {
                  opportunities: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        event_name: { type: 'string' },
                        opportunity_type: { 
                          type: 'string',
                          enum: ['conference', 'meetup', 'webinar', 'alumni_event', 'industry_event']
                        },
                        event_description: { type: 'string' },
                        event_date: { type: 'string' },
                        event_location: { type: 'string' },
                        event_url: { type: 'string' },
                        organizer: { type: 'string' },
                        speakers: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              title: { type: 'string' }
                            }
                          }
                        },
                        topics: {
                          type: 'array',
                          items: { type: 'string' }
                        },
                        potential_contacts: {
                          type: 'array',
                          items: { type: 'string' }
                        },
                        relevance_score: { type: 'integer' },
                        diversity_focus: { type: 'boolean' }
                      },
                      required: ['event_name', 'opportunity_type', 'event_description', 'relevance_score']
                    }
                  }
                },
                required: ['opportunities']
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
      const errorText = await response.text();
      console.error('AI API Error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const functionCall = aiData.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    const opportunities = functionCall?.args?.opportunities || [];

    // Save opportunities to database
    const opportunitiesToInsert = opportunities.map((o: any) => ({
      user_id: user.id,
      opportunity_type: o.opportunity_type,
      event_name: o.event_name,
      event_description: o.event_description,
      event_date: o.event_date,
      event_location: o.event_location,
      event_url: o.event_url,
      organizer: o.organizer,
      speakers: o.speakers || [],
      topics: o.topics || [],
      industry,
      relevance_score: o.relevance_score,
      potential_contacts: o.potential_contacts || [],
      diversity_focus: o.diversity_focus || false
    }));

    const { data: insertedOpportunities, error: insertError } = await supabase
      .from('networking_opportunities')
      .insert(opportunitiesToInsert)
      .select();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ opportunities: insertedOpportunities }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});