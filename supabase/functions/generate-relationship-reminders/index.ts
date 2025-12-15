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

    // Get user's professional contacts
    const { data: contacts, error: contactsError } = await supabase
      .from("professional_contacts")
      .select("*")
      .eq("user_id", user.id);

    if (contactsError) throw contactsError;

    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No contacts found", reminders: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get existing reminders to avoid duplicates
    const { data: existingReminders } = await supabase
      .from("relationship_maintenance_reminders")
      .select("contact_id")
      .eq("user_id", user.id)
      .eq("is_completed", false);

    const contactsWithReminders = new Set(existingReminders?.map(r => r.contact_id) || []);

    // Filter contacts that need reminders
    const contactsNeedingAttention = contacts.filter(contact => {
      if (contactsWithReminders.has(contact.id)) return false;
      
      const lastContact = contact.last_contacted_at 
        ? new Date(contact.last_contacted_at) 
        : new Date(contact.created_at);
      
      const daysSinceLastContact = Math.floor(
        (Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Generate reminder if more than 7 days since last contact OR never contacted
      return daysSinceLastContact >= 7 || !contact.last_contacted_at;
    });

    if (contactsNeedingAttention.length === 0) {
      return new Response(
        JSON.stringify({ message: "All relationships are up to date", reminders: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch templates
    const { data: templates } = await supabase
      .from("relationship_templates")
      .select("*")
      .eq("is_system_template", true);

    // Generate AI-powered personalized messages for each contact
    const remindersToCreate = [];

    for (const contact of contactsNeedingAttention.slice(0, 10)) {
      const daysSinceContact = Math.floor(
        (Date.now() - new Date(contact.last_contacted_at || contact.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determine reminder type and template
      let reminderType = "periodic_check_in";
      let templateType = "check_in";
      
      const systemPrompt = `You are a professional relationship management expert. Generate personalized, warm outreach messages that build genuine connections.`;

      const userPrompt = `Generate a personalized ${reminderType} message for reconnecting with a professional contact.

CONTACT INFO:
- Name: ${contact.first_name} ${contact.last_name}
- Company: ${contact.current_company || 'Unknown'}
- Title: ${contact.current_title || 'Unknown'}
- Industry: ${contact.industry || 'Unknown'}
- How we met: ${contact.how_we_met || 'Unknown'}
- Last contacted: ${contact.last_contacted_at || contact.created_at}
- Days since last contact: ${daysSinceContact}
- Relationship type: ${contact.relationship_type || 'Professional'}
- Mutual interests: ${contact.personal_interests || 'Unknown'}

Generate a warm, professional message that:
1. References something specific about the contact or your relationship
2. Is genuine and not overly formal
3. Suggests a specific action (coffee chat, quick call, etc.)
4. Is concise (2-3 paragraphs max)
5. Feels natural and personalized

Return ONLY the message text, no subject line.`;

      try {
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
          console.error("AI API error for contact", contact.id);
          continue;
        }

        const aiData = await response.json();
        const aiMessage = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Find matching template
        const matchingTemplate = templates?.find(t => t.template_type === templateType);

        remindersToCreate.push({
          user_id: user.id,
          contact_id: contact.id,
          reminder_type: reminderType,
          reminder_date: new Date().toISOString(),
          priority: daysSinceContact > 60 ? "high" : daysSinceContact > 30 ? "medium" : "low",
          suggested_action: `Reach out to ${contact.first_name} ${contact.last_name}`,
          ai_generated_message: aiMessage,
          template_type: templateType,
          template_content: matchingTemplate?.message_template || null,
          context_data: {
            last_contact_days_ago: daysSinceContact,
            relationship_type: contact.relationship_type,
            contact_company: contact.current_company,
            contact_title: contact.current_title,
          },
        });
      } catch (error) {
        console.error("Error generating message for contact", contact.id, error);
      }
    }

    // Insert reminders
    const { data: insertedReminders, error: insertError } = await supabase
      .from("relationship_maintenance_reminders")
      .insert(remindersToCreate)
      .select();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ 
        message: `Generated ${insertedReminders?.length || 0} reminders`,
        reminders: insertedReminders 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-relationship-reminders:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});