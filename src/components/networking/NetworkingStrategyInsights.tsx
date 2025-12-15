import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, TrendingUp, Target, Award, RefreshCw, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export function NetworkingStrategyInsights() {
  const { data: insights, isLoading, refetch } = useQuery({
    queryKey: ['networking-strategy-insights'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch networking data to analyze (including AI-generated suggestions)
      const [contacts, suggestions, interactions, campaigns, events, referrals] = await Promise.all([
        supabase.from('professional_contacts').select('*').eq('user_id', user.id),
        supabase.from('contact_suggestions').select('*').eq('user_id', user.id).neq('status', 'dismissed'),
        supabase.from('contact_interactions').select('*').eq('user_id', user.id),
        supabase.from('campaign_outreach').select('*').eq('user_id', user.id),
        supabase.from('networking_event_connections').select('*').eq('user_id', user.id),
        supabase.from('referral_requests').select('*').eq('user_id', user.id)
      ]);

      const contactsData = contacts.data || [];
      const suggestionsData = suggestions.data || [];
      const interactionsData = interactions.data || [];
      const campaignsData = campaigns.data || [];
      const eventsData = events.data || [];
      const referralsData = referrals.data || [];

      // Total contacts includes both professional contacts and connected AI suggestions
      const totalContactsCount = contactsData.length + suggestionsData.filter(s => s.connected_at || s.contacted_at).length;

      // Analyze most effective strategies
      const strategies = [];

      // 1. Most effective outreach channel
      const emailOutreach = campaignsData.filter(c => c.outreach_type === 'email').length;
      const linkedInOutreach = campaignsData.filter(c => c.outreach_type === 'linkedin').length;
      const eventOutreach = eventsData.length;

      const emailResponses = campaignsData.filter(c => c.outreach_type === 'email' && c.response_received).length;
      const linkedInResponses = campaignsData.filter(c => c.outreach_type === 'linkedin' && c.response_received).length;
      const eventFollowUps = eventsData.filter(e => e.follow_up_completed).length;

      const emailRate = emailOutreach > 0 ? Math.round((emailResponses / emailOutreach) * 100) : 0;
      const linkedInRate = linkedInOutreach > 0 ? Math.round((linkedInResponses / linkedInOutreach) * 100) : 0;
      const eventRate = eventOutreach > 0 ? Math.round((eventFollowUps / eventOutreach) * 100) : 0;

      const bestChannel = Math.max(emailRate, linkedInRate, eventRate);
      const channelName = 
        bestChannel === emailRate ? 'Email' :
        bestChannel === linkedInRate ? 'LinkedIn' :
        'Events';

      if (bestChannel > 0) {
        strategies.push({
          type: 'success',
          title: `${channelName} is your most effective channel`,
          description: `With a ${bestChannel}% response rate, focus more efforts here`,
          recommendation: `Increase ${channelName.toLowerCase()} outreach by 20% this month`,
          icon: TrendingUp
        });
      }

      // 2. Relationship maintenance insight
      const lastMonthInteractions = interactionsData.filter(i => {
        const interactionDate = new Date(i.interaction_date);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return interactionDate > monthAgo;
      }).length;

      const dormantContacts = contactsData.filter(c => {
        const lastContact = new Date(c.last_contacted_at || c.created_at);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return lastContact < threeMonthsAgo;
      }).length;

      if (dormantContacts > 5) {
        strategies.push({
          type: 'warning',
          title: 'Reconnect with dormant relationships',
          description: `${dormantContacts} contacts haven't been contacted in 3+ months`,
          recommendation: 'Schedule 2-3 re-engagement messages per week',
          icon: Target
        });
      }

      // 3. Referral strategy effectiveness
      const successfulReferrals = referralsData.filter(r => r.status === 'successful').length;
      const referralRate = referralsData.length > 0 
        ? Math.round((successfulReferrals / referralsData.length) * 100)
        : 0;

      if (referralRate > 30) {
        strategies.push({
          type: 'success',
          title: 'Strong referral conversion rate',
          description: `${referralRate}% of referral requests are successful`,
          recommendation: 'Double down on referral requests - your network is responding well',
          icon: Award
        });
      } else if (referralsData.length > 5 && referralRate < 20) {
        strategies.push({
          type: 'info',
          title: 'Improve referral approach',
          description: `${referralRate}% success rate suggests room for improvement`,
          recommendation: 'Personalize requests more and provide specific value propositions',
          icon: Lightbulb
        });
      }

      // 4. Networking consistency insight
      const recentMonthsActivity = [];
      for (let i = 2; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthActivity = 
          interactionsData.filter(int => {
            const d = new Date(int.interaction_date);
            return d >= monthStart && d <= monthEnd;
          }).length +
          campaignsData.filter(c => {
            const d = new Date(c.sent_at);
            return d >= monthStart && d <= monthEnd;
          }).length +
          suggestionsData.filter(s => {
            if (!s.contacted_at) return false;
            const d = new Date(s.contacted_at);
            return d >= monthStart && d <= monthEnd;
          }).length;

        recentMonthsActivity.push(monthActivity);
      }

      const isConsistent = recentMonthsActivity.every(a => a > 0) && 
        Math.max(...recentMonthsActivity) - Math.min(...recentMonthsActivity) < 10;

      if (isConsistent) {
        strategies.push({
          type: 'success',
          title: 'Excellent networking consistency',
          description: 'You maintain steady networking activity across months',
          recommendation: 'Keep up this consistent approach - it builds long-term relationships',
          icon: CheckCircle
        });
      } else {
        strategies.push({
          type: 'info',
          title: 'Improve networking consistency',
          description: 'Activity fluctuates significantly month-to-month',
          recommendation: 'Set weekly networking goals to maintain steady relationship building',
          icon: Target
        });
      }

      // 5. Quality vs Quantity insight (use total contacts including suggestions)
      const avgInteractionsPerContact = totalContactsCount > 0
        ? Math.round((interactionsData.length / totalContactsCount) * 10) / 10
        : 0;

      if (avgInteractionsPerContact > 3) {
        strategies.push({
          type: 'success',
          title: 'Strong relationship depth',
          description: `${avgInteractionsPerContact} interactions per contact shows quality focus`,
          recommendation: 'Continue nurturing existing relationships while slowly expanding network',
          icon: Award
        });
      } else if (totalContactsCount > 20 && avgInteractionsPerContact < 1.5) {
        strategies.push({
          type: 'warning',
          title: 'Focus on relationship depth',
          description: 'Large network but low engagement per contact',
          recommendation: 'Prioritize deepening top 20 relationships over expanding network',
          icon: Target
        });
      }

      return strategies;
    }
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('analyze-networking-strategy');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Networking insights refreshed');
      refetch();
    },
    onError: (error) => {
      console.error('Error generating insights:', error);
      toast.error('Failed to refresh insights');
    }
  });

  if (isLoading) {
    return <Card><CardContent className="py-8 text-center">Loading strategy insights...</CardContent></Card>;
  }

  const getIconColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-muted-foreground';
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 dark:bg-green-950/20 border-l-green-500';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-950/20 border-l-yellow-500';
      case 'info': return 'bg-blue-50 dark:bg-blue-950/20 border-l-blue-500';
      default: return 'bg-background';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold mb-2">Networking Strategy Insights</h3>
          <p className="text-muted-foreground">Data-driven recommendations for most effective strategies</p>
        </div>
        <Button
          onClick={() => generateInsightsMutation.mutate()}
          disabled={generateInsightsMutation.isPending}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${generateInsightsMutation.isPending ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {insights && insights.length > 0 ? (
        <div className="grid gap-4">
          {insights.map((insight, idx) => {
            const Icon = insight.icon;
            return (
              <Card key={idx} className={`border-l-4 ${getBgColor(insight.type)}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${getIconColor(insight.type)}`} />
                    {insight.title}
                  </CardTitle>
                  <CardDescription>{insight.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-background/50 p-4 rounded-lg">
                    <p className="text-sm font-medium mb-1">💡 Recommendation:</p>
                    <p className="text-sm text-muted-foreground">{insight.recommendation}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Lightbulb className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Insights Available Yet</p>
            <p className="text-sm mb-4">Build your networking activity to generate strategic insights</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
