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

// Platform detection patterns (inline to avoid cross-function imports)
const PLATFORM_PATTERNS = {
  linkedin: {
    fromPatterns: [/@linkedin\.com$/i, /linkedin/i, /jobs-noreply@linkedin/i],
    subjectPatterns: [/your application/i, /applied to/i, /job alert/i, /congratulations/i, /was sent to/i, /application for/i],
    extractors: {
      // LinkedIn body format:
      // "CT Technologist\nJobot Consulting · New York, NY (On-site)"
      // Subject format:
      // "Matthew, your application was sent to Jobot Consulting"
      jobTitle: [
        /^([A-Za-z][A-Za-z\s/\-]+?)\n[A-Z]/m, // Job title on its own line followed by company
        /Application for ([^<\n]+?)(?:\s+at|\s*<|$)/i,
        /Your Application for ([^<\n]+?)(?:\s+at|\s*<|$)/i,
        /applied (?:for|to) (?:the )?([^<\n]+?)(?:\s+at|\s+position|\s+role|\s*<|$)/i,
      ],
      company: [
        /(?:was sent to|sent to) ([A-Za-z0-9][^<\n.!?,]+?)(?:\s*<|\.|!|,|$)/i, // "was sent to Jobot Consulting"
        /([A-Z][A-Za-z0-9\s&\-.]+?)\s*[·•]\s*[A-Za-z]/i, // "Jobot Consulting · New York, NY (On-site)"
        /(?:at|to) ([A-Z][^.!?,\n]+?)(?:\.|,|!|\s+Location|\s+Your|\s*$)/i,
      ],
      location: [
        /[·•]\s*([A-Za-z][A-Za-z\s,]+(?:\([^)]+\))?)/i, // "· New York, NY (On-site)"
        /(?:Location|in)[:\s]+([^<\n.!?,]+)/i,
      ],
    }
  },
  indeed: {
    fromPatterns: [/@indeed\.com$/i, /indeed/i, /no-reply@indeed/i],
    subjectPatterns: [/application/i, /applied/i, /interview/i, /submitted/i],
    extractors: {
      jobTitle: [
        /(?:Application Submitted|Applied)[:\s]+([^<\n]+?)\s+at\s+/i,
        /applied (?:for|to) ([^<\n]+?)\s+at\s+/i,
      ],
      company: [
        /at ([A-Za-z0-9][^<\n.!?,]+?)(?:\s*<|\.|!|,|\s+Location|$)/i,
      ],
      location: [
        /Location[:\s]+([^<\n.!?,]+)/i,
      ],
    }
  },
  glassdoor: {
    fromPatterns: [/@glassdoor\.com$/i, /glassdoor/i, /notifications@glassdoor/i],
    subjectPatterns: [/application/i, /applied/i, /job/i, /confirmation/i],
    extractors: {
      jobTitle: [
        /applied for (?:position[:\s]*)?([^<\n]+?)\s+at\s+/i,
        /position[:\s]+([^<\n]+?)\s+at\s+/i,
      ],
      company: [
        /at ([A-Za-z0-9][^<\n.!?,]+?)(?:\s*<|\.|!|,|\s+Location|$)/i,
      ],
      location: [
        /Location[:\s]+([^<\n.!?,]+)/i,
      ],
    }
  },
  ziprecruiter: {
    fromPatterns: [/@ziprecruiter\.com$/i, /ziprecruiter/i],
    subjectPatterns: [/application/i, /applied/i],
    extractors: {
      jobTitle: [
        /applied (?:for|to) ([^<\n]+?)\s+at\s+/i,
      ],
      company: [
        /at ([A-Za-z0-9][^<\n.!?,]+?)(?:\s*<|\.|!|,|\s+Location|$)/i,
      ],
      location: [
        /Location[:\s]+([^<\n.!?,]+)/i,
      ],
    }
  }
};

function detectPlatform(fromEmail: string, subject: string): string | null {
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    const fromMatch = patterns.fromPatterns.some(p => p.test(fromEmail));
    const subjectMatch = patterns.subjectPatterns.some(p => p.test(subject));
    if (fromMatch || subjectMatch) {
      return platform;
    }
  }
  return null;
}

// AI-powered job extraction using Gemini AI
async function extractJobDetailsWithAI(
  platform: string, 
  subject: string, 
  body: string, 
  fromEmail: string
): Promise<{ jobTitle: string | null; company: string | null; location: string | null }> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    
    console.log(`[extractJobDetailsWithAI] Calling AI extraction for platform: ${platform}`);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/extract-job-from-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        subject,
        body,
        fromEmail,
        platform
      }),
    });

    if (!response.ok) {
      console.error(`[extractJobDetailsWithAI] AI extraction failed with status: ${response.status}`);
      return { jobTitle: null, company: null, location: null };
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`[extractJobDetailsWithAI] AI extracted: jobTitle=${result.jobTitle}, company=${result.companyName}, location=${result.location}, confidence=${result.confidence}`);
      return {
        jobTitle: result.jobTitle || null,
        company: result.companyName || null,
        location: result.location || null
      };
    }
    
    console.error(`[extractJobDetailsWithAI] AI extraction returned error:`, result.error);
    return { jobTitle: null, company: null, location: null };
  } catch (error) {
    console.error(`[extractJobDetailsWithAI] Error calling AI extraction:`, error);
    return { jobTitle: null, company: null, location: null };
  }
}

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

async function autoImportPlatformEmail(
  supabase: any,
  userId: string,
  platform: string,
  details: { jobTitle: string | null; company: string | null; location: string | null },
  emailData: { subject: string; fromEmail: string; snippet: string },
  autoImportEnabled: boolean
) {
  // Allow partial data - at minimum need company OR jobTitle (will fill in missing during review)
  if (!details.jobTitle && !details.company) {
    console.log("No job title or company found, creating pending import with raw email data");
    const { data: pendingImport, error: pendingError } = await supabase
      .from("pending_application_imports")
      .insert({
        user_id: userId,
        platform_name: platform,
        job_title: details.jobTitle || `Unknown from ${platform}`,
        company_name: details.company || "Unknown Company",
        location: details.location,
        status: "pending",
        extracted_data: {
          email_subject: emailData.subject,
          email_from: emailData.fromEmail,
          email_snippet: emailData.snippet,
          platform,
        },
      })
      .select()
      .single();

    if (pendingError) {
      console.error("Error creating pending import with partial data:", pendingError);
      return { action: "error", error: pendingError.message };
    }

    console.log(`Created pending import with partial data for ${platform}`);
    return { action: "pending_review", pendingImportId: pendingImport?.id, platform, details };
  }

  // Check for existing job with same title and company
  const { data: existingJobs } = await supabase
    .from("jobs")
    .select("id, primary_platform, platform_count")
    .eq("user_id", userId)
    .ilike("job_title", `%${details.jobTitle}%`)
    .ilike("company_name", `%${details.company}%`);

  if (existingJobs && existingJobs.length > 0) {
    const existingJobId = existingJobs[0].id;

    // Check if this platform is already tracked
    const { data: existingPlatform } = await supabase
      .from("application_platforms")
      .select("id")
      .eq("job_id", existingJobId)
      .eq("platform_name", platform)
      .maybeSingle();

    if (!existingPlatform) {
      // Add new platform to existing job (consolidate duplicate)
      await supabase.from("application_platforms").insert({
        user_id: userId,
        job_id: existingJobId,
        platform_name: platform,
        platform_status: "applied",
        imported_from_email: true,
        platform_data: { subject: emailData.subject, fromEmail: emailData.fromEmail }
      });

      // Update platform count
      const currentCount = existingJobs[0].platform_count || 1;
      await supabase
        .from("jobs")
        .update({ platform_count: currentCount + 1 })
        .eq("id", existingJobId);

      console.log(`Consolidated platform ${platform} into existing job ${existingJobId}`);
      return { action: "consolidated", jobId: existingJobId, platform };
    }

    return { action: "already_tracked", jobId: existingJobId };
  }

  // No existing job found - always create a pending import for user review
  const { data: pendingImport, error: pendingError } = await supabase
    .from("pending_application_imports")
    .insert({
      user_id: userId,
      platform_name: platform,
      job_title: details.jobTitle,
      company_name: details.company,
      location: details.location,
      status: "pending",
      extracted_data: {
        email_subject: emailData.subject,
        email_from: emailData.fromEmail,
        email_snippet: emailData.snippet,
        platform,
      },
    })
    .select()
    .single();

  if (pendingError) {
    console.error("Error creating pending import:", pendingError);
    return { action: "error", error: pendingError.message };
  }

  console.log(`Created pending import for ${platform}: ${details.jobTitle}`);
  return { action: "pending_review", pendingImportId: pendingImport?.id, platform, details };
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

    const autoImportEnabled = integration.auto_import_enabled || false;

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
    const autoImportResults = [];

    for (const msg of messages.slice(0, 25)) { // Limit to 25 for rate limiting
      // Check if already processed
      const { data: existing } = await supabase
        .from("application_emails")
        .select("id")
        .eq("user_id", user.id)
        .eq("gmail_message_id", msg.id)
        .maybeSingle();

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

        // AUTO-IMPORT: Check if this is from a known job platform
        const platform = detectPlatform(fromEmail, subject);
        if (platform) {
          console.log(`Detected platform email from ${platform}: ${subject}`);
          
          // Use AI to extract job details
          const details = await extractJobDetailsWithAI(platform, subject, rawContent || snippet, fromEmail);
          
          if (details) {
            const importResult = await autoImportPlatformEmail(
              supabase,
              user.id,
              platform,
              details,
              { subject, fromEmail, snippet },
              autoImportEnabled
            );
            autoImportResults.push(importResult);
          }
        }
      }
    }

    // Update last scan time
    await supabase
      .from("gmail_integrations")
      .update({ last_scan_at: new Date().toISOString() })
      .eq("user_id", user.id);

    const autoImported = autoImportResults.filter(r => r.action === "auto_imported").length;
    const consolidated = autoImportResults.filter(r => r.action === "consolidated").length;
    const pendingReview = autoImportResults.filter(r => r.action === "pending_review").length;

    return new Response(
      JSON.stringify({
        success: true,
        scanned: messages.length,
        newEmails: newEmails.length,
        emails: newEmails,
        autoImportResults: {
          autoImported,
          consolidated,
          pendingReview,
          details: autoImportResults
        }
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
