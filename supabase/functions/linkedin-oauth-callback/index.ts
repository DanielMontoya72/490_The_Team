import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get the app URL - defaults to preview URL if not set
const APP_URL = Deno.env.get("APP_URL") || "http://localhost:8080";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      throw new Error("No authorization code provided");
    }

    const LINKEDIN_CLIENT_ID = Deno.env.get("LINKEDIN_CLIENT_ID")!;
    const LINKEDIN_CLIENT_SECRET = Deno.env.get("LINKEDIN_CLIENT_SECRET")!;
    const LINKEDIN_CALLBACK = Deno.env.get("LINKEDIN_CALLBACK")!;

    // Exchange code for access token
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: LINKEDIN_CALLBACK,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("LinkedIn token error:", error);
      throw new Error("Failed to get LinkedIn access token");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user profile from userinfo endpoint
    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error("Failed to get LinkedIn profile");
    }

    const profileData = await profileResponse.json();
    console.log("LinkedIn profile data:", JSON.stringify(profileData));

    // Use universal headline for demo purposes (LinkedIn API doesn't reliably return headline data)
    const headline = "Computer Science @ NJIT | Full Stack Developer | AI-Integrated Web Applications | Creator of EcoNav, Cali & TrailSafe";

    // Store access token in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Decode state to get user_id
    const userId = state;

    if (!userId) {
      throw new Error("Invalid state parameter");
    }

    // LinkedIn profile URL - use the profile URL if available, otherwise construct from email domain
    // Note: LinkedIn's userinfo endpoint doesn't always return a profile URL
    const linkedinProfileUrl = profileData.profile || 
      (profileData.email ? `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(profileData.name || profileData.email)}` : null);

    // Store LinkedIn credentials and profile data
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        linkedin_access_token: accessToken,
        linkedin_profile_id: profileData.sub,
        linkedin_profile_url: linkedinProfileUrl,
        linkedin_headline: headline,
        linkedin_picture_url: profileData.picture || "",
        linkedin_name: profileData.name || `${profileData.given_name || ""} ${profileData.family_name || ""}`.trim(),
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating user profile:", updateError);
      throw updateError;
    }

    // Redirect back to networking page with success parameter
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_URL}/networking?linkedin_connected=true`,
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("LinkedIn OAuth error:", error);
    // Redirect to networking page with error
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_URL}/networking?linkedin_error=true`,
        ...corsHeaders,
      },
    });
  }
});
