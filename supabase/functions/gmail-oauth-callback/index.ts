import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // userId
    const error = url.searchParams.get("error");

    const appUrl = Deno.env.get("APP_URL") || "http://localhost:8080";

    if (error) {
      console.error("OAuth error:", error);
      return Response.redirect(`${appUrl}/profile-enhanced?gmail_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return Response.redirect(`${appUrl}/profile-enhanced?gmail_error=missing_params`);
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const callbackUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/gmail-oauth-callback";

    if (!clientId || !clientSecret) {
      return Response.redirect(`${appUrl}/profile-enhanced?gmail_error=not_configured`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return Response.redirect(`${appUrl}/profile-enhanced?gmail_error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();
    console.log("Token exchange successful");

    // Get user email from Google
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      console.error("Failed to get user info");
      return Response.redirect(`${appUrl}/profile-enhanced?gmail_error=userinfo_failed`);
    }

    const userInfo = await userInfoResponse.json();
    const gmailEmail = userInfo.email;

    // Store tokens in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from("gmail_integrations")
      .upsert({
        user_id: state,
        gmail_email: gmailEmail,
        gmail_access_token: tokens.access_token,
        gmail_refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        scanning_enabled: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Database upsert error:", upsertError);
      return Response.redirect(`${appUrl}/profile-enhanced?gmail_error=database_error`);
    }

    console.log("Gmail integration saved for user:", state);

    return Response.redirect(`${appUrl}/profile-enhanced?gmail_success=true`);
  } catch (error) {
    console.error("Error in gmail-oauth-callback:", error);
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:8080";
    return Response.redirect(`${appUrl}/profile-enhanced?gmail_error=unknown`);
  }
});
