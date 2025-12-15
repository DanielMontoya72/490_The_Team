import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      data: { user },
    } = await supabase.auth.getUser(req.headers.get("Authorization")?.replace("Bearer ", "") || "");

    if (!user) {
      throw new Error("Unauthorized");
    }

    // Get LinkedIn access token from user profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("linkedin_access_token")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.linkedin_access_token) {
      throw new Error("LinkedIn not connected. Please connect your LinkedIn account first.");
    }

    const accessToken = profile.linkedin_access_token;

    // Fetch LinkedIn connections
    const connectionsResponse = await fetch(
      "https://api.linkedin.com/v2/connections?q=viewer&start=0&count=100&projection=(elements*(to~(localizedFirstName,localizedLastName,headline,vanityName,profilePicture)))",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );

    if (!connectionsResponse.ok) {
      const errorText = await connectionsResponse.text();
      console.error("LinkedIn API error:", errorText);
      throw new Error("Failed to fetch LinkedIn connections");
    }

    const connectionsData = await connectionsResponse.json();

    // Transform LinkedIn data to contact suggestions format
    const suggestions = connectionsData.elements.map((connection: any) => {
      const profile = connection.to;
      const firstName = profile.localizedFirstName || "";
      const lastName = profile.localizedLastName || "";
      const fullName = `${firstName} ${lastName}`.trim();
      const vanityName = profile.vanityName || "";
      const headline = profile.headline || "";

      return {
        user_id: user.id,
        contact_name: fullName,
        contact_title: headline,
        contact_company: null, // LinkedIn Connections API doesn't include company in basic permissions
        contact_location: null,
        linkedin_url: vanityName ? `https://www.linkedin.com/in/${vanityName}` : null,
        connection_type: "second_degree",
        connection_path: [],
        mutual_connections: [],
        mutual_interests: [],
        suggestion_reason: "Direct LinkedIn connection",
        relevance_score: 90,
        status: "suggested",
      };
    });

    // Insert into database
    const { data: insertedContacts, error: insertError } = await supabase
      .from("contact_suggestions")
      .insert(suggestions)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: suggestions.length,
        contacts: insertedContacts,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching LinkedIn connections:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to fetch connections",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
