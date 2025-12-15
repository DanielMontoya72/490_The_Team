import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Calendar, TrendingUp, Mail, UserPlus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export function NetworkingActivityTracker() {
  const { data: activityMetrics, isLoading } = useQuery({
    queryKey: ['networking-activity-metrics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get all networking-related data INCLUDING AI-generated contact suggestions
      const [contactsData, suggestionsData, interactionsData, eventsData, campaignsData, referralsData] = await Promise.all([
        supabase.from('professional_contacts').select('*').eq('user_id', user.id),
        supabase.from('contact_suggestions').select('*').eq('user_id', user.id).neq('status', 'dismissed'),
        supabase.from('contact_interactions').select('*').eq('user_id', user.id),
        supabase.from('networking_event_connections').select('*').eq('user_id', user.id),
        supabase.from('campaign_outreach').select('*').eq('user_id', user.id),
        supabase.from('referral_requests').select('*').eq('user_id', user.id)
      ]);

      const contacts = contactsData.data || [];
      const suggestions = suggestionsData.data || [];
      const interactions = interactionsData.data || [];
      const events = eventsData.data || [];
      const campaigns = campaignsData.data || [];
      const referrals = referralsData.data || [];

      // Calculate metrics - include BOTH professional contacts AND AI-generated suggestions
      const connectedSuggestions = suggestions.filter(s => s.connected_at || s.contacted_at).length;
      const totalContacts = contacts.length + connectedSuggestions;
      const activeContacts = totalContacts; // All contacts are considered active
      const newContactsThisMonth = contacts.filter(c => {
        const createdDate = new Date(c.created_at);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return createdDate > monthAgo;
      }).length + suggestions.filter(s => {
        if (!s.connected_at && !s.contacted_at) return false;
        const connectedDate = new Date(s.connected_at || s.contacted_at);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return connectedDate > monthAgo;
      }).length;

      const totalInteractions = interactions.length;
      const interactionsThisMonth = interactions.filter(i => {
        const interactionDate = new Date(i.interaction_date);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return interactionDate > monthAgo;
      }).length;

      const totalEventConnections = events.length;
      const followUpsCompleted = events.filter(e => e.follow_up_completed).length;

      const totalCampaignOutreach = campaigns.length;
      const campaignResponses = campaigns.filter(c => c.response_received).length;

      const totalReferralRequests = referrals.length;
      const successfulReferrals = referrals.filter(r => r.status === 'successful').length;

      // Calculate relationship building progress
      const relationshipGrowthRate = totalContacts > 0 
        ? Math.round((newContactsThisMonth / totalContacts) * 100)
        : 0;

      const engagementRate = totalContacts > 0
        ? Math.round((interactionsThisMonth / totalContacts) * 100)
        : 0;

      // Activity over time (last 6 months)
      const monthlyActivity = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const contactsAdded = contacts.filter(c => {
          const created = new Date(c.created_at);
          return created >= monthStart && created <= monthEnd;
        }).length + suggestions.filter(s => {
          if (!s.connected_at && !s.contacted_at) return false;
          const connectedDate = new Date(s.connected_at || s.contacted_at);
          return connectedDate >= monthStart && connectedDate <= monthEnd;
        }).length;

        const interactionsCount = interactions.filter(i => {
          const interactionDate = new Date(i.interaction_date);
          return interactionDate >= monthStart && interactionDate <= monthEnd;
        }).length;

        const outreachCount = campaigns.filter(c => {
          const sentDate = new Date(c.sent_at);
          return sentDate >= monthStart && sentDate <= monthEnd;
        }).length;

        monthlyActivity.push({
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          contacts: contactsAdded,
          interactions: interactionsCount,
          outreach: outreachCount
        });
      }

      return {
        totalContacts,
        activeContacts,
        newContactsThisMonth,
        totalInteractions,
        interactionsThisMonth,
        totalEventConnections,
        followUpsCompleted,
        totalCampaignOutreach,
        campaignResponses,
        totalReferralRequests,
        successfulReferrals,
        relationshipGrowthRate,
        engagementRate,
        monthlyActivity
      };
    }
  });

  if (isLoading) {
    return <Card><CardContent className="py-8 text-center">Loading activity metrics...</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Networking Activity Overview</h3>
        <p className="text-muted-foreground">Track your networking volume and relationship building progress</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activityMetrics?.totalContacts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {activityMetrics?.activeContacts || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Growth</CardTitle>
            <UserPlus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activityMetrics?.newContactsThisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">
              {activityMetrics?.relationshipGrowthRate || 0}% growth rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interactions</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activityMetrics?.totalInteractions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {activityMetrics?.interactionsThisMonth || 0} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activityMetrics?.engagementRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Monthly interaction rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Event Networking</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activityMetrics?.totalEventConnections || 0}</div>
            <p className="text-xs text-muted-foreground">
              {activityMetrics?.followUpsCompleted || 0} follow-ups completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaign Outreach</CardTitle>
            <Mail className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activityMetrics?.totalCampaignOutreach || 0}</div>
            <p className="text-xs text-muted-foreground">
              {activityMetrics?.campaignResponses || 0} responses received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referral Requests</CardTitle>
            <UserPlus className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activityMetrics?.totalReferralRequests || 0}</div>
            <p className="text-xs text-muted-foreground">
              {activityMetrics?.successfulReferrals || 0} successful
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Trends Chart */}
      {activityMetrics?.monthlyActivity && activityMetrics.monthlyActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Trends (6 Months)</CardTitle>
            <CardDescription>Track your networking activity volume over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityMetrics.monthlyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="contacts" fill="hsl(var(--primary))" name="New Contacts" />
                <Bar dataKey="interactions" fill="hsl(142 76% 36%)" name="Interactions" />
                <Bar dataKey="outreach" fill="hsl(217 91% 60%)" name="Outreach" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
