import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Users, Mail, Award } from "lucide-react";

export function CampaignAnalytics() {
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['networking-campaigns-analytics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('networking_campaigns')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    }
  });

  const { data: totalMetrics } = useQuery({
    queryKey: ['campaign-total-metrics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('campaign_metrics')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const totals = (data || []).reduce((acc, metric) => ({
        outreach_sent: acc.outreach_sent + (metric.outreach_sent || 0),
        responses_received: acc.responses_received + (metric.responses_received || 0),
        connections_made: acc.connections_made + (metric.connections_made || 0),
        meetings_scheduled: acc.meetings_scheduled + (metric.meetings_scheduled || 0),
      }), { outreach_sent: 0, responses_received: 0, connections_made: 0, meetings_scheduled: 0 });

      return totals;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const responseRate = totalMetrics && totalMetrics.outreach_sent > 0
    ? (totalMetrics.responses_received / totalMetrics.outreach_sent) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Campaign Analytics</h2>
        <p className="text-muted-foreground">
          Track performance across all your networking campaigns
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Total Outreach
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics?.outreach_sent || 0}</div>
            <p className="text-xs text-muted-foreground">Messages sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Responses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics?.responses_received || 0}</div>
            <p className="text-xs text-muted-foreground">{Math.round(responseRate)}% response rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics?.connections_made || 0}</div>
            <p className="text-xs text-muted-foreground">New connections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics?.meetings_scheduled || 0}</div>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Overview</CardTitle>
          <CardDescription>
            {campaigns?.length || 0} active campaign{campaigns?.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns && campaigns.length > 0 ? (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{campaign.campaign_name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{campaign.campaign_type} • {campaign.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No campaigns yet. Create one to see analytics!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
