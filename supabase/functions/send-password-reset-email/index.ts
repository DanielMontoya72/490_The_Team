import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordResetRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('email', email)
      .single();

    if (profileError || !profiles) {
      console.log('User not found for email:', email);
      // Return success anyway for security (don't reveal if email exists)
      return new Response(
        JSON.stringify({ message: 'If an account exists with that email, a reset link has been sent' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate reset token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token in database
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: profiles.user_id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error('Error storing reset token:', tokenError);
      throw new Error('Failed to generate reset token');
    }

    // Build reset URL
    const resetUrl = `${req.headers.get('origin') || 'http://localhost:8080'}/reset-password?token=${token}`;

    // Configure SMTP client
    const smtpHost = Deno.env.get('SMTP_HOST')!;
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '465');
    const smtpSecure = Deno.env.get('SMTP_SECURE') === 'true';
    const smtpUser = Deno.env.get('SMTP_USER')!;
    const smtpPass = Deno.env.get('SMTP_PASS')!;
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'no-reply@example.com';

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

    // Send email
    await client.send({
      from: emailFrom,
      to: email,
      subject: "Reset your password",
      content: `We received a request to reset your password.

This link is valid for 1 hour:
${resetUrl}

If you didn't request this, you can safely ignore this email.`,
      html: `
        <p>We received a request to reset your password.</p>
        <p>This link is valid for <strong>1 hour</strong>:</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });

    await client.close();

    console.log('Password reset email sent to:', email);

    return new Response(
      JSON.stringify({ message: 'If an account exists with that email, a reset link has been sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-password-reset-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
