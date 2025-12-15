import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CreateCampaignDialog } from "./CreateCampaignDialog";
import { CampaignDetailsDialog } from "./CampaignDetailsDialog";
import { Loader2, Target, Plus, Calendar, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function CampaignList() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['networking-campaigns'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('networking_campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch metrics for each campaign
      const campaignsWithMetrics = await Promise.all(
        (data || []).map(async (campaign) => {
          const { data: metrics } = await supabase
            .from('campaign_metrics')
            .select('*')
            .eq('campaign_id', campaign.id)
            .order('metric_date', { ascending: false });

          const totalMetrics = metrics?.reduce((acc, m) => ({
            outreach_sent: acc.outreach_sent + (m.outreach_sent || 0),
            responses_received: acc.responses_received + (m.responses_received || 0),
            connections_made: acc.connections_made + (m.connections_made || 0),
          }), { outreach_sent: 0, responses_received: 0, connections_made: 0 });

          const goals = (campaign.goals || {}) as { outreach_target?: number; response_target?: number; connection_target?: number };
          
          return {
            ...campaign,
            goals,
            metrics: totalMetrics,
            response_rate: totalMetrics && totalMetrics.outreach_sent > 0
              ? (totalMetrics.responses_received / totalMetrics.outreach_sent) * 100
              : 0
          };
        })
      );

      return campaignsWithMetrics;
    }
  });

  const updateCampaignStatus = useMutation({
    mutationFn: async ({ campaignId, status }: { campaignId: string; status: string }) => {
      const { error } = await supabase
        .from('networking_campaigns')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networking-campaigns'] });
      toast.success('Campaign status updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update campaign');
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { variant: "default", label: "Active" },
      paused: { variant: "secondary", label: "Paused" },
      completed: { variant: "outline", label: "Completed" },
      archived: { variant: "outline", label: "Archived" }
    };
    return variants[status] || variants.active;
  };

  const getCampaignTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      industry: "Industry Targeting",
      company: "Company Targeting",
      role: "Role Targeting",
      custom: "Custom Campaign"
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Your Campaigns</h2>
          <p className="text-muted-foreground">Manage your networking campaigns and track progress</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {campaigns && campaigns.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => {
            const goals = campaign.goals as { outreach_target?: number; response_target?: number; connection_target?: number };
            const outreachProgress = goals?.outreach_target 
              ? (campaign.metrics?.outreach_sent || 0) / goals.outreach_target * 100 
              : 0;
            const responseProgress = goals?.response_target
              ? (campaign.metrics?.responses_received || 0) / goals.response_target * 100
              : 0;

            return (
              <Card 
                key={campaign.id} 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => {
                  setSelectedCampaign(campaign);
                  setDetailsDialogOpen(true);
                }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{campaign.campaign_name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {campaign.description || 'No description'}
                      </CardDescription>
                    </div>
                    <Badge {...getStatusBadge(campaign.status)} className="ml-2">
                      {getStatusBadge(campaign.status).label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span>{getCampaignTypeLabel(campaign.campaign_type)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(campaign.start_date), 'MMM dd, yyyy')}
                      {campaign.end_date && ` - ${format(new Date(campaign.end_date), 'MMM dd, yyyy')}`}
                    </span>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="space-y-1">
                        <div className="text-2xl font-bold">{campaign.metrics?.outreach_sent || 0}</div>
                        <div className="text-xs text-muted-foreground">Outreach</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-2xl font-bold">{campaign.metrics?.responses_received || 0}</div>
                        <div className="text-xs text-muted-foreground">Responses</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-2xl font-bold">{Math.round(campaign.response_rate || 0)}%</div>
                        <div className="text-xs text-muted-foreground">Rate</div>
                      </div>
                    </div>

                    {goals?.outreach_target && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Outreach Goal</span>
                          <span className="font-medium">
                            {campaign.metrics?.outreach_sent || 0}/{goals.outreach_target}
                          </span>
                        </div>
                        <Progress value={Math.min(outreachProgress, 100)} />
                      </div>
                    )}

                    {goals?.response_target && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Response Goal</span>
                          <span className="font-medium">
                            {campaign.metrics?.responses_received || 0}/{goals.response_target}
                          </span>
                        </div>
                        <Progress value={Math.min(responseProgress, 100)} />
                      </div>
                    )}
                  </div>

                  {campaign.target_companies && campaign.target_companies.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t">
                      {campaign.target_companies.slice(0, 3).map((company: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {company}
                        </Badge>
                      ))}
                      {campaign.target_companies.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{campaign.target_companies.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first networking campaign to start building targeted relationships
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateCampaignDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
      />

      {selectedCampaign && (
        <CampaignDetailsDialog
          campaign={selectedCampaign}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />
      )}
    </div>
  );
}
