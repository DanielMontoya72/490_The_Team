import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Zap, Clock, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RateLimitInfo {
  service_name: string;
  display_name: string;
  rate_limit_requests: number;
  rate_limit_period: string;
  recent_requests: number;
  estimated_remaining: number;
  is_likely_limited: boolean;
}

export function ApiRateLimitStatus() {
  const [rateLimits, setRateLimits] = useState<RateLimitInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRateLimitStatus();
    const interval = setInterval(fetchRateLimitStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchRateLimitStatus = async () => {
    try {
      const { data: services } = await supabase
        .from('api_service_registry')
        .select('*')
        .not('rate_limit_requests', 'is', null);

      // Get recent logs (last hour) to estimate current rate
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentLogs } = await supabase
        .from('api_usage_logs')
        .select('service_name, created_at')
        .gte('created_at', oneHourAgo);

      // Count requests per service per minute (using last minute)
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
      const recentByService: Record<string, number> = {};
      recentLogs?.forEach(log => {
        if (log.created_at >= oneMinuteAgo) {
          recentByService[log.service_name] = (recentByService[log.service_name] || 0) + 1;
        }
      });

      const rateLimitData = services?.map(service => {
        const recentCount = recentByService[service.service_name] || 0;
        let estimatedRemaining = service.rate_limit_requests;
        let isLimited = false;

        // Estimate remaining based on rate limit period
        switch (service.rate_limit_period) {
          case 'second':
            estimatedRemaining = Math.max(0, service.rate_limit_requests - (recentCount / 60));
            isLimited = recentCount >= service.rate_limit_requests * 60;
            break;
          case 'minute':
            estimatedRemaining = Math.max(0, service.rate_limit_requests - recentCount);
            isLimited = recentCount >= service.rate_limit_requests * 0.9;
            break;
          case 'hour':
            const hourCount = recentLogs?.filter(l => l.service_name === service.service_name).length || 0;
            estimatedRemaining = Math.max(0, service.rate_limit_requests - hourCount);
            isLimited = hourCount >= service.rate_limit_requests * 0.9;
            break;
          default:
            estimatedRemaining = service.rate_limit_requests;
        }

        return {
          service_name: service.service_name,
          display_name: service.display_name,
          rate_limit_requests: service.rate_limit_requests,
          rate_limit_period: service.rate_limit_period,
          recent_requests: recentCount,
          estimated_remaining: Math.round(estimatedRemaining),
          is_likely_limited: isLimited
        };
      }) || [];

      setRateLimits(rateLimitData);
    } catch (error) {
      console.error('Error fetching rate limit status:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPeriod = (period: string) => {
    const periods: Record<string, string> = {
      'second': '/sec',
      'minute': '/min',
      'hour': '/hr',
      'day': '/day',
      '10_seconds': '/10s',
      'month': '/mo'
    };
    return periods[period] || `/${period}`;
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading rate limit status...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Real-Time Rate Limit Status
        </CardTitle>
        <CardDescription>Current rate limit usage across all API services (updates every 30s)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rateLimits.map(limit => (
            <TooltipProvider key={limit.service_name}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className={`border rounded-lg p-3 cursor-help transition-colors ${
                      limit.is_likely_limited 
                        ? 'border-destructive bg-destructive/5' 
                        : limit.recent_requests > 0 
                          ? 'border-yellow-500/50' 
                          : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{limit.display_name}</span>
                      {limit.is_likely_limited ? (
                        <Badge variant="destructive" className="text-xs">Near Limit</Badge>
                      ) : limit.recent_requests > 0 ? (
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Idle</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {limit.rate_limit_requests}{formatPeriod(limit.rate_limit_period)}
                      </span>
                      <span className={`font-medium ${limit.is_likely_limited ? 'text-destructive' : ''}`}>
                        ~{limit.estimated_remaining} left
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs space-y-1">
                    <p>Rate Limit: {limit.rate_limit_requests} requests {formatPeriod(limit.rate_limit_period)}</p>
                    <p>Recent requests (last min): {limit.recent_requests}</p>
                    <p>Estimated remaining: {limit.estimated_remaining}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3 w-3" />
          <span>Rate limit estimates are based on recent API activity. Actual limits are enforced by the external services.</span>
        </div>
      </CardContent>
    </Card>
  );
}
