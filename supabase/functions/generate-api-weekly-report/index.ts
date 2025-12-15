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

    console.log('[generate-api-weekly-report] Generating weekly API usage report');

    // Calculate week range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const weekStart = startDate.toISOString().split('T')[0];
    const weekEnd = endDate.toISOString().split('T')[0];

    // Get all services
    const { data: services } = await supabase
      .from('api_service_registry')
      .select('*');

    // Get daily usage for the week
    const { data: dailyUsage } = await supabase
      .from('api_usage_daily')
      .select('*')
      .gte('date', weekStart)
      .lte('date', weekEnd)
      .order('date', { ascending: true });

    // Get alerts for the week
    const { data: alerts } = await supabase
      .from('api_alerts')
      .select('*')
      .gte('created_at', `${weekStart}T00:00:00`)
      .lte('created_at', `${weekEnd}T23:59:59`);

    // Get previous week's data for comparison
    const prevWeekStart = new Date(startDate);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0];

    const { data: prevWeekUsage } = await supabase
      .from('api_usage_daily')
      .select('*')
      .gte('date', prevWeekStartStr)
      .lt('date', weekStart);

    // Aggregate data by service
    const serviceStats: Record<string, any> = {};
    const prevServiceStats: Record<string, any> = {};

    // Current week aggregation
    dailyUsage?.forEach(day => {
      if (!serviceStats[day.service_name]) {
        serviceStats[day.service_name] = {
          total_requests: 0,
          successful_requests: 0,
          failed_requests: 0,
          total_response_time_ms: 0,
          fallback_count: 0,
          daily_breakdown: []
        };
      }
      const stats = serviceStats[day.service_name];
      stats.total_requests += day.total_requests || 0;
      stats.successful_requests += day.successful_requests || 0;
      stats.failed_requests += day.failed_requests || 0;
      stats.total_response_time_ms += day.total_response_time_ms || 0;
      stats.fallback_count += day.fallback_count || 0;
      stats.daily_breakdown.push({
        date: day.date,
        requests: day.total_requests,
        errors: day.failed_requests,
        avg_response_time: day.avg_response_time_ms
      });
    });

    // Previous week aggregation
    prevWeekUsage?.forEach(day => {
      if (!prevServiceStats[day.service_name]) {
        prevServiceStats[day.service_name] = {
          total_requests: 0,
          failed_requests: 0
        };
      }
      prevServiceStats[day.service_name].total_requests += day.total_requests || 0;
      prevServiceStats[day.service_name].failed_requests += day.failed_requests || 0;
    });

    // Calculate metrics and trends
    const serviceReports = services?.map(service => {
      const stats = serviceStats[service.service_name] || {
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        total_response_time_ms: 0,
        fallback_count: 0,
        daily_breakdown: []
      };

      const prevStats = prevServiceStats[service.service_name] || {
        total_requests: 0,
        failed_requests: 0
      };

      const successRate = stats.total_requests > 0 
        ? Math.round((stats.successful_requests / stats.total_requests) * 100) 
        : 100;

      const avgResponseTime = stats.total_requests > 0
        ? Math.round(stats.total_response_time_ms / stats.total_requests)
        : 0;

      const requestTrend = prevStats.total_requests > 0
        ? Math.round(((stats.total_requests - prevStats.total_requests) / prevStats.total_requests) * 100)
        : (stats.total_requests > 0 ? 100 : 0);

      // Calculate quota usage if applicable
      let quotaUsage = null;
      if (service.daily_quota) {
        const avgDailyRequests = stats.total_requests / 7;
        quotaUsage = Math.round((avgDailyRequests / service.daily_quota) * 100);
      } else if (service.monthly_quota) {
        const projectedMonthly = (stats.total_requests / 7) * 30;
        quotaUsage = Math.round((projectedMonthly / service.monthly_quota) * 100);
      }

      return {
        service_name: service.service_name,
        display_name: service.display_name,
        total_requests: stats.total_requests,
        successful_requests: stats.successful_requests,
        failed_requests: stats.failed_requests,
        success_rate: successRate,
        avg_response_time_ms: avgResponseTime,
        fallback_count: stats.fallback_count,
        request_trend_percent: requestTrend,
        quota_usage_percent: quotaUsage,
        daily_breakdown: stats.daily_breakdown,
        rate_limit: service.rate_limit_requests,
        rate_limit_period: service.rate_limit_period,
        daily_quota: service.daily_quota,
        monthly_quota: service.monthly_quota
      };
    }) || [];

    // Sort by total requests
    serviceReports.sort((a, b) => b.total_requests - a.total_requests);

    // Overall summary
    const totalRequests = serviceReports.reduce((sum, s) => sum + s.total_requests, 0);
    const totalFailed = serviceReports.reduce((sum, s) => sum + s.failed_requests, 0);
    const overallSuccessRate = totalRequests > 0 
      ? Math.round(((totalRequests - totalFailed) / totalRequests) * 100) 
      : 100;

    // Services approaching limits
    const servicesApproachingLimits = serviceReports.filter(s => 
      s.quota_usage_percent !== null && s.quota_usage_percent >= 70
    );

    // High error rate services
    const highErrorServices = serviceReports.filter(s => 
      s.success_rate < 90 && s.total_requests >= 10
    );

    // Alert summary
    const alertsByType = {
      quota_warning: alerts?.filter(a => a.alert_type === 'quota_warning').length || 0,
      error_rate: alerts?.filter(a => a.alert_type === 'error_rate').length || 0,
      response_time: alerts?.filter(a => a.alert_type === 'response_time').length || 0
    };

    const reportData = {
      period: {
        start: weekStart,
        end: weekEnd
      },
      summary: {
        total_requests: totalRequests,
        total_errors: totalFailed,
        overall_success_rate: overallSuccessRate,
        services_monitored: serviceReports.length,
        active_services: serviceReports.filter(s => s.total_requests > 0).length
      },
      alerts_summary: {
        total_alerts: alerts?.length || 0,
        by_type: alertsByType
      },
      services_approaching_limits: servicesApproachingLimits,
      high_error_services: highErrorServices,
      service_reports: serviceReports,
      recommendations: generateRecommendations(serviceReports, servicesApproachingLimits, highErrorServices)
    };

    // Save the report
    const { data: savedReport, error: saveError } = await supabase
      .from('api_weekly_reports')
      .insert({
        week_start: weekStart,
        week_end: weekEnd,
        report_data: reportData
      })
      .select()
      .single();

    if (saveError) {
      console.error('[generate-api-weekly-report] Error saving report:', saveError);
    }

    console.log('[generate-api-weekly-report] Report generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        report_id: savedReport?.id,
        report: reportData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-api-weekly-report] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateRecommendations(
  serviceReports: any[],
  approachingLimits: any[],
  highErrorServices: any[]
): string[] {
  const recommendations: string[] = [];

  // Quota recommendations
  approachingLimits.forEach(service => {
    if (service.quota_usage_percent >= 90) {
      recommendations.push(
        `URGENT: ${service.display_name} is at ${service.quota_usage_percent}% of quota. Consider upgrading or reducing usage immediately.`
      );
    } else if (service.quota_usage_percent >= 70) {
      recommendations.push(
        `${service.display_name} is at ${service.quota_usage_percent}% of quota. Monitor usage closely.`
      );
    }
  });

  // Error rate recommendations
  highErrorServices.forEach(service => {
    recommendations.push(
      `${service.display_name} has a ${100 - service.success_rate}% error rate. Investigate and implement better error handling or fallbacks.`
    );
  });

  // High fallback usage
  const highFallbackServices = serviceReports.filter(s => 
    s.fallback_count > 0 && (s.fallback_count / s.total_requests) > 0.1
  );
  highFallbackServices.forEach(service => {
    const fallbackPercent = Math.round((service.fallback_count / service.total_requests) * 100);
    recommendations.push(
      `${service.display_name} is using fallbacks ${fallbackPercent}% of the time. Primary API may be unreliable.`
    );
  });

  // Performance recommendations
  const slowServices = serviceReports.filter(s => s.avg_response_time_ms > 2000);
  slowServices.forEach(service => {
    recommendations.push(
      `${service.display_name} has slow response times (avg ${service.avg_response_time_ms}ms). Consider caching or optimization.`
    );
  });

  if (recommendations.length === 0) {
    recommendations.push('All API integrations are performing well within expected parameters.');
  }

  return recommendations;
}
