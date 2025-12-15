import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MessageRequest {
  contactId: string;
  subject: string;
  message: string;
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

    const { contactId, subject, message }: MessageRequest = await req.json();

    if (!contactId || !subject || !message) {
      return new Response(
        JSON.stringify({ error: 'Contact ID, subject, and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to find contact in professional_contacts first
    let contact: any = null;
    let contactTable = 'professional_contacts';
    
    const { data: professionalContact } = await supabase
      .from('professional_contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (professionalContact) {
      contact = professionalContact;
    } else {
      // If not found in professional_contacts, try contact_suggestions
      const { data: suggestionContact } = await supabase
        .from('contact_suggestions')
        .select('*')
        .eq('id', contactId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (suggestionContact) {
        contact = suggestionContact;
        contactTable = 'contact_suggestions';
      }
    }

    if (!contact) {
      console.error('Contact not found for ID:', contactId, 'User:', user.id);
      throw new Error('Contact not found');
    }

    // Get contact name - handle both professional_contacts and contact_suggestions
    const contactName = contact.first_name && contact.last_name 
      ? `${contact.first_name} ${contact.last_name}`
      : contact.contact_name || 'Contact';

    // Use fallback email for any contact without an email (including discovery contacts that were auto-imported)
    let recipientEmail = contact.email;
    if (!recipientEmail) {
      recipientEmail = 'theteamnjit5@gmail.com';
      console.log('Using fallback email for contact without email:', contactId, contactName);
    }

    // Get sender profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    const senderName = profile ? `${profile.first_name} ${profile.last_name}` : user.email;
    const senderEmail = user.email || 'theteamnjit5@gmail.com';

    // Format the message into clean HTML
    const messageParagraphs = message
      .split('\n\n')
      .filter(para => para.trim())
      .map(para => `<p style="margin: 0 0 16px 0;">${para.replace(/\n/g, '<br>')}</p>`)
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
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

    // Configure SMTP client with Gmail
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

    // Send email using Gmail SMTP
    await client.send({
      from: (Deno.env.get("EMAIL_FROM") || Deno.env.get("SMTP_USER")!).trim(),
      to: recipientEmail,
      subject: subject,
      content: "auto",
      html: htmlContent,
    });

    await client.close();

    console.log('Email sent successfully via Gmail SMTP to:', recipientEmail);

    // Update contact's last_contacted_at or contacted_at timestamp based on the table
    if (contactTable === 'professional_contacts') {
      const { error: updateError } = await supabase
        .from('professional_contacts')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', contactId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating last_contacted_at:', updateError);
      } else {
        console.log('Updated last_contacted_at for professional contact:', contactId);
      }
    } else {
      // For contact_suggestions, update contacted_at and status
      const { error: updateError } = await supabase
        .from('contact_suggestions')
        .update({ 
          contacted_at: new Date().toISOString(),
          status: 'contacted'
        })
        .eq('id', contactId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating contacted_at:', updateError);
      } else {
        console.log('Updated contacted_at and status for contact suggestion:', contactId);
      }

      // Update metrics
      const today = new Date().toISOString().split('T')[0];
      const { data: currentMetrics } = await supabase
        .from('contact_discovery_metrics')
        .select('contacts_reached_out')
        .eq('user_id', user.id)
        .eq('metric_date', today)
        .maybeSingle();

      const { error: metricsError } = await supabase
        .from('contact_discovery_metrics')
        .upsert({
          user_id: user.id,
          metric_date: today,
          contacts_reached_out: (currentMetrics?.contacts_reached_out || 0) + 1
        }, {
          onConflict: 'user_id,metric_date'
        });

      if (metricsError) {
        console.error('Error updating metrics:', metricsError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Message sent successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-relationship-message function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
