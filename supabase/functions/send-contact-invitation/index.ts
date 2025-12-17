import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

    const {
      data: { user },
    } = await supabase.auth.getUser(req.headers.get("Authorization")?.replace("Bearer ", "") || "");

    if (!user) {
      throw new Error("Unauthorized");
    }

    const { contactId, personalMessage } = await req.json();

    // Get contact details
    const { data: contact, error: contactError } = await supabase
      .from("contact_suggestions")
      .select("*")
      .eq("id", contactId)
      .single();

    if (contactError) throw contactError;

    // Get user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("first_name, last_name, email")
      .eq("user_id", user.id)
      .single();

    const senderName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "A professional";

    // Configure SMTP client with Gmail
    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get("SMTP_HOST") || "smtp.gmail.com",
        port: parseInt(Deno.env.get("SMTP_PORT") || "465"),
        tls: Deno.env.get("SMTP_SECURE") === "true",
        auth: {
          username: Deno.env.get("SMTP_USER")!,
          password: Deno.env.get("SMTP_PASS")!,
        },
      },
    });

    // Compose email
    const emailSubject = `Let's Connect - ${senderName}`;
    const emailBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .message { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
    .cta { text-align: center; margin: 30px 0; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Professional Connection Request</h1>
    </div>
    <div class="content">
      <p>Hi ${contact.contact_name},</p>
      
      <p>I hope this message finds you well. I came across your profile and was impressed by your work at ${contact.contact_company || "your company"}.</p>
      
      ${personalMessage ? `
        <div class="message">
          <p>${personalMessage}</p>
        </div>
      ` : ""}
      
      <p>I believe we could benefit from connecting and potentially exploring opportunities for collaboration or knowledge sharing in our industry.</p>
      
      <div class="cta">
        <a href="${contact.linkedin_url || "#"}" class="button">Connect on LinkedIn</a>
      </div>
      
      <p>Looking forward to connecting with you!</p>
      
      <p>Best regards,<br>
      ${senderName}${profile?.email ? `<br><a href="mailto:${profile.email}">${profile.email}</a>` : ""}</p>
      
      <div class="footer">
        <p>This is a professional networking invitation sent through our platform.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    // Send email
    await client.send({
      from: Deno.env.get("EMAIL_FROM") || Deno.env.get("SMTP_USER")!,
      to: contact.email || contact.contact_name,
      subject: emailSubject,
      content: "auto",
      html: emailBody,
    });

    await client.close();

    // Update contact status
    await supabase
      .from("contact_suggestions")
      .update({
        status: "contacted",
        contacted_at: new Date().toISOString(),
      })
      .eq("id", contactId);

    return new Response(
      JSON.stringify({ success: true, message: "Invitation sent successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending invitation:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to send invitation",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
