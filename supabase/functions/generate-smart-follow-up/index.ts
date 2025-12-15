import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Timing rules based on application stage
const TIMING_RULES: Record<string, { days: number; description: string }> = {
  'applied': { days: 7, description: '1 week after application' },
  'interested': { days: 5, description: '5 days after showing interest' },
  'phone_screen': { days: 3, description: '3 days after phone screen' },
  'interviewing': { days: 3, description: '3 days after interview' },
  'technical': { days: 3, description: '3 days after technical interview' },
  'final_round': { days: 2, description: '2 days after final round' },
  'offer': { days: 1, description: '1 day after receiving offer' },
};

// Etiquette tips by stage
const ETIQUETTE_TIPS: Record<string, string[]> = {
  'applied': [
    'Keep your follow-up brief and professional',
    'Reference the specific position you applied for',
    'Express continued interest without being pushy',
    'Avoid following up more than twice before hearing back',
  ],
  'interested': [
    'Thank them for their interest in your application',
    'Confirm your availability for next steps',
    'Prepare questions about the role and company',
  ],
  'phone_screen': [
    'Send a thank-you within 24 hours of the call',
    'Reference specific topics discussed',
    'Reiterate your enthusiasm for the opportunity',
    'Ask about the timeline for next steps',
  ],
  'interviewing': [
    'Personalize your thank-you to each interviewer',
    'Reference specific conversation points',
    'Address any concerns that came up',
    'Keep it concise - 3-4 paragraphs max',
  ],
  'technical': [
    'Thank the technical team for their time',
    'Briefly highlight your technical approach',
    'Express enthusiasm for the technical challenges',
    'Avoid re-explaining your solution in detail',
  ],
  'final_round': [
    'Express strong interest in joining the team',
    'Reference conversations with leadership',
    'Reaffirm your value proposition',
    'Be patient - final decisions take time',
  ],
  'offer': [
    'Express gratitude for the offer',
    'Ask clarifying questions professionally',
    'Take time to review before responding',
    'Negotiate respectfully if needed',
  ],
};

function generateEmailTemplate(stage: string, companyName: string, jobTitle: string, contactName?: string): { subject: string; template: string } {
  const greeting = contactName ? `Dear ${contactName}` : 'Dear Hiring Team';
  
  const templates: Record<string, { subject: string; template: string }> = {
    'applied': {
      subject: `Following Up: ${jobTitle} Application`,
      template: `${greeting},

I hope this email finds you well. I recently submitted my application for the ${jobTitle} position at ${companyName} and wanted to express my continued interest in this opportunity.

I'm excited about the possibility of contributing to ${companyName} and believe my skills and experience align well with the role's requirements.

I understand you may be reviewing many applications, but I wanted to confirm my application was received and inquire about the timeline for the next steps in the hiring process.

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
[Your Name]`
    },
    'phone_screen': {
      subject: `Thank You - ${jobTitle} Phone Screen`,
      template: `${greeting},

Thank you for taking the time to speak with me about the ${jobTitle} position at ${companyName}. I enjoyed our conversation and learning more about the role and team.

Our discussion reinforced my enthusiasm for this opportunity, and I'm confident that my experience would allow me to make meaningful contributions to your team.

I'm looking forward to the next steps in the process. Please let me know if you need any additional information from me.

Best regards,
[Your Name]`
    },
    'interviewing': {
      subject: `Thank You - ${jobTitle} Interview`,
      template: `${greeting},

Thank you for the opportunity to interview for the ${jobTitle} position at ${companyName}. I truly enjoyed meeting with the team and learning more about the exciting work you're doing.

Our conversation about [specific topic discussed] was particularly engaging, and I'm even more excited about the possibility of contributing to these initiatives.

I'm confident that my background in [relevant experience] would enable me to add value to your team from day one.

Thank you again for your time and consideration. I look forward to hearing about the next steps.

Best regards,
[Your Name]`
    },
    'technical': {
      subject: `Thank You - ${jobTitle} Technical Interview`,
      template: `${greeting},

Thank you for the opportunity to participate in the technical interview for the ${jobTitle} position. I enjoyed working through the challenges and discussing technical approaches with your team.

The problems presented were interesting, and I appreciated the collaborative atmosphere during our session. I'm excited about the technical challenges this role would offer.

Please don't hesitate to reach out if you have any questions about my approach or would like to discuss anything further.

Best regards,
[Your Name]`
    },
    'final_round': {
      subject: `Thank You - ${jobTitle} Final Interview`,
      template: `${greeting},

Thank you for the opportunity to meet with the leadership team for the ${jobTitle} position at ${companyName}. It was a pleasure to learn more about the company's vision and strategic direction.

After our conversations, I'm more excited than ever about the possibility of joining ${companyName} and contributing to your team's success.

I believe my experience and passion for [relevant area] align perfectly with your needs, and I'm confident I could make a positive impact.

I look forward to hearing your decision. Thank you again for this incredible opportunity.

Best regards,
[Your Name]`
    },
    'offer': {
      subject: `Re: ${jobTitle} Offer - Thank You`,
      template: `${greeting},

Thank you so much for extending the offer for the ${jobTitle} position at ${companyName}. I'm honored and excited about this opportunity.

I'm reviewing the offer details and would appreciate if we could schedule a brief call to discuss a few questions I have about [compensation/benefits/start date].

I'm very enthusiastic about joining ${companyName} and look forward to finalizing the details.

Thank you again for this opportunity.

Best regards,
[Your Name]`
    },
  };

  return templates[stage] || templates['applied'];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, userId, stage, companyName, jobTitle, contactName, forceCreate } = await req.json();

    if (!jobId || !userId) {
      throw new Error("Job ID and User ID are required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get job details if not provided
    let jobData = { company: companyName, title: jobTitle, status: stage };
    if (!companyName || !jobTitle || !stage) {
      const { data: job, error: jobError } = await supabaseClient
        .from("jobs")
        .select("company, title, status")
        .eq("id", jobId)
        .single();

      if (jobError) throw jobError;
      jobData = job;
    }

    const applicationStage = stage || jobData.status || 'applied';
    const company = companyName || jobData.company || 'the company';
    const title = jobTitle || jobData.title || 'the position';

    // Check if job is rejected - don't create reminders
    if (applicationStage === 'rejected' || applicationStage === 'withdrawn') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Follow-up reminders are disabled for rejected/withdrawn applications",
          disabled: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing active reminders
    if (!forceCreate) {
      const { data: existingReminders } = await supabaseClient
        .from("smart_follow_up_reminders")
        .select("id")
        .eq("job_id", jobId)
        .eq("is_completed", false)
        .eq("is_dismissed", false);

      if (existingReminders && existingReminders.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Active reminder already exists for this job",
            existing: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Calculate reminder timing
    const timingRule = TIMING_RULES[applicationStage] || TIMING_RULES['applied'];
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + timingRule.days);

    // Generate email template
    const { subject, template } = generateEmailTemplate(
      applicationStage, 
      company, 
      title, 
      contactName
    );

    // Get etiquette tips
    const tips = ETIQUETTE_TIPS[applicationStage] || ETIQUETTE_TIPS['applied'];

    // Determine reminder type based on stage
    const reminderTypeMap: Record<string, string> = {
      'applied': 'application_follow_up',
      'interested': 'interest_confirmation',
      'phone_screen': 'thank_you',
      'interviewing': 'interview_thank_you',
      'technical': 'technical_thank_you',
      'final_round': 'final_round_thank_you',
      'offer': 'offer_response',
    };

    // Create the smart reminder
    const { data: reminder, error: insertError } = await supabaseClient
      .from("smart_follow_up_reminders")
      .insert({
        user_id: userId,
        job_id: jobId,
        application_stage: applicationStage,
        reminder_date: reminderDate.toISOString(),
        reminder_type: reminderTypeMap[applicationStage] || 'application_follow_up',
        suggested_timing: timingRule.description,
        email_subject: subject,
        email_template: template,
        etiquette_tips: tips,
        follow_up_count: 0,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log("Created smart follow-up reminder for job:", jobId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        reminder,
        timing: timingRule,
        tips
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-smart-follow-up:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate reminder" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});