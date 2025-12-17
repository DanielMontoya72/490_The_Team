import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeocodeResult {
  latitude: number;
  longitude: number;
  display_name: string;
  country?: string;
  country_code?: string;
  timezone?: string;
}

// Estimate timezone from longitude (rough approximation)
function estimateTimezone(longitude: number): string {
  const offset = Math.round(longitude / 15);
  if (offset === 0) return "UTC";
  const sign = offset > 0 ? "+" : "";
  return `UTC${sign}${offset}`;
}

// Get timezone from coordinates using free TimeAPI
async function getTimezone(lat: number, lon: number): Promise<string | null> {
  try {
    // Use timeapi.io - free, no API key required
    const response = await fetch(
      `https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lon}`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.timeZone) {
        return data.timeZone;
      }
    }
  } catch (error) {
    console.error("TimeAPI error:", error);
  }
  
  // Fallback to longitude-based estimation
  return estimateTimezone(lon);
}

async function geocodeWithNominatim(location: string): Promise<GeocodeResult | null> {
  try {
    const encodedLocation = encodeURIComponent(location);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedLocation}&format=json&limit=1&addressdetails=1`;
    
    console.log("Geocoding request for:", location);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "TheTeamJobTracker/1.0",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    console.log("Nominatim response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Nominatim API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log("Nominatim results count:", data.length);
    
    if (data.length === 0) {
      console.log("No results found for location:", location);
      return null;
    }

    const result = data[0];
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    console.log("Geocoded result:", result.display_name);
    
    // Get timezone
    const timezone = await getTimezone(lat, lon);
    console.log("Timezone for location:", timezone);
    
    return {
      latitude: lat,
      longitude: lon,
      display_name: result.display_name,
      country: result.address?.country,
      country_code: result.address?.country_code?.toUpperCase(),
      timezone: timezone || undefined,
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

async function calculateRoute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): Promise<{ distance_km: number; duration_minutes: number } | null> {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=false`
    );

    if (!response.ok) {
      console.error("OSRM API error:", response.status);
      return null;
    }

    const data = await response.json();
    if (data.code !== "Ok" || !data.routes?.length) {
      return null;
    }

    const route = data.routes[0];
    return {
      distance_km: Math.round((route.distance / 1000) * 10) / 10,
      duration_minutes: Math.round(route.duration / 60),
    };
  } catch (error) {
    console.error("Routing error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, location, from_location, to_location, user_id, job_id } = await req.json();

    if (action === "geocode") {
      // Check cache first
      const { data: cached } = await supabase
        .from("geocoded_locations")
        .select("*")
        .eq("location_string", location.toLowerCase().trim())
        .single();

      if (cached) {
        return new Response(JSON.stringify({
          success: true,
          data: cached,
          cached: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Geocode with Nominatim
      const result = await geocodeWithNominatim(location);
      if (!result) {
        return new Response(JSON.stringify({
          success: false,
          error: "Location not found",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Cache the result
      const { data: savedLocation, error: saveError } = await supabase
        .from("geocoded_locations")
        .insert({
          location_string: location.toLowerCase().trim(),
          latitude: result.latitude,
          longitude: result.longitude,
          display_name: result.display_name,
          country: result.country,
          country_code: result.country_code,
          timezone: result.timezone,
        })
        .select()
        .single();

      if (saveError) {
        console.error("Error caching geocode:", saveError);
      }

      return new Response(JSON.stringify({
        success: true,
        data: savedLocation || result,
        cached: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "calculate_commute") {
      if (!from_location || !to_location) {
        return new Response(JSON.stringify({
          success: false,
          error: "Missing from_location or to_location",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Geocode both locations
      let fromCoords = from_location;
      let toCoords = to_location;

      if (typeof from_location === "string") {
        const result = await geocodeWithNominatim(from_location);
        if (!result) {
          return new Response(JSON.stringify({
            success: false,
            error: "Could not geocode origin location",
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        fromCoords = { latitude: result.latitude, longitude: result.longitude };
      }

      if (typeof to_location === "string") {
        const result = await geocodeWithNominatim(to_location);
        if (!result) {
          return new Response(JSON.stringify({
            success: false,
            error: "Could not geocode destination location",
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        toCoords = { latitude: result.latitude, longitude: result.longitude };
      }

      // Calculate route
      const route = await calculateRoute(
        fromCoords.latitude,
        fromCoords.longitude,
        toCoords.latitude,
        toCoords.longitude
      );

      if (!route) {
        return new Response(JSON.stringify({
          success: false,
          error: "Could not calculate route",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Cache commute if job_id and user_id provided
      if (job_id && user_id) {
        await supabase
          .from("job_commute_cache")
          .upsert({
            job_id,
            user_id,
            distance_km: route.distance_km,
            duration_minutes: route.duration_minutes,
            calculated_at: new Date().toISOString(),
          }, { onConflict: "job_id,user_id" });
      }

      return new Response(JSON.stringify({
        success: true,
        data: {
          ...route,
          from: fromCoords,
          to: toCoords,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "batch_geocode") {
      const { locations } = await req.json();
      const results: Record<string, GeocodeResult | null> = {};

      for (const loc of locations) {
        // Check cache
        const { data: cached } = await supabase
          .from("geocoded_locations")
          .select("*")
          .eq("location_string", loc.toLowerCase().trim())
          .single();

        if (cached) {
          results[loc] = cached;
          continue;
        }

        // Rate limit: wait 1 second between Nominatim requests
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const result = await geocodeWithNominatim(loc);
        if (result) {
          await supabase.from("geocoded_locations").insert({
            location_string: loc.toLowerCase().trim(),
            latitude: result.latitude,
            longitude: result.longitude,
            display_name: result.display_name,
            country: result.country,
            country_code: result.country_code,
          });
        }
        results[loc] = result;
      }

      return new Response(JSON.stringify({
        success: true,
        data: results,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: "Invalid action",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
