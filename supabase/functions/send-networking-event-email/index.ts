import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  message: string;
  connectionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { recipientEmail, recipientName, subject, message, connectionId }: EmailRequest = await req.json();

    if (!recipientEmail || !subject || !message) {
      return new Response(
        JSON.stringify({ error: 'Recipient email, subject, and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get sender profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const senderName = profile ? `${profile.first_name} ${profile.last_name}` : user.email;

    // Format the message into clean HTML
    const messageParagraphs = message
      .split('\n\n')
      .filter(para => para.trim())
      .map(para => `<p style="margin: 0 0 16px 0;">${para.replace(/\n/g, '<br>')}</p>`)
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              ${messageParagraphs}
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                  Best regards,<br>
                  <strong style="color: #111827;">${senderName}</strong>
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Configure SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: (Deno.env.get("SMTP_HOST") || "smtp.gmail.com").trim(),
        port: parseInt((Deno.env.get("SMTP_PORT") || "465").trim()),
        tls: (Deno.env.get("SMTP_SECURE") || "true").trim() === "true",
        auth: {
          username: Deno.env.get("SMTP_USER")!.trim(),
          password: Deno.env.get("SMTP_PASS")!.trim(),
        },
      },
    });

    // Send email
    await client.send({
      from: (Deno.env.get("EMAIL_FROM") || Deno.env.get("SMTP_USER")!).trim(),
      to: recipientEmail,
      subject: subject,
      content: "auto",
      html: htmlContent,
    });

    await client.close();

    console.log('Email sent successfully to:', recipientEmail);

    // Update connection follow-up status
    if (connectionId) {
      const { error: updateError } = await supabase
        .from('networking_event_connections')
        .update({ 
          follow_up_completed: true,
          follow_up_date: new Date().toISOString()
        })
        .eq('id', connectionId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating connection:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-networking-event-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
