import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // This is the user_id
  const error = url.searchParams.get("error");

  const appUrl = Deno.env.get("APP_URL") || "http://localhost:8080";

  if (error) {
    console.error("GitHub OAuth error:", error);
    return Response.redirect(`${appUrl}/profile-enhanced?github_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    console.error("Missing code or state");
    return Response.redirect(`${appUrl}/profile-enhanced?github_error=missing_params`);
  }

  try {
    const clientId = Deno.env.get("GITHUB_CLIENT_ID");
    const clientSecret = Deno.env.get("GITHUB_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("GitHub OAuth credentials not configured");
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || "Failed to get access token");
    }

    // Get user info from GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Accept": "application/vnd.github.v3+json",
      },
    });

    const githubUser = await userResponse.json();

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Store the integration
    const { error: upsertError } = await supabaseClient
      .from("github_integrations")
      .upsert({
        user_id: state,
        github_username: githubUser.login,
        github_avatar_url: githubUser.avatar_url,
        access_token: tokenData.access_token,
        token_type: tokenData.token_type || "bearer",
        scope: tokenData.scope,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Error storing GitHub integration:", upsertError);
      throw upsertError;
    }

    console.log("GitHub integration stored for user:", state);

    // Redirect back to profile with success
    return Response.redirect(`${appUrl}/profile-enhanced?github_success=true`);
  } catch (error) {
    console.error("Error in github-oauth-callback:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return Response.redirect(`${appUrl}/profile-enhanced?github_error=${encodeURIComponent(errorMessage)}`);
  }
});
