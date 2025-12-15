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
    const { targetCompanies, targetRoles, educationalInstitutions, currentIndustry, interests, location } =
      await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      data: { user },
    } = await supabase.auth.getUser(req.headers.get("Authorization")?.replace("Bearer ", "") || "");

    if (!user) {
      throw new Error("Unauthorized");
    }

    // Helper to build LinkedIn search URL (never invented profile URLs)
    const buildLinkedInSearchUrl = (contactName: string, contactCompany?: string | null) => {
      const query = [contactName, contactCompany]
        .filter((s): s is string => Boolean(s))
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .join(" ");
      
      return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;
    };

    // ----------------------------------------------------------------
    //  Perfil del usuario + contactos existentes (contexto para la IA)
    // ----------------------------------------------------------------
    const { data: profile } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).single();

    const { data: existingContacts } = await supabase
      .from("professional_contacts")
      .select("first_name, last_name, current_company, current_title")
      .eq("user_id", user.id);

    const systemPrompt = `You are an expert networking strategist specializing in professional relationship building and career development. Generate strategic contact suggestions that will help expand the user's professional network.`;

    const userPrompt = `Generate 10-15 strategic contact suggestions for a professional looking to expand their network.

USER CONTEXT:
- Current Industry: ${currentIndustry || "Not specified"}
- Target Companies: ${targetCompanies?.join(", ") || "Not specified"}
- Target Roles: ${targetRoles?.join(", ") || "Not specified"}
- Educational Background: ${educationalInstitutions?.join(", ") || "Not specified"}
- Location: ${location || "Not specified"}
- Professional Interests: ${interests?.join(", ") || "Not specified"}

EXISTING NETWORK:
${
  existingContacts
    ?.map((c) => `${c.first_name} ${c.last_name} - ${c.current_title} at ${c.current_company}`)
    .join("\n") || "No contacts yet"
}

For each contact suggestion, provide:
1. Contact name (realistic professional name)
2. Current title and company
3. Location
4. Connection type (one of: 'second_degree', 'third_degree', 'alumni', 'industry_leader', 'speaker', 'mutual_interest')
5. Connection path (array of intermediary connections for second/third degree)
6. Mutual connections (array of names)
7. Mutual interests (array of topics/areas)
8. Suggestion reason (why this contact is valuable)
9. Relevance score (0-100)
10. Any diversity & inclusion tags (e.g., 'women_in_tech', 'underrepresented_founders', etc.)
11. Birthday (REQUIRED - format: YYYY-MM-DD, age MUST be between 15-70 years old from today's date)

IMPORTANT: 
- Every contact MUST include a realistic birthday date where the person's age is between 15 and 70 years old.
- DO NOT include email addresses or phone numbers for the contacts (leave them null/empty).

NOTE: Do NOT generate LinkedIn profile URLs. We will construct search URLs automatically.

Return as JSON array of contact suggestions.`;

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
          tools: [{
            functionDeclarations: [{
              name: "generate_contact_suggestions",
              description: "Generate strategic contact suggestions",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        contact_name: { type: "string" },
                        contact_title: { type: "string" },
                        contact_company: { type: "string" },
                        contact_location: { type: "string" },
                        birthday: { 
                          type: "string",
                          description: "Birthday in YYYY-MM-DD format, age must be 15-70 years old"
                        },
                        connection_type: {
                          type: "string",
                          enum: [
                            "second_degree",
                            "third_degree",
                            "alumni",
                            "industry_leader",
                            "speaker",
                            "mutual_interest",
                          ],
                        },
                        connection_path: {
                          type: "array",
                          items: { type: "string" },
                        },
                        mutual_connections: {
                          type: "array",
                          items: { type: "string" },
                        },
                        mutual_interests: {
                          type: "array",
                          items: { type: "string" },
                        },
                        suggestion_reason: { type: "string" },
                        relevance_score: {
                          type: "integer",
                        },
                        diversity_inclusion_tags: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                      required: [
                        "contact_name",
                        "contact_title",
                        "connection_type",
                        "suggestion_reason",
                        "relevance_score",
                        "birthday",
                      ],
                    },
                  },
                },
                required: ["suggestions"],
              },
            }]
          }],
          toolConfig: {
            functionCallingConfig: { mode: "ANY" }
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API Error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const functionCall = aiData.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    const suggestions = functionCall?.args?.suggestions || [];

    // Validate and save suggestions with LinkedIn search URLs (never invented profile URLs)
    const contactsToInsert = suggestions.map((s: any) => {
      // Validate birthday is within 15-70 years old range
      let validatedBirthday = s.birthday;
      if (s.birthday) {
        const birthDate = new Date(s.birthday);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const dayDiff = today.getDate() - birthDate.getDate();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
        
        // If age is out of range, adjust it
        if (actualAge < 15 || actualAge > 70) {
          const targetAge = actualAge < 15 ? 25 : 45; // Default to 25 or 45
          validatedBirthday = new Date(today.getFullYear() - targetAge, birthDate.getMonth(), birthDate.getDate()).toISOString().split('T')[0];
        }
      }

      return {
        user_id: user.id,
        contact_name: s.contact_name,
        contact_title: s.contact_title,
        contact_company: s.contact_company,
        contact_location: s.contact_location,
        birthday: validatedBirthday,
        linkedin_url: buildLinkedInSearchUrl(s.contact_name, s.contact_company),
        connection_type: s.connection_type,
        connection_path: s.connection_path || [],
        mutual_connections: s.mutual_connections || [],
        mutual_interests: s.mutual_interests || [],
        suggestion_reason: s.suggestion_reason,
        relevance_score: s.relevance_score,
        target_company: targetCompanies?.[0],
        target_role: targetRoles?.[0],
        educational_institution: educationalInstitutions?.[0],
        diversity_inclusion_tags: s.diversity_inclusion_tags || [],
      };
    });

    const { data: insertedContacts, error: insertError } = await supabase
      .from("contact_suggestions")
      .insert(contactsToInsert)
      .select();

    if (insertError) throw insertError;

    // Métricas
    const today = new Date().toISOString().split("T")[0];
    const { error: metricsError } = await supabase.from("contact_discovery_metrics").upsert(
      {
        user_id: user.id,
        metric_date: today,
        suggestions_generated: suggestions.length,
      },
      {
        onConflict: "user_id,metric_date",
      },
    );

    if (metricsError) console.error("Metrics error:", metricsError);

    return new Response(JSON.stringify({ suggestions: insertedContacts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
