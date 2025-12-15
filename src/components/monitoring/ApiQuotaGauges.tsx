import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Gauge, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface QuotaInfo {
  service_name: string;
  display_name: string;
  used: number;
  limit: number;
  period: string;
  percent: number;
  remaining: number;
  reset_time?: string;
}

export function ApiQuotaGauges() {
  const [quotas, setQuotas] = useState<QuotaInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotas();
  }, []);

  const fetchQuotas = async () => {
    try {
      const { data: services } = await supabase
        .from('api_service_registry')
        .select('*')
        .or('daily_quota.not.is.null,monthly_quota.not.is.null');

      const today = new Date().toISOString().split('T')[0];
      const { data: dailyUsage } = await supabase
        .from('api_usage_daily')
        .select('*')
        .eq('date', today);

      // Get monthly usage (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: monthlyUsage } = await supabase
        .from('api_usage_daily')
        .select('service_name, total_requests')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Calculate monthly totals
      const monthlyTotals: Record<string, number> = {};
      monthlyUsage?.forEach(d => {
        monthlyTotals[d.service_name] = (monthlyTotals[d.service_name] || 0) + d.total_requests;
      });

      // Map daily usage
      const dailyMap: Record<string, number> = {};
      dailyUsage?.forEach(d => {
        dailyMap[d.service_name] = d.total_requests;
      });

      const quotaList: QuotaInfo[] = [];

      services?.forEach(service => {
        if (service.daily_quota) {
          const used = dailyMap[service.service_name] || 0;
          quotaList.push({
            service_name: service.service_name,
            display_name: service.display_name,
            used,
            limit: service.daily_quota,
            period: 'daily',
            percent: Math.min(100, Math.round((used / service.daily_quota) * 100)),
            remaining: Math.max(0, service.daily_quota - used),
            reset_time: 'Midnight UTC'
          });
        }

        if (service.monthly_quota) {
          const used = monthlyTotals[service.service_name] || 0;
          quotaList.push({
            service_name: service.service_name,
            display_name: service.display_name,
            used,
            limit: service.monthly_quota,
            period: 'monthly',
            percent: Math.min(100, Math.round((used / service.monthly_quota) * 100)),
            remaining: Math.max(0, service.monthly_quota - used),
            reset_time: '1st of month'
          });
        }
      });

      // Sort by percent usage descending
      quotaList.sort((a, b) => b.percent - a.percent);
      setQuotas(quotaList);
    } catch (error) {
      console.error('Error fetching quotas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuotaStatus = (percent: number) => {
    if (percent >= 90) return { color: 'destructive', icon: AlertTriangle, label: 'Critical' };
    if (percent >= 70) return { color: 'warning', icon: AlertTriangle, label: 'Warning' };
    return { color: 'success', icon: CheckCircle, label: 'OK' };
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading quota data...</div>;
  }

  if (quotas.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No services with quota limits configured.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            API Quota Status
          </CardTitle>
          <CardDescription>Monitor remaining quota for rate-limited APIs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quotas.map((quota, index) => {
              const status = getQuotaStatus(quota.percent);
              const StatusIcon = status.icon;

              return (
                <div 
                  key={`${quota.service_name}-${quota.period}`} 
                  className={`border rounded-lg p-4 ${
                    quota.percent >= 90 ? 'border-destructive bg-destructive/5' : 
                    quota.percent >= 70 ? 'border-yellow-500 bg-yellow-500/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{quota.display_name}</h4>
                      <p className="text-xs text-muted-foreground capitalize">{quota.period} Quota</p>
                    </div>
                    <Badge 
                      variant={quota.percent >= 90 ? 'destructive' : quota.percent >= 70 ? 'outline' : 'secondary'}
                      className={quota.percent >= 70 && quota.percent < 90 ? 'bg-yellow-500 text-white' : ''}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>

                  {/* Gauge Visualization */}
                  <div className="relative mb-3">
                    <Progress 
                      value={quota.percent} 
                      className={`h-4 ${
                        quota.percent >= 90 ? '[&>div]:bg-destructive' : 
                        quota.percent >= 70 ? '[&>div]:bg-yellow-500' : 
                        '[&>div]:bg-green-500'
                      }`}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-white drop-shadow">
                        {quota.percent}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Used</p>
                      <p className="font-medium">{quota.used.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Limit</p>
                      <p className="font-medium">{quota.limit.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Remaining</p>
                      <p className={`font-medium ${quota.remaining < quota.limit * 0.1 ? 'text-destructive' : 'text-green-600'}`}>
                        {quota.remaining.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {quota.reset_time && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Resets: {quota.reset_time}
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
