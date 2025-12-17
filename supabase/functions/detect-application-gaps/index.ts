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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    const { data: { user } } = await supabase.auth.getUser(
      authHeader?.replace("Bearer ", "") || ""
    );

    if (!user) {
      throw new Error("Unauthorized");
    }

    // Get all application emails
    const { data: emails } = await supabase
      .from("application_emails")
      .select("*")
      .eq("user_id", user.id)
      .is("job_id", null)
      .order("received_at", { ascending: false });

    // Get all tracked jobs
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, job_title, company_name, created_at")
      .eq("user_id", user.id);

    // Get pending imports
    const { data: pendingImports } = await supabase
      .from("pending_application_imports")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending");

    // Analyze gaps - emails that mention jobs not in our system
    const gaps: any[] = [];
    const trackedCompanies = new Set(jobs?.map(j => j.company_name?.toLowerCase()) || []);

    emails?.forEach(email => {
      // Check if email mentions a company we're not tracking
      const companyMentions = email.from_name?.toLowerCase() || email.from_email?.toLowerCase() || "";
      
      // Look for company patterns in email
      const commonPatterns = [
        /thank you for (?:your )?(?:interest|applying) (?:in|to|at) ([^.!,]+)/i,
        /application (?:to|at|for) ([^.!,]+)/i,
        /interview (?:with|at) ([^.!,]+)/i,
      ];

      for (const pattern of commonPatterns) {
        const match = (email.subject + " " + email.snippet).match(pattern);
        if (match) {
          const mentionedCompany = match[1].trim().toLowerCase();
          if (!trackedCompanies.has(mentionedCompany)) {
            gaps.push({
              type: "untracked_company",
              source: "email",
              emailId: email.id,
              subject: email.subject,
              snippet: email.snippet,
              suggestedCompany: match[1].trim(),
              receivedAt: email.received_at,
              fromEmail: email.from_email
            });
          }
        }
      }
    });

    // Add pending imports as potential gaps
    pendingImports?.forEach(pending => {
      gaps.push({
        type: "pending_import",
        source: "platform_email",
        pendingId: pending.id,
        platform: pending.platform_name,
        suggestedJobTitle: pending.job_title,
        suggestedCompany: pending.company_name,
        suggestedLocation: pending.location,
        receivedAt: pending.created_at,
      });
    });

    return new Response(
      JSON.stringify({
        success: true,
        gaps,
        summary: {
          totalGaps: gaps.length,
          pendingImports: pendingImports?.length || 0,
          untrackedMentions: gaps.filter(g => g.type === "untracked_company").length
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error detecting gaps:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to detect gaps" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
