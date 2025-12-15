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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the auto-archive threshold (3 months = 90 days of inactivity)
    const autoArchiveMonths = 3;
    const autoArchiveDays = 90; // 3 months
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - autoArchiveDays);

    console.log(`Auto-archiving jobs with no activity since ${thresholdDate.toISOString()} (${autoArchiveMonths} months)`);

    // Find jobs that should be auto-archived:
    // - Status is "Rejected" or "No Response" for more than 3 months (90 days)
    // - Not already archived
    const { data: jobsToArchive, error: fetchError } = await supabase
      .from("jobs")
      .select("id, job_title, company_name, status, updated_at")
      .eq("is_archived", false)
      .in("status", ["Rejected", "No Response"])
      .lt("updated_at", thresholdDate.toISOString());

    if (fetchError) {
      console.error("Error fetching jobs:", fetchError);
      throw fetchError;
    }

    if (!jobsToArchive || jobsToArchive.length === 0) {
      console.log("No jobs to auto-archive");
      return new Response(
        JSON.stringify({ 
          message: "No jobs to archive",
          archived_count: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${jobsToArchive.length} jobs to auto-archive`);

    // Archive the jobs
    const jobIds = jobsToArchive.map(j => j.id);
    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        archive_reason: `auto_archived_after_3_months_of_inactivity`,
      })
      .in("id", jobIds);

    if (updateError) {
      console.error("Error archiving jobs:", updateError);
      throw updateError;
    }

    console.log(`Successfully auto-archived ${jobsToArchive.length} jobs`);

    return new Response(
      JSON.stringify({
        message: `Successfully auto-archived ${jobsToArchive.length} job(s)`,
        archived_count: jobsToArchive.length,
        archived_jobs: jobsToArchive.map(j => ({
          id: j.id,
          title: j.job_title,
          company: j.company_name,
          status: j.status,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in auto-archive-jobs:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
