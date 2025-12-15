import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mentorEmail, mentorName, messageText, invitationId, senderName } = await req.json();

    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '465');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');
    const emailFrom = Deno.env.get('EMAIL_FROM');

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.log('SMTP not configured, skipping email');
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const displayName = mentorName || 'there';
    const fromName = senderName || 'your mentoring connection';
    
    // Include invitation ID in subject for reply tracking
    const subjectWithId = `New Message from ${fromName} [REL-${invitationId}]`;
    
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:8080';
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Message from ${fromName}</h2>
        <p>Hi ${displayName},</p>
        <p>You have received a new message:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; white-space: pre-wrap;">${messageText}</p>
        </div>
        <p><strong>To reply to this message, please log in to your account.</strong></p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/login" style="display: inline-block; background-color: #D4AF37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 10px;">Log In</a>
          <a href="${appUrl}/register" style="display: inline-block; background-color: transparent; color: #D4AF37; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; border: 2px solid #D4AF37;">Register</a>
        </div>
        <p>Best regards,<br>The Career Platform Team</p>
      </div>
    `;

    const emailText = `
Hi ${displayName},

You have received a new message from ${fromName}:

"${messageText}"

To reply to this message, please log in to your account at: ${appUrl}/login

Best regards,
The Career Platform Team
    `;

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    await client.send({
      from: emailFrom || smtpUser,
      to: mentorEmail,
      subject: subjectWithId,
      content: emailText,
      html: emailHtml,
    });

    await client.close();

    console.log('Message email sent to:', mentorEmail, 'with subject:', subjectWithId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error sending message email:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
