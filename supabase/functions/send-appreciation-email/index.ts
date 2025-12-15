import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      recipientEmail, 
      recipientName,
      senderName,
      appreciationType,
      message,
      subject
    } = await req.json();

    console.log("Sending appreciation email to:", recipientEmail);

    if (!recipientEmail) {
      throw new Error('Recipient email is required');
    }

    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '465');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');
    const smtpSecure = Deno.env.get('SMTP_SECURE') === 'true';
    const emailFrom = Deno.env.get('EMAIL_FROM') || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.error('SMTP not configured');
      throw new Error('SMTP configuration missing');
    }

    // Generate subject based on appreciation type if not provided
    const emailSubject = subject || getSubjectForType(appreciationType, senderName);

    // Format message as HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .message { background: white; padding: 20px; border-radius: 8px; white-space: pre-wrap; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${getHeaderForType(appreciationType)}</h2>
          </div>
          <div class="content">
            <p>Dear ${recipientName || 'Valued Contact'},</p>
            <div class="message">${message}</div>
          </div>
          <div class="footer">
            <p>Sent with appreciation from ${senderName || 'Your Contact'}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: smtpSecure,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    await client.send({
      from: emailFrom || smtpUser,
      to: recipientEmail,
      subject: emailSubject,
      content: message,
      html: htmlContent,
    });
    await client.close();

    console.log("Appreciation email sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error sending appreciation email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getSubjectForType(type: string, senderName: string): string {
  const subjects: Record<string, string> = {
    thank_you_note: `A Thank You from ${senderName || 'Me'}`,
    gift: `A Small Token of Appreciation from ${senderName || 'Me'}`,
    update: `Career Update from ${senderName || 'Your Contact'}`,
    recommendation: `LinkedIn Recommendation Request`,
  };
  return subjects[type] || `Message from ${senderName || 'Your Contact'}`;
}

function getHeaderForType(type: string): string {
  const headers: Record<string, string> = {
    thank_you_note: '💝 Thank You!',
    gift: '🎁 A Gift For You',
    update: '📈 Career Update',
    recommendation: '🤝 Recommendation Request',
  };
  return headers[type] || '💌 A Message For You';
}
