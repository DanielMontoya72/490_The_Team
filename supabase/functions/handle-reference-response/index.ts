import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  requestId: string;
  action: "confirmed" | "declined";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId, action }: RequestBody = await req.json();

    console.log(`Processing reference response: ${action} for request ${requestId}`);

    if (!requestId || !action) {
      throw new Error("Missing requestId or action");
    }

    if (!["confirmed", "declined"].includes(action)) {
      throw new Error("Invalid action. Must be 'confirmed' or 'declined'");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update the reference request status
    const { data, error } = await supabase
      .from("reference_requests")
      .update({ 
        request_status: action,
        feedback_received_at: new Date().toISOString()
      })
      .eq("id", requestId)
      .select(`
        *,
        professional_references (
          reference_name,
          reference_email
        )
      `)
      .single();

    if (error) {
      console.error("Database error:", error);
      throw new Error("Failed to update reference request status");
    }

    console.log(`Reference request ${requestId} updated to ${action}`);

    return new Response(JSON.stringify({ 
      success: true, 
      status: action,
      referenceName: data?.professional_references?.reference_name
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error handling reference response:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
