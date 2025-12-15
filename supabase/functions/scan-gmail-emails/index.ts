import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JOB_RELATED_KEYWORDS = [
  "interview", "application", "job", "position", "offer", "recruiter",
  "hiring", "candidate", "resume", "opportunity", "salary", "role",
  "screening", "assessment", "onboarding", "rejection", "unfortunately"
];

function classifyEmail(subject: string, snippet: string): { type: string; suggestedStatus: string | null } {
  const text = `${subject} ${snippet}`.toLowerCase();
  
  if (text.includes("interview") && (text.includes("schedule") || text.includes("invite") || text.includes("confirm"))) {
    return { type: "interview_invitation", suggestedStatus: "interviewing" };
  }
  if (text.includes("offer") && (text.includes("extend") || text.includes("pleased") || text.includes("congratulations"))) {
    return { type: "offer", suggestedStatus: "offer" };
  }
  if (text.includes("unfortunately") || text.includes("regret") || text.includes("not moving forward") || text.includes("decided not to proceed")) {
    return { type: "rejection", suggestedStatus: "rejected" };
  }
  if (text.includes("application") && (text.includes("received") || text.includes("submitted") || text.includes("thank you"))) {
    return { type: "status_update", suggestedStatus: null };
  }
  if (text.includes("recruiter") || text.includes("opportunity") || text.includes("interested in your profile")) {
    return { type: "recruiter_outreach", suggestedStatus: null };
  }
  if (text.includes("follow up") || text.includes("following up") || text.includes("checking in")) {
    return { type: "follow_up", suggestedStatus: null };
  }
  
  return { type: "other", suggestedStatus: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "") || "";
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Get Gmail integration
    const { data: integration, error: integrationError } = await supabase
      .from("gmail_integrations")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (integrationError || !integration) {
      throw new Error("Gmail not connected. Please connect your Gmail account first.");
    }

    if (!integration.scanning_enabled) {
      throw new Error("Email scanning is disabled. Enable it in settings.");
    }

    let accessToken = integration.gmail_access_token;

    // Check if token is expired and refresh if needed
    if (new Date(integration.token_expires_at) <= new Date()) {
      console.log("Token expired, refreshing...");
      
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: integration.gmail_refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error("Failed to refresh token. Please reconnect your Gmail account.");
      }

      const tokens = await refreshResponse.json();
      accessToken = tokens.access_token;
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      await supabase
        .from("gmail_integrations")
        .update({
          gmail_access_token: accessToken,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }

    // Build Gmail search query
    const searchQuery = JOB_RELATED_KEYWORDS.map(k => `"${k}"`).join(" OR ");
    
    // Fetch emails from last 30 days
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const query = `(${searchQuery}) after:${thirtyDaysAgo}`;

    const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    listUrl.searchParams.set("q", query);
    listUrl.searchParams.set("maxResults", "50");

    const listResponse = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error("Gmail API error:", errorText);
      throw new Error("Failed to fetch emails from Gmail");
    }

    const listData = await listResponse.json();
    const messages = listData.messages || [];
    
    console.log(`Found ${messages.length} potential job-related emails`);

    const newEmails = [];

    for (const msg of messages.slice(0, 25)) { // Limit to 25 for rate limiting
      // Check if already processed
      const { data: existing } = await supabase
        .from("application_emails")
        .select("id")
        .eq("user_id", user.id)
        .eq("gmail_message_id", msg.id)
        .single();

      if (existing) continue;

      // Fetch full message
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!msgResponse.ok) continue;

      const msgData = await msgResponse.json();
      const headers = msgData.payload?.headers || [];
      
      const getHeader = (name: string) => 
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

      const subject = getHeader("Subject");
      const from = getHeader("From");
      const date = getHeader("Date");

      // Parse from field
      const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/) || [null, from, from];
      const fromName = fromMatch[1]?.trim().replace(/"/g, "") || "";
      const fromEmail = fromMatch[2]?.trim() || from;

      const snippet = msgData.snippet || "";
      
      // Classify email
      const { type, suggestedStatus } = classifyEmail(subject, snippet);

      // Get email body
      let rawContent = "";
      if (msgData.payload?.body?.data) {
        rawContent = atob(msgData.payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
      } else if (msgData.payload?.parts) {
        const textPart = msgData.payload.parts.find((p: any) => p.mimeType === "text/plain");
        if (textPart?.body?.data) {
          rawContent = atob(textPart.body.data.replace(/-/g, "+").replace(/_/g, "/"));
        }
      }

      const emailRecord = {
        user_id: user.id,
        gmail_message_id: msg.id,
        from_email: fromEmail,
        from_name: fromName,
        subject,
        snippet,
        received_at: new Date(date).toISOString(),
        email_type: type,
        suggested_status: suggestedStatus,
        raw_content: rawContent.substring(0, 5000), // Limit content size
        is_processed: false,
      };

      const { error: insertError } = await supabase
        .from("application_emails")
        .insert(emailRecord);

      if (!insertError) {
        newEmails.push(emailRecord);
      }
    }

    // Update last scan time
    await supabase
      .from("gmail_integrations")
      .update({ last_scan_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        success: true,
        scanned: messages.length,
        newEmails: newEmails.length,
        emails: newEmails,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error scanning emails:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to scan emails" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
