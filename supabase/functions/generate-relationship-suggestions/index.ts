import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let contactId;
    try {
      const body = await req.json();
      contactId = body.contactId;
      
      if (!contactId) {
        throw new Error("Missing contactId in request body");
      }
    } catch (parseError) {
      console.error("Failed to parse request:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request: " + (parseError instanceof Error ? parseError.message : "Unknown error") }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing suggestions for contact:", contactId);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get("Authorization")?.replace("Bearer ", "") || ""
    );

    if (!user) {
      throw new Error("Unauthorized");
    }

    // Get contact details - try professional_contacts first, then contact_suggestions
    let contact: any = null;
    
    const { data: professionalContact } = await supabase
      .from("professional_contacts")
      .select("*")
      .eq("id", contactId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (professionalContact) {
      contact = professionalContact;
      console.log("Found contact in professional_contacts");
    } else {
      // Try contact_suggestions (AI-generated contacts)
      const { data: suggestionContact } = await supabase
        .from("contact_suggestions")
        .select("*")
        .eq("id", contactId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (suggestionContact) {
        // Normalize the data structure to match professional_contacts
        contact = {
          id: suggestionContact.id,
          first_name: suggestionContact.contact_name?.split(' ')[0] || '',
          last_name: suggestionContact.contact_name?.split(' ').slice(1).join(' ') || '',
          current_company: suggestionContact.contact_company,
          current_title: suggestionContact.contact_title,
          shared_interests: suggestionContact.mutual_interests || [],
          relationship_strength: 'weak' // Default for AI-generated contacts
        };
        console.log("Found contact in contact_suggestions");
      }
    }

    if (!contact) {
      throw new Error("Contact not found in either table");
    }

    // Get recent activities for this contact
    const { data: activities } = await supabase
      .from("contact_interactions")
      .select("*")
      .eq("contact_id", contactId)
      .eq("user_id", user.id)
      .order("interaction_date", { ascending: false })
      .limit(5);

    const recentActivities = activities || [];

    const systemPrompt = `You are a professional relationship expert who generates highly actionable, industry-specific suggestions to strengthen professional relationships and create mutual value.`;

    const userPrompt = `Generate relationship strengthening suggestions for a professional contact.

CONTACT DETAILS:
- Name: ${contact.first_name} ${contact.last_name}
- Company: ${contact.current_company || 'Unknown'}
- Title: ${contact.current_title || 'Unknown'}
- Industry: ${contact.industry || 'Unknown'}
- How we met: ${contact.how_we_met || 'Unknown'}
- Relationship type: ${contact.relationship_type || 'Professional'}
- Personal interests: ${contact.personal_interests || 'Unknown'}

RECENT ACTIVITIES (last 5):
${recentActivities.map(a => `- ${a.interaction_type} on ${a.interaction_date}: ${a.notes || 'No notes'}`).join('\n')}

Generate 3-5 specific, actionable suggestions to strengthen this relationship. Include:
1. Industry news share opportunities (find relevant articles/trends in their industry)
2. Introduction opportunities (who they might benefit from knowing)
3. Collaboration opportunities (projects, events, skills exchange)
4. Personal connection opportunities (congratulations, celebrations, check-ins)
5. Value exchange opportunities (referrals, advice, resources)

Each suggestion should:
- Be highly relevant to the contact's industry and interests
- Provide clear mutual value
- Include specific action steps
- Have realistic time estimates

IMPORTANT: Use ONLY these suggestion types:
- "share_article" (for industry news, insights, articles)
- "make_introduction" (for connecting them with someone)
- "congratulate" (for celebrations, achievements)
- "offer_help" (for advice, mentoring, support)
- "schedule_coffee" (for check-ins, catch-ups)
- "share_opportunity" (for job openings, collaborations, events)

Format as JSON array:
[
  {
    "suggestion_type": "share_article",
    "title": "Concise title (max 60 chars)",
    "description": "Detailed description with context and reasoning",
    "relevance_score": 85
  }
]

Return ONLY valid JSON array, no markdown code blocks or explanation.`;

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
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API Error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    let suggestions = [];

    // Map AI suggestion types to database-allowed values
    const mapSuggestionType = (type: string): string => {
      const typeMap: Record<string, string> = {
        'industry_news_share': 'share_article',
        'news_share': 'share_article',
        'share_news': 'share_article',
        'introduction': 'make_introduction',
        'connect': 'make_introduction',
        'collaboration': 'share_opportunity',
        'celebrate': 'congratulate',
        'celebration': 'congratulate',
        'referral': 'share_opportunity',
        'advice': 'offer_help',
        'mentor': 'offer_help',
        'check_in': 'schedule_coffee',
        'coffee': 'schedule_coffee',
        'catch_up': 'schedule_coffee'
      };
      
      const lowerType = type.toLowerCase();
      return typeMap[lowerType] || type;
    };

    try {
      const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      console.log("AI Response content:", content);
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestions = parsed.map((s: any) => ({
          ...s,
          suggestion_type: mapSuggestionType(s.suggestion_type)
        }));
      } else {
        throw new Error("No JSON array found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback suggestions with valid database values
      suggestions = [
        {
          suggestion_type: "schedule_coffee",
          title: `Schedule a catch-up with ${contact.first_name}`,
          description: `Reach out to ${contact.first_name} to schedule a quick coffee chat or video call to reconnect and catch up.`,
          relevance_score: 75
        }
      ];
    }

    // Validate and save suggestions to database
    const suggestionsToInsert = suggestions.map((s: any) => {
      // Ensure suggestion_type is valid
      const validTypes = ['share_article', 'make_introduction', 'congratulate', 'offer_help', 'schedule_coffee', 'share_opportunity'];
      const suggestionType = validTypes.includes(s.suggestion_type) ? s.suggestion_type : 'schedule_coffee';
      
      return {
        user_id: user.id,
        contact_id: contactId,
        suggestion_type: suggestionType,
        suggestion_title: s.title || 'Relationship strengthening suggestion',
        suggestion_description: s.description || '',
        status: 'pending',
        relevance_score: s.relevance_score || null
      };
    });

    const { data: insertedSuggestions, error: insertError } = await supabase
      .from("relationship_strengthening_suggestions")
      .insert(suggestionsToInsert)
      .select();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ suggestions: insertedSuggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-relationship-suggestions:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});