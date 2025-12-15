import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, TrendingUp, Users, Award, MessageCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export function RelationshipStrengthAnalyzer() {
  const { data: relationshipData, isLoading } = useQuery({
    queryKey: ['relationship-strength-analysis'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get relationship health metrics (pre-calculated)
      const { data: healthMetrics, error: healthError } = await supabase
        .from('relationship_health_metrics')
        .select('*')
        .eq('user_id', user.id);

      if (healthError) throw healthError;

      // Get all contacts, referrals, and campaigns for comprehensive analysis
      const [profContactsRes, suggestionsRes, referralsRes, campaignsRes] = await Promise.all([
        supabase.from('professional_contacts').select('*').eq('user_id', user.id),
        supabase.from('contact_suggestions').select('*').eq('user_id', user.id).neq('status', 'dismissed'),
        supabase.from('referral_requests').select('*').eq('user_id', user.id),
        supabase.from('campaign_outreach').select('*').eq('user_id', user.id)
      ]);

      if (profContactsRes.error) throw profContactsRes.error;
      if (suggestionsRes.error) throw suggestionsRes.error;
      if (referralsRes.error) throw referralsRes.error;
      if (campaignsRes.error) throw campaignsRes.error;

      const allContacts = profContactsRes.data || [];
      const allSuggestions = suggestionsRes.data || [];
      const referrals = referralsRes.data || [];
      const campaigns = campaignsRes.data || [];
      const metrics = healthMetrics || [];

      // Enrich metrics with contact details from BOTH professional_contacts AND contact_suggestions
      const enrichedMetrics = await Promise.all(metrics.map(async (metric) => {
        // Try professional_contacts first
        const profContact = allContacts.find(c => c.id === metric.contact_id);
        if (profContact) {
          return {
            ...metric,
            professional_contacts: {
              first_name: profContact.first_name,
              last_name: profContact.last_name,
              current_company: profContact.current_company,
              relationship_strength: profContact.relationship_strength,
              opportunities_generated: profContact.opportunities_generated || 0
            }
          };
        }

        // If not found, try contact_suggestions
        const suggContact = allSuggestions.find(s => s.id === metric.contact_id);
        if (suggContact) {
          return {
            ...metric,
            professional_contacts: {
              first_name: suggContact.contact_name?.split(' ')[0] || '',
              last_name: suggContact.contact_name?.split(' ').slice(1).join(' ') || '',
              current_company: suggContact.contact_company || '',
              relationship_strength: 'weak',
              opportunities_generated: 0
            }
          };
        }

        return metric;
      }));

      // Calculate average engagement quality (using engagement_level from pre-calculated health metrics)
      const engagementScoreMap = { high: 80, moderate: 50, low: 20 };
      const avgEngagementQuality = enrichedMetrics.length > 0
        ? Math.round(enrichedMetrics.reduce((acc, m) => acc + (engagementScoreMap[m.engagement_level as keyof typeof engagementScoreMap] || 0), 0) / enrichedMetrics.length)
        : 0;

      // Calculate average health score from pre-calculated metrics
      const avgHealthScore = enrichedMetrics.length > 0
        ? Math.round(enrichedMetrics.reduce((acc, m) => acc + (m.health_score || 0), 0) / enrichedMetrics.length)
        : 0;

      // Count relationship strength distribution (including both contacts and suggestions)
      const strengthDistribution = {
        strong: allContacts.filter(c => c.relationship_strength === 'strong').length,
        moderate: allContacts.filter(c => c.relationship_strength === 'moderate').length,
        weak: allContacts.filter(c => c.relationship_strength === 'weak').length + allSuggestions.filter(s => s.connected_at || s.contacted_at).length,
      };

      // Calculate improving vs declining relationships (based on health_status from calculated metrics)
      const improvingRelationships = enrichedMetrics.filter(m => m.health_status === 'healthy').length;
      const decliningRelationships = enrichedMetrics.filter(m => m.health_status === 'at_risk').length;
      const stableRelationships = enrichedMetrics.filter(m => m.health_status === 'moderate').length;

      // Top engaged relationships (from enriched metrics)
      const topEngagedContacts = enrichedMetrics
        .filter(m => (m as any).professional_contacts)
        .sort((a, b) => (engagementScoreMap[b.engagement_level as keyof typeof engagementScoreMap] || 0) - (engagementScoreMap[a.engagement_level as keyof typeof engagementScoreMap] || 0))
        .slice(0, 5)
        .map(m => ({
          name: `${(m as any).professional_contacts.first_name} ${(m as any).professional_contacts.last_name}`,
          company: (m as any).professional_contacts.current_company,
          score: engagementScoreMap[m.engagement_level as keyof typeof engagementScoreMap] || 0,
          strength: (m as any).professional_contacts.relationship_strength
        }));

      // Calculate opportunities generated from contacts AND referrals
      const contactOpportunities = enrichedMetrics.reduce((acc, m) => 
        acc + ((m as any).professional_contacts?.opportunities_generated || 0), 0
      );
      const referralOpportunities = referrals.filter(r => r.status === 'successful').length;
      const totalOpportunities = contactOpportunities + referralOpportunities;

      // Calculate campaign engagement success
      const campaignResponses = campaigns.filter(c => c.response_received).length;
      const campaignResponseRate = campaigns.length > 0 
        ? Math.round((campaignResponses / campaigns.length) * 100) 
        : 0;

      // Calculate mutual value exchange and reciprocity
      // Value RECEIVED: referrals received, job opportunities, introductions
      const valueReceived = {
        referralsReceived: referralOpportunities,
        jobOpportunities: contactOpportunities,
        totalValue: referralOpportunities + contactOpportunities
      };

      // Value GIVEN: outreach sent, campaigns initiated, contacts made
      const valueGiven = {
        outreachSent: campaigns.length,
        connectionsInitiated: allContacts.filter(c => c.how_we_met?.includes('outreach') || c.how_we_met?.includes('reached out')).length,
        totalValue: campaigns.length
      };

      // Calculate reciprocity score (balanced relationships score higher)
      const reciprocityScore = valueReceived.totalValue + valueGiven.totalValue > 0
        ? Math.round((Math.min(valueReceived.totalValue, valueGiven.totalValue) / Math.max(valueReceived.totalValue, valueGiven.totalValue, 1)) * 100)
        : 0;

      return {
        avgEngagementQuality,
        avgHealthScore,
        strengthDistribution,
        improvingRelationships,
        decliningRelationships,
        stableRelationships,
        topEngagedContacts,
        totalOpportunities,
        referralOpportunities,
        contactOpportunities,
        campaignResponseRate,
        totalCampaigns: campaigns.length,
        valueReceived,
        valueGiven,
        reciprocityScore,
        totalRelationships: allContacts.length + allSuggestions.filter(s => s.connected_at || s.contacted_at).length
      };
    }
  });

  if (isLoading) {
    return <Card><CardContent className="py-8 text-center">Loading relationship analysis...</CardContent></Card>;
  }

  const pieData = relationshipData ? [
    { name: 'Strong', value: relationshipData.strengthDistribution.strong, color: 'hsl(142 76% 36%)' },
    { name: 'Moderate', value: relationshipData.strengthDistribution.moderate, color: 'hsl(47 96% 53%)' },
    { name: 'Weak', value: relationshipData.strengthDistribution.weak, color: 'hsl(0 84% 60%)' }
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Relationship Strength & Engagement</h3>
        <p className="text-muted-foreground">Analyze relationship quality and development trends</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Health Score</CardTitle>
            <Heart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{relationshipData?.avgHealthScore || 0}</div>
            <Progress value={relationshipData?.avgHealthScore || 0} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Quality</CardTitle>
            <MessageCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{relationshipData?.avgEngagementQuality || 0}</div>
            <Progress value={relationshipData?.avgEngagementQuality || 0} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Improving</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{relationshipData?.improvingRelationships || 0}</div>
            <p className="text-xs text-muted-foreground">
              {relationshipData?.stableRelationships || 0} stable, {relationshipData?.decliningRelationships || 0} declining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Opportunities</CardTitle>
            <Award className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{relationshipData?.totalOpportunities || 0}</div>
            <p className="text-xs text-muted-foreground">
              {relationshipData?.referralOpportunities || 0} referrals, {relationshipData?.contactOpportunities || 0} contacts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaign Response Rate</CardTitle>
            <MessageCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{relationshipData?.campaignResponseRate || 0}%</div>
            <Progress value={relationshipData?.campaignResponseRate || 0} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {relationshipData?.totalCampaigns || 0} total campaigns sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referral Success</CardTitle>
            <Award className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{relationshipData?.referralOpportunities || 0}</div>
            <p className="text-xs text-muted-foreground">
              Successful referrals generated
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mutual Value Exchange & Reciprocity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            Mutual Value Exchange & Reciprocity
          </CardTitle>
          <CardDescription>Track the balance of value in your professional relationships</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Value Received */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground">Value Received</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Referrals Received</span>
                  <span className="font-bold">{relationshipData?.valueReceived.referralsReceived || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Job Opportunities</span>
                  <span className="font-bold">{relationshipData?.valueReceived.jobOpportunities || 0}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Value</span>
                    <span className="font-bold text-lg text-green-600">{relationshipData?.valueReceived.totalValue || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reciprocity Score */}
            <div className="space-y-3 flex flex-col items-center justify-center border-x px-4">
              <h4 className="font-semibold text-sm text-muted-foreground">Reciprocity Score</h4>
              <div className="relative">
                <div className="text-5xl font-bold text-purple-600">{relationshipData?.reciprocityScore || 0}</div>
                <div className="text-center text-xs text-muted-foreground mt-1">Balance</div>
              </div>
              <Progress value={relationshipData?.reciprocityScore || 0} className="h-3 w-full" />
              <p className="text-xs text-center text-muted-foreground">
                {(relationshipData?.reciprocityScore || 0) >= 80 ? 'Excellent balance' :
                 (relationshipData?.reciprocityScore || 0) >= 60 ? 'Good balance' :
                 (relationshipData?.reciprocityScore || 0) >= 40 ? 'Moderate balance' :
                 'Focus on building reciprocity'}
              </p>
            </div>

            {/* Value Given */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground">Value Given</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Outreach Sent</span>
                  <span className="font-bold">{relationshipData?.valueGiven.outreachSent || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Connections Initiated</span>
                  <span className="font-bold">{relationshipData?.valueGiven.connectionsInitiated || 0}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Value</span>
                    <span className="font-bold text-lg text-blue-600">{relationshipData?.valueGiven.totalValue || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">💡 Reciprocity Insight:</span>{' '}
              {(relationshipData?.reciprocityScore || 0) >= 80 
                ? 'Your network shows excellent mutual value exchange. Both you and your contacts benefit from these relationships.'
                : (relationshipData?.reciprocityScore || 0) >= 60
                ? 'Good reciprocity in your network. Continue balancing giving and receiving value.'
                : (relationshipData?.reciprocityScore || 0) >= 40
                ? 'Consider ways to increase mutual value exchange. Offer help, make introductions, and share opportunities.'
                : 'Focus on building balanced relationships. Look for opportunities to provide value to your network while also asking for support when needed.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Relationship Strength Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Relationship Strength Distribution</CardTitle>
            <CardDescription>Breakdown of relationship quality across your network</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No relationship data available yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Engaged Contacts */}
        <Card>
          <CardHeader>
            <CardTitle>Top Engaged Relationships</CardTitle>
            <CardDescription>Contacts with highest engagement quality</CardDescription>
          </CardHeader>
          <CardContent>
            {relationshipData?.topEngagedContacts && relationshipData.topEngagedContacts.length > 0 ? (
              <div className="space-y-4">
                {relationshipData.topEngagedContacts.map((contact, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">{contact.company}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{contact.score}</div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        contact.strength === 'strong' ? 'bg-green-100 text-green-700' :
                        contact.strength === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {contact.strength}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Build relationships to see engagement metrics</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
