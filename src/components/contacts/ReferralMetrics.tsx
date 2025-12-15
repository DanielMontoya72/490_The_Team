import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, CheckCircle, Clock, Users, Target } from "lucide-react";

export function ReferralMetrics() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['referral-metrics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: requests, error } = await supabase
        .from('referral_requests')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const total = requests?.length || 0;
      const sent = requests?.filter(r => r.status !== 'draft').length || 0;
      const successful = requests?.filter(r => r.status === 'successful').length || 0;
      const accepted = requests?.filter(r => r.status === 'accepted').length || 0;
      const declined = requests?.filter(r => r.status === 'declined').length || 0;
      const pending = requests?.filter(r => r.status === 'sent').length || 0;
      
      // Calculate average response time for those who received responses
      const responseTimes = requests?.filter(r => r.response_received_at && r.requested_at)
        .map(r => {
          const requested = new Date(r.requested_at!).getTime();
          const received = new Date(r.response_received_at!).getTime();
          return (received - requested) / (1000 * 60 * 60 * 24); // days
        }) || [];
      
      const avgResponseTime = responseTimes.length > 0 
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : null;

      const successRate = sent > 0 ? Math.round((successful / sent) * 100) : 0;
      const responseRate = sent > 0 ? Math.round(((accepted + declined) / sent) * 100) : 0;

      return {
        total,
        sent,
        successful,
        accepted,
        declined,
        pending,
        successRate,
        responseRate,
        avgResponseTime,
      };
    },
  });

  if (isLoading) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">Loading metrics...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Referral Performance Metrics
        </CardTitle>
        <CardDescription>Track your referral request success and response patterns</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Requests</p>
            <p className="text-2xl font-bold">{metrics?.total || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Pending
            </p>
            <p className="text-2xl font-bold text-yellow-600">{metrics?.pending || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Accepted
            </p>
            <p className="text-2xl font-bold text-green-600">{metrics?.accepted || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" />
              Successful
            </p>
            <p className="text-2xl font-bold text-primary">{metrics?.successful || 0}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Success Rate</span>
              <span className="text-sm text-muted-foreground">{metrics?.successRate}%</span>
            </div>
            <Progress value={metrics?.successRate} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.successful} successful out of {metrics?.sent} sent requests
            </p>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Response Rate</span>
              <span className="text-sm text-muted-foreground">{metrics?.responseRate}%</span>
            </div>
            <Progress value={metrics?.responseRate} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {(metrics?.accepted || 0) + (metrics?.declined || 0)} responses received
            </p>
          </div>
        </div>

        {metrics?.avgResponseTime !== null && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Average Response Time</p>
                <p className="text-2xl font-bold">{metrics.avgResponseTime} days</p>
              </div>
            </div>
          </div>
        )}

        {metrics?.sent === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Send your first referral request to see metrics
          </div>
        )}
      </CardContent>
    </Card>
  );
}
