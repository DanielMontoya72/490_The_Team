import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ServiceUsage {
  service_name: string;
  display_name: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time_ms: number;
  daily_quota: number | null;
  monthly_quota: number | null;
  rate_limit_requests: number | null;
  rate_limit_period: string | null;
  is_free_tier: boolean;
  fallback_available: boolean;
}

export function ApiUsageOverview() {
  const [services, setServices] = useState<ServiceUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayUsage, setTodayUsage] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch services
      const { data: servicesData } = await supabase
        .from('api_service_registry')
        .select('*');

      // Fetch today's usage
      const today = new Date().toISOString().split('T')[0];
      const { data: dailyData } = await supabase
        .from('api_usage_daily')
        .select('*')
        .eq('date', today);

      // Map daily usage by service
      const usageMap: Record<string, any> = {};
      dailyData?.forEach(d => {
        usageMap[d.service_name] = d;
      });
      setTodayUsage(usageMap);

      // Combine data
      const combined = servicesData?.map(service => ({
        ...service,
        total_requests: usageMap[service.service_name]?.total_requests || 0,
        successful_requests: usageMap[service.service_name]?.successful_requests || 0,
        failed_requests: usageMap[service.service_name]?.failed_requests || 0,
        avg_response_time_ms: usageMap[service.service_name]?.avg_response_time_ms || 0,
      })) || [];

      setServices(combined);
    } catch (error) {
      console.error('Error fetching API usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuotaPercent = (service: ServiceUsage) => {
    if (service.daily_quota && service.total_requests > 0) {
      return Math.min(100, Math.round((service.total_requests / service.daily_quota) * 100));
    }
    return null;
  };

  const getSuccessRate = (service: ServiceUsage) => {
    if (service.total_requests === 0) return 100;
    return Math.round((service.successful_requests / service.total_requests) * 100);
  };

  const getStatusBadge = (service: ServiceUsage) => {
    const successRate = getSuccessRate(service);
    const quotaPercent = getQuotaPercent(service);

    if (quotaPercent && quotaPercent >= 90) {
      return <Badge variant="destructive">Quota Critical</Badge>;
    }
    if (quotaPercent && quotaPercent >= 70) {
      return <Badge className="bg-yellow-500">Quota Warning</Badge>;
    }
    if (successRate < 80) {
      return <Badge variant="destructive">High Errors</Badge>;
    }
    if (successRate < 95) {
      return <Badge className="bg-yellow-500">Some Errors</Badge>;
    }
    if (service.total_requests === 0) {
      return <Badge variant="secondary">No Activity</Badge>;
    }
    return <Badge className="bg-green-500">Healthy</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading API usage data...</div>;
  }

  // Calculate totals
  const totalRequests = services.reduce((sum, s) => sum + s.total_requests, 0);
  const totalErrors = services.reduce((sum, s) => sum + s.failed_requests, 0);
  const activeServices = services.filter(s => s.total_requests > 0).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total API Calls Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all services</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeServices} / {services.length}</div>
            <p className="text-xs text-muted-foreground">Services with activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{totalErrors}</div>
            <p className="text-xs text-muted-foreground">
              {totalRequests > 0 ? `${Math.round((totalErrors / totalRequests) * 100)}% error rate` : 'No requests'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Health</CardTitle>
          </CardHeader>
          <CardContent>
            {totalErrors === 0 && totalRequests > 0 ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-lg font-semibold text-green-600">All Systems Healthy</span>
              </div>
            ) : totalErrors > 0 ? (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span className="text-lg font-semibold text-yellow-600">Some Issues</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Minus className="h-5 w-5 text-muted-foreground" />
                <span className="text-lg font-semibold text-muted-foreground">No Activity</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Service List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            API Services Status
          </CardTitle>
          <CardDescription>Today's usage statistics for all integrated services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services.map(service => {
              const quotaPercent = getQuotaPercent(service);
              const successRate = getSuccessRate(service);

              return (
                <div key={service.service_name} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{service.display_name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {service.rate_limit_requests && (
                          <span>Rate limit: {service.rate_limit_requests}/{service.rate_limit_period}</span>
                        )}
                        {service.is_free_tier && <Badge variant="outline" className="ml-2 text-xs">Free Tier</Badge>}
                      </p>
                    </div>
                    {getStatusBadge(service)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Requests</p>
                      <p className="font-medium">{service.total_requests.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Success Rate</p>
                      <p className={`font-medium ${successRate < 90 ? 'text-destructive' : 'text-green-600'}`}>
                        {successRate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Response</p>
                      <p className={`font-medium ${service.avg_response_time_ms > 2000 ? 'text-yellow-600' : ''}`}>
                        {service.avg_response_time_ms}ms
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Errors</p>
                      <p className={`font-medium ${service.failed_requests > 0 ? 'text-destructive' : ''}`}>
                        {service.failed_requests}
                      </p>
                    </div>
                  </div>

                  {quotaPercent !== null && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Daily Quota</span>
                        <span>{service.total_requests} / {service.daily_quota}</span>
                      </div>
                      <Progress 
                        value={quotaPercent} 
                        className={`h-2 ${quotaPercent >= 90 ? '[&>div]:bg-destructive' : quotaPercent >= 70 ? '[&>div]:bg-yellow-500' : ''}`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
