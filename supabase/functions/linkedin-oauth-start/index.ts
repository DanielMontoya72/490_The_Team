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
    const LINKEDIN_CLIENT_ID = Deno.env.get("LINKEDIN_CLIENT_ID")!;
    const LINKEDIN_CALLBACK = Deno.env.get("LINKEDIN_CALLBACK")!;

    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");

    if (!userId) {
      throw new Error("User ID is required");
    }

    // Construct LinkedIn OAuth URL
    const linkedInAuthUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
    linkedInAuthUrl.searchParams.set("response_type", "code");
    linkedInAuthUrl.searchParams.set("client_id", LINKEDIN_CLIENT_ID);
    linkedInAuthUrl.searchParams.set("redirect_uri", LINKEDIN_CALLBACK);
    linkedInAuthUrl.searchParams.set("state", userId);
    linkedInAuthUrl.searchParams.set("scope", "openid profile email w_member_social");
    linkedInAuthUrl.searchParams.set("prompt", "consent"); // Force re-authentication flow

    // Redirect to LinkedIn
    return new Response(null, {
      status: 302,
      headers: {
        Location: linkedInAuthUrl.toString(),
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("LinkedIn OAuth start error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "OAuth initiation failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
