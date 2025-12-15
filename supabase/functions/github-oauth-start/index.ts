import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    
    if (!userId) {
      throw new Error("User ID is required");
    }

    const clientId = Deno.env.get("GITHUB_CLIENT_ID");
    const callbackUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/github-oauth-callback";

    if (!clientId) {
      throw new Error("GitHub OAuth is not configured");
    }

    // GitHub OAuth scopes for public repo access
    const scopes = ["read:user", "user:email", "public_repo"].join(" ");

    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", callbackUrl);
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("state", userId);

    console.log("Generated GitHub OAuth URL for user:", userId);

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in github-oauth-start:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to start OAuth" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
