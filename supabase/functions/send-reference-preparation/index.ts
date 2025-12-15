import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  requestId: string;
  recipientEmail: string;
  recipientName: string;
  companyName: string;
  roleTitle: string;
  talkingPoints: string[];
  preparationMaterials: {
    roleContext?: string;
    companyContext?: string;
    suggestedQuestions?: string[];
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientEmail, recipientName, companyName, roleTitle, talkingPoints, preparationMaterials }: RequestBody = await req.json();

    console.log("Sending preparation materials to:", recipientEmail);

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = Deno.env.get("SMTP_PORT");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    const smtpSecure = Deno.env.get("SMTP_SECURE") === "true";
    const emailFrom = Deno.env.get("EMAIL_FROM") || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error("SMTP credentials not configured");
    }

    const talkingPointsHtml = talkingPoints.length > 0 
      ? `<ul style="margin: 0; padding-left: 20px;">${talkingPoints.map(p => `<li style="margin-bottom: 8px;">${p}</li>`).join("")}</ul>`
      : "<p>No specific talking points provided.</p>";

    const questionsHtml = preparationMaterials.suggestedQuestions && preparationMaterials.suggestedQuestions.length > 0
      ? `<ul style="margin: 0; padding-left: 20px;">${preparationMaterials.suggestedQuestions.map(q => `<li style="margin-bottom: 8px;">${q}</li>`).join("")}</ul>`
      : "";

    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reference Preparation</title></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;"><h1 style="color: white; margin: 0; font-size: 24px;">Reference Preparation Guide</h1></div><div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;"><p style="font-size: 16px;">Dear ${recipientName},</p><p>Thank you for agreeing to serve as a reference! Here is some helpful information to prepare for the reference check.</p><div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;"><p style="margin: 0 0 10px 0;"><strong>Position:</strong> ${roleTitle || "Not specified"}</p><p style="margin: 0;"><strong>Company:</strong> ${companyName || "Not specified"}</p></div>${preparationMaterials.roleContext ? `<div style="margin: 20px 0;"><h3 style="color: #667eea; margin-bottom: 10px;">About the Role</h3><p>${preparationMaterials.roleContext}</p></div>` : ""}${preparationMaterials.companyContext ? `<div style="margin: 20px 0;"><h3 style="color: #667eea; margin-bottom: 10px;">Company Context</h3><p>${preparationMaterials.companyContext}</p></div>` : ""}<div style="margin: 20px 0;"><h3 style="color: #667eea; margin-bottom: 10px;">Key Points to Highlight</h3>${talkingPointsHtml}</div>${questionsHtml ? `<div style="margin: 20px 0;"><h3 style="color: #667eea; margin-bottom: 10px;">Questions You May Be Asked</h3>${questionsHtml}</div>` : ""}<p style="color: #666; font-size: 14px; margin-top: 30px;">Thank you again for your support!</p></div><div style="background: #333; color: #fff; padding: 15px; border-radius: 0 0 10px 10px; text-align: center; font-size: 12px;"><p style="margin: 0;">This email was sent via ATS Platform</p></div></body></html>`;

    const SMTPClient = (await import("https://deno.land/x/denomailer@1.6.0/mod.ts")).SMTPClient;
    
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: parseInt(smtpPort || "465"),
        tls: smtpSecure,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    const cleanHtml = htmlContent.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();

    await client.send({
      from: emailFrom || smtpUser,
      to: recipientEmail,
      subject: `Reference Preparation Guide - ${roleTitle || "Job Application"}`,
      content: "Please view this email in an HTML-capable email client.",
      html: cleanHtml,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Content-Transfer-Encoding": "8bit",
      },
    });

    await client.close();

    console.log("Preparation email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending preparation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
