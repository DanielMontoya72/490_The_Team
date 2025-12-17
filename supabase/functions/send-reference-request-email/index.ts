import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  requestId: string;
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  companyName: string;
  roleTitle: string;
  requestType: string;
  deadline: string | null;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      requestId,
      recipientEmail, 
      recipientName, 
      senderName,
      companyName,
      roleTitle,
      requestType,
      deadline,
      message 
    }: RequestBody = await req.json();

    console.log("Sending reference request email to:", recipientEmail);

    // Get SMTP credentials from environment
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = Deno.env.get("SMTP_PORT");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    const smtpSecure = Deno.env.get("SMTP_SECURE") === "true";
    const emailFrom = Deno.env.get("EMAIL_FROM") || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error("SMTP credentials not configured");
    }

    // Get the app URL for confirmation links
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:8080";
    
    // Create confirmation/decline URLs
    const confirmUrl = `${appUrl}/reference-response?requestId=${requestId}&action=confirmed`;
    const declineUrl = `${appUrl}/reference-response?requestId=${requestId}&action=declined`;

    const deadlineText = deadline ? `Deadline: ${new Date(deadline).toLocaleDateString()}` : "";
    const requestTypeFormatted = requestType.replace(/_/g, " ");

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reference Request</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Reference Request</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
    <p style="font-size: 16px;">Dear ${recipientName},</p>
    
    <p>${senderName} has requested you to serve as a <strong>${requestTypeFormatted}</strong> reference.</p>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <p style="margin: 0 0 10px 0;"><strong>Position:</strong> ${roleTitle || "Not specified"}</p>
      <p style="margin: 0 0 10px 0;"><strong>Company:</strong> ${companyName || "Not specified"}</p>
      ${deadlineText ? `<p style="margin: 0;"><strong>${deadlineText}</strong></p>` : ""}
    </div>
    
    ${message ? `
    <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; font-style: italic;">"${message}"</p>
    </div>
    ` : ""}
    
    <p style="font-size: 16px; font-weight: bold; margin-top: 30px;">Please confirm if you can provide this reference:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${confirmUrl}" style="display: inline-block; background: #22c55e; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px; font-size: 16px;">✓ Confirm</a>
      <a href="${declineUrl}" style="display: inline-block; background: #ef4444; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px; font-size: 16px;">✗ Decline</a>
    </div>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">Thank you for considering this request. Your support means a lot!</p>
  </div>
  
  <div style="background: #333; color: #fff; padding: 15px; border-radius: 0 0 10px 10px; text-align: center; font-size: 12px;">
    <p style="margin: 0;">This email was sent via ATS Platform</p>
  </div>
</body>
</html>
    `;

    // Send via SMTP using raw SMTP commands to avoid encoding issues
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

    // Remove extra whitespace and newlines from HTML to prevent encoding issues
    const cleanHtml = htmlContent.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();

    await client.send({
      from: emailFrom || smtpUser,
      to: recipientEmail,
      subject: `Reference Request from ${senderName} - ${roleTitle || requestTypeFormatted}`,
      content: "Please view this email in an HTML-capable email client.",
      html: cleanHtml,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Content-Transfer-Encoding": "8bit",
      },
    });

    await client.close();

    console.log("Reference request email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending reference request email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
