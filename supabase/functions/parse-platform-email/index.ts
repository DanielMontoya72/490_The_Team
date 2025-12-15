import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Platform detection patterns
const PLATFORM_PATTERNS = {
  linkedin: {
    fromPatterns: [/@linkedin\.com$/i, /linkedin/i],
    subjectPatterns: [/your application/i, /applied to/i, /job alert/i, /congratulations/i],
    extractors: {
      jobTitle: /applied (?:for|to) (?:the )?(.+?) (?:position|role|job)/i,
      company: /at ([^.!,]+)/i,
      location: /(?:Location|in): ([^.!,\n]+)/i,
    }
  },
  indeed: {
    fromPatterns: [/@indeed\.com$/i, /indeed/i],
    subjectPatterns: [/application/i, /applied/i, /interview/i],
    extractors: {
      jobTitle: /applied (?:for|to) (.+?) at/i,
      company: /at ([^.!,]+)/i,
      location: /(?:Location|in): ([^.!,\n]+)/i,
    }
  },
  glassdoor: {
    fromPatterns: [/@glassdoor\.com$/i, /glassdoor/i],
    subjectPatterns: [/application/i, /applied/i, /job/i],
    extractors: {
      jobTitle: /(?:applied for|position): (.+?)(?:\s+at|\s+-|$)/i,
      company: /(?:at|company): ([^.!,\n]+)/i,
      location: /(?:Location|in): ([^.!,\n]+)/i,
    }
  },
  ziprecruiter: {
    fromPatterns: [/@ziprecruiter\.com$/i, /ziprecruiter/i],
    subjectPatterns: [/application/i, /applied/i],
    extractors: {
      jobTitle: /applied (?:for|to) (.+?) at/i,
      company: /at ([^.!,]+)/i,
      location: /(?:Location|in): ([^.!,\n]+)/i,
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

function extractJobDetails(platform: string, subject: string, body: string) {
  const patterns = PLATFORM_PATTERNS[platform as keyof typeof PLATFORM_PATTERNS];
  if (!patterns) return null;

  const combinedText = `${subject} ${body}`;
  
  const jobTitleMatch = combinedText.match(patterns.extractors.jobTitle);
  const companyMatch = combinedText.match(patterns.extractors.company);
  const locationMatch = combinedText.match(patterns.extractors.location);

  return {
    jobTitle: jobTitleMatch?.[1]?.trim() || null,
    company: companyMatch?.[1]?.trim() || null,
    location: locationMatch?.[1]?.trim() || null,
  };
}

function classifyEmailType(subject: string, body: string): string {
  const text = `${subject} ${body}`.toLowerCase();
  
  if (/interview|schedule|meet/i.test(text)) return 'interview_invitation';
  if (/offer|congratulations.*position|accepted/i.test(text)) return 'offer';
  if (/unfortunately|regret|not moving forward|other candidates/i.test(text)) return 'rejection';
  if (/received|submitted|confirmation/i.test(text)) return 'confirmation';
  if (/update|status/i.test(text)) return 'status_update';
  
  return 'application_confirmation';
}

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

    const { fromEmail, subject, body, rawContent } = await req.json();

    // Detect platform
    const platform = detectPlatform(fromEmail, subject);
    if (!platform) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Could not detect job platform from email" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract job details
    const details = extractJobDetails(platform, subject, body);
    const emailType = classifyEmailType(subject, body);

    // Check for existing job with same title and company
    let existingJobId = null;
    let isDuplicate = false;

    if (details?.jobTitle && details?.company) {
      const { data: existingJobs } = await supabase
        .from("jobs")
        .select("id, primary_platform, platform_count")
        .eq("user_id", user.id)
        .ilike("job_title", `%${details.jobTitle}%`)
        .ilike("company_name", `%${details.company}%`);

      if (existingJobs && existingJobs.length > 0) {
        existingJobId = existingJobs[0].id;
        isDuplicate = true;

        // Check if this platform is already tracked
        const { data: existingPlatform } = await supabase
          .from("application_platforms")
          .select("id")
          .eq("job_id", existingJobId)
          .eq("platform_name", platform)
          .single();

        if (!existingPlatform) {
          // Add new platform to existing job
          await supabase.from("application_platforms").insert({
            user_id: user.id,
            job_id: existingJobId,
            platform_name: platform,
            platform_status: emailType,
            imported_from_email: true,
            platform_data: { subject, fromEmail, emailType }
          });

          // Update platform count
          const currentCount = existingJobs[0].platform_count || 1;
          await supabase
            .from("jobs")
            .update({ platform_count: currentCount + 1 })
            .eq("id", existingJobId);
        }
      }
    }

    // If no existing job, create pending import
    if (!existingJobId && details?.jobTitle) {
      const { data: pendingImport } = await supabase
        .from("pending_application_imports")
        .insert({
          user_id: user.id,
          platform_name: platform,
          extracted_job_title: details.jobTitle,
          extracted_company: details.company,
          extracted_location: details.location,
          email_subject: subject,
          email_from: fromEmail,
          raw_email_content: rawContent || body,
          import_status: "pending"
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          action: "pending_review",
          pendingImport,
          extractedDetails: details,
          platform,
          emailType
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: isDuplicate ? "merged_with_existing" : "created",
        jobId: existingJobId,
        extractedDetails: details,
        platform,
        emailType,
        isDuplicate
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error parsing platform email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to parse email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
