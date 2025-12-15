import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      service_name, 
      endpoint, 
      method = 'GET', 
      status_code, 
      response_time_ms, 
      success, 
      error_message,
      fallback_used = false,
      user_id
    } = await req.json();

    if (!service_name || !endpoint) {
      return new Response(
        JSON.stringify({ error: 'service_name and endpoint are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[track-api-usage] Tracking ${method} ${service_name}:${endpoint} - ${success ? 'SUCCESS' : 'FAILED'}`);

    // 1. Insert usage log
    const { error: logError } = await supabase
      .from('api_usage_logs')
      .insert({
        service_name,
        endpoint,
        method,
        status_code,
        response_time_ms,
        success,
        error_message,
        fallback_used,
        user_id
      });

    if (logError) {
      console.error('[track-api-usage] Error inserting log:', logError);
    }

    // 2. Update daily aggregates
    const today = new Date().toISOString().split('T')[0];
    
    // Check if daily record exists
    const { data: existingDaily } = await supabase
      .from('api_usage_daily')
      .select('*')
      .eq('service_name', service_name)
      .eq('date', today)
      .single();

    if (existingDaily) {
      // Update existing record
      const newTotal = existingDaily.total_requests + 1;
      const newSuccessful = existingDaily.successful_requests + (success ? 1 : 0);
      const newFailed = existingDaily.failed_requests + (success ? 0 : 1);
      const newTotalTime = (existingDaily.total_response_time_ms || 0) + (response_time_ms || 0);
      const newFallbackCount = existingDaily.fallback_count + (fallback_used ? 1 : 0);

      await supabase
        .from('api_usage_daily')
        .update({
          total_requests: newTotal,
          successful_requests: newSuccessful,
          failed_requests: newFailed,
          total_response_time_ms: newTotalTime,
          avg_response_time_ms: Math.round(newTotalTime / newTotal),
          fallback_count: newFallbackCount
        })
        .eq('id', existingDaily.id);
    } else {
      // Create new daily record
      await supabase
        .from('api_usage_daily')
        .insert({
          service_name,
          date: today,
          total_requests: 1,
          successful_requests: success ? 1 : 0,
          failed_requests: success ? 0 : 1,
          total_response_time_ms: response_time_ms || 0,
          avg_response_time_ms: response_time_ms || 0,
          fallback_count: fallback_used ? 1 : 0
        });
    }

    // 3. Check alert thresholds
    const { data: service } = await supabase
      .from('api_service_registry')
      .select('*')
      .eq('service_name', service_name)
      .single();

    if (service) {
      // Get today's usage for quota check
      const { data: todayUsage } = await supabase
        .from('api_usage_daily')
        .select('*')
        .eq('service_name', service_name)
        .eq('date', today)
        .single();

      if (todayUsage && service.daily_quota) {
        const usagePercent = (todayUsage.total_requests / service.daily_quota) * 100;
        
        // Get quota warning threshold
        const { data: threshold } = await supabase
          .from('api_alert_thresholds')
          .select('*')
          .eq('service_name', service_name)
          .eq('alert_type', 'quota_warning')
          .single();

        if (threshold && usagePercent >= threshold.threshold_value) {
          // Check if alert already exists for today
          const { data: existingAlert } = await supabase
            .from('api_alerts')
            .select('*')
            .eq('service_name', service_name)
            .eq('alert_type', 'quota_warning')
            .gte('created_at', `${today}T00:00:00`)
            .single();

          if (!existingAlert) {
            await supabase
              .from('api_alerts')
              .insert({
                service_name,
                alert_type: 'quota_warning',
                severity: usagePercent >= 90 ? 'critical' : 'warning',
                message: `${service.display_name} has used ${Math.round(usagePercent)}% of daily quota (${todayUsage.total_requests}/${service.daily_quota})`,
                current_value: usagePercent,
                threshold_value: threshold.threshold_value
              });
            console.log(`[track-api-usage] Created quota warning alert for ${service_name}`);
          }
        }
      }

      // Check error rate threshold
      if (todayUsage && todayUsage.total_requests >= 10) {
        const errorRate = (todayUsage.failed_requests / todayUsage.total_requests) * 100;
        
        const { data: errorThreshold } = await supabase
          .from('api_alert_thresholds')
          .select('*')
          .eq('service_name', service_name)
          .eq('alert_type', 'error_rate')
          .single();

        if (errorThreshold && errorRate >= errorThreshold.threshold_value) {
          const { data: existingErrorAlert } = await supabase
            .from('api_alerts')
            .select('*')
            .eq('service_name', service_name)
            .eq('alert_type', 'error_rate')
            .gte('created_at', `${today}T00:00:00`)
            .single();

          if (!existingErrorAlert) {
            await supabase
              .from('api_alerts')
              .insert({
                service_name,
                alert_type: 'error_rate',
                severity: errorRate >= 50 ? 'critical' : 'warning',
                message: `${service.display_name} error rate is ${Math.round(errorRate)}% (${todayUsage.failed_requests}/${todayUsage.total_requests} requests failed)`,
                current_value: errorRate,
                threshold_value: errorThreshold.threshold_value
              });
            console.log(`[track-api-usage] Created error rate alert for ${service_name}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[track-api-usage] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
