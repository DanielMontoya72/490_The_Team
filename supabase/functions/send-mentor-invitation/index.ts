import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the app URL from request headers
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/');
    const appUrl = origin || Deno.env.get("APP_URL") || 'https://490-the-team.vercel.app/';

    const { mentorEmail, mentorName, message, userId } = await req.json();

    // Generate invitation token
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('mentor_invitations')
      .insert({
        user_id: userId,
        mentor_email: mentorEmail,
        mentor_name: mentorName,
        invitation_token: invitationToken,
        message: message,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (inviteError) throw inviteError;

    // Create in-app notification for the mentee that invitation was sent
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Mentor Invitation Sent',
        message: `Your invitation to ${mentorName || mentorEmail} has been sent. You'll be notified when they respond.`,
        type: 'mentor_invitation_sent',
        link: '/networking',
        is_read: false
      });

    console.log('In-app notification created for invitation sent');

    // Get user profile for email
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, email')
      .eq('user_id', userId)
      .single();

    const senderName = profile ? `${profile.first_name} ${profile.last_name}` : 'A user';

    // Send invitation email via SMTP
    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '465');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');
    const emailFrom = Deno.env.get('EMAIL_FROM');

    if (smtpHost && smtpUser && smtpPass) {
      const acceptUrl = `${appUrl}/mentors/accept?token=${invitationToken}`;
      
      const emailHtml = `
        <h2>Mentor Invitation from ${senderName}</h2>
        <p>You've been invited to become a mentor for ${senderName}'s job search journey.</p>
        ${message ? `<p><strong>Personal message:</strong> ${message}</p>` : ''}
        <p>As a mentor, you'll be able to:</p>
        <ul>
          <li>View their job search progress</li>
          <li>Provide feedback and guidance</li>
          <li>Track their application journey</li>
          <li>Communicate securely within the platform</li>
        </ul>
        <p><a href="${acceptUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a></p>
        <p>This invitation expires in 7 days.</p>
      `;

      const emailText = `
Mentor Invitation from ${senderName}

You've been invited to become a mentor for ${senderName}'s job search journey.

${message ? `Personal message: ${message}\n\n` : ''}
As a mentor, you'll be able to:
- View their job search progress
- Provide feedback and guidance
- Track their application journey
- Communicate securely within the platform

Accept the invitation by visiting: ${acceptUrl}

This invitation expires in 7 days.
      `;

      try {
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
          subject: `Mentor Invitation from ${senderName}`,
          content: emailText,
          html: emailHtml,
        });

        await client.close();
      } catch (error) {
        console.error('Failed to send email:', error);
      }
    }

    return new Response(JSON.stringify({ success: true, invitation }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
