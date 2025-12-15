import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart, Award, TrendingUp, Target, Users } from "lucide-react";

export function NetworkingBenchmarks() {
  const { data: benchmarkData, isLoading } = useQuery({
    queryKey: ['networking-benchmarks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's profile for industry context
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('industry, experience_level')
        .eq('user_id', user.id)
        .single();

      // Get user's networking metrics (including AI-generated contact suggestions)
      const [contacts, suggestions, interactions, campaigns, referrals] = await Promise.all([
        supabase.from('professional_contacts').select('count').eq('user_id', user.id).single(),
        supabase.from('contact_suggestions').select('count').eq('user_id', user.id).neq('status', 'dismissed').single(),
        supabase.from('contact_interactions').select('count').eq('user_id', user.id).single(),
        supabase.from('campaign_outreach').select('*').eq('user_id', user.id),
        supabase.from('referral_requests').select('*').eq('user_id', user.id)
      ]);

      const profContacts = contacts.data?.count || 0;
      const aiSuggestions = suggestions.data?.count || 0;
      
      // Get connected AI suggestions count
      const { data: connectedSuggestions } = await supabase
        .from('contact_suggestions')
        .select('count')
        .eq('user_id', user.id)
        .not('connected_at', 'is', null)
        .single();

      const userContacts = profContacts + (connectedSuggestions?.count || 0);
      const userInteractions = interactions.data?.count || 0;
      const userCampaigns = campaigns.data || [];
      const userReferrals = referrals.data || [];

      const userResponseRate = userCampaigns.length > 0
        ? Math.round((userCampaigns.filter(c => c.response_received).length / userCampaigns.length) * 100)
        : 0;

      const userReferralRate = userReferrals.length > 0
        ? Math.round((userReferrals.filter(r => r.status === 'successful').length / userReferrals.length) * 100)
        : 0;

      // Industry-specific benchmarks (based on research and best practices)
      const industryBenchmarks = {
        'Technology': {
          avgNetworkSize: 150,
          avgMonthlyInteractions: 20,
          avgResponseRate: 35,
          avgReferralSuccessRate: 25,
          bestPractices: [
            'Attend 1-2 tech meetups or conferences monthly',
            'Engage with open source communities',
            'Maintain active LinkedIn presence with technical content',
            'Join industry-specific Slack/Discord communities'
          ]
        },
        'Finance': {
          avgNetworkSize: 120,
          avgMonthlyInteractions: 15,
          avgResponseRate: 30,
          avgReferralSuccessRate: 30,
          bestPractices: [
            'Attend industry networking events quarterly',
            'Join professional associations (CFA, FPA)',
            'Leverage alumni networks from target firms',
            'Maintain connections with former colleagues'
          ]
        },
        'Healthcare': {
          avgNetworkSize: 100,
          avgMonthlyInteractions: 12,
          avgResponseRate: 40,
          avgReferralSuccessRate: 35,
          bestPractices: [
            'Attend medical conferences and CME events',
            'Join specialty-specific professional societies',
            'Network through hospital committees',
            'Maintain relationships with medical school connections'
          ]
        },
        'Marketing': {
          avgNetworkSize: 180,
          avgMonthlyInteractions: 25,
          avgResponseRate: 32,
          avgReferralSuccessRate: 22,
          bestPractices: [
            'Attend 2-3 marketing events monthly',
            'Engage actively on LinkedIn and Twitter',
            'Join marketing communities (GrowthHackers, Product Hunt)',
            'Contribute to marketing blogs and podcasts'
          ]
        },
        'Education': {
          avgNetworkSize: 90,
          avgMonthlyInteractions: 10,
          avgResponseRate: 45,
          avgReferralSuccessRate: 40,
          bestPractices: [
            'Attend education conferences (ISTE, ASCD)',
            'Join educator networks (Edutopia community)',
            'Participate in district committees',
            'Connect through professional development workshops'
          ]
        },
        'Default': {
          avgNetworkSize: 130,
          avgMonthlyInteractions: 18,
          avgResponseRate: 33,
          avgReferralSuccessRate: 27,
          bestPractices: [
            'Attend 1-2 industry events monthly',
            'Maintain active professional social media presence',
            'Join relevant professional associations',
            'Follow up within 24-48 hours after meeting contacts'
          ]
        }
      };

      const industry = profile?.industry || 'Default';
      const benchmarks = industryBenchmarks[industry as keyof typeof industryBenchmarks] || industryBenchmarks.Default;

      // Calculate monthly interaction rate
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      
      const recentInteractions = await supabase
        .from('contact_interactions')
        .select('count')
        .eq('user_id', user.id)
        .gte('interaction_date', monthAgo.toISOString())
        .single();

      const userMonthlyInteractions = recentInteractions.data?.count || 0;

      return {
        industry,
        user: {
          networkSize: userContacts,
          monthlyInteractions: userMonthlyInteractions,
          responseRate: userResponseRate,
          referralSuccessRate: userReferralRate
        },
        benchmarks,
        comparisons: {
          networkSize: userContacts > 0 ? Math.round((userContacts / benchmarks.avgNetworkSize) * 100) : 0,
          interactions: userMonthlyInteractions > 0 ? Math.round((userMonthlyInteractions / benchmarks.avgMonthlyInteractions) * 100) : 0,
          responseRate: userResponseRate > 0 ? Math.round((userResponseRate / benchmarks.avgResponseRate) * 100) : 0,
          referralRate: userReferralRate > 0 ? Math.round((userReferralRate / benchmarks.avgReferralSuccessRate) * 100) : 0
        }
      };
    }
  });

  if (isLoading) {
    return <Card><CardContent className="py-8 text-center">Loading benchmarks...</CardContent></Card>;
  }

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceLabel = (percentage: number) => {
    if (percentage >= 120) return 'Excellent';
    if (percentage >= 100) return 'Above Average';
    if (percentage >= 75) return 'Average';
    if (percentage >= 50) return 'Below Average';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Industry Benchmarks & Best Practices</h3>
        <p className="text-muted-foreground">
          Compare your networking performance against {benchmarkData?.industry || 'industry'} standards
        </p>
      </div>

      {/* Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Your Performance vs Industry Average
          </CardTitle>
          <CardDescription>
            Based on {benchmarkData?.industry || 'general'} industry benchmarks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Network Size
                </span>
                <span className={`text-sm font-bold ${getPerformanceColor(benchmarkData?.comparisons.networkSize || 0)}`}>
                  {getPerformanceLabel(benchmarkData?.comparisons.networkSize || 0)}
                </span>
              </div>
              <Progress value={Math.min(benchmarkData?.comparisons.networkSize || 0, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                You: {benchmarkData?.user.networkSize} | Industry Avg: {benchmarkData?.benchmarks.avgNetworkSize}
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Monthly Interactions
                </span>
                <span className={`text-sm font-bold ${getPerformanceColor(benchmarkData?.comparisons.interactions || 0)}`}>
                  {getPerformanceLabel(benchmarkData?.comparisons.interactions || 0)}
                </span>
              </div>
              <Progress value={Math.min(benchmarkData?.comparisons.interactions || 0, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                You: {benchmarkData?.user.monthlyInteractions} | Industry Avg: {benchmarkData?.benchmarks.avgMonthlyInteractions}
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Response Rate
                </span>
                <span className={`text-sm font-bold ${getPerformanceColor(benchmarkData?.comparisons.responseRate || 0)}`}>
                  {getPerformanceLabel(benchmarkData?.comparisons.responseRate || 0)}
                </span>
              </div>
              <Progress value={Math.min(benchmarkData?.comparisons.responseRate || 0, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                You: {benchmarkData?.user.responseRate}% | Industry Avg: {benchmarkData?.benchmarks.avgResponseRate}%
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Referral Success Rate
                </span>
                <span className={`text-sm font-bold ${getPerformanceColor(benchmarkData?.comparisons.referralRate || 0)}`}>
                  {getPerformanceLabel(benchmarkData?.comparisons.referralRate || 0)}
                </span>
              </div>
              <Progress value={Math.min(benchmarkData?.comparisons.referralRate || 0, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                You: {benchmarkData?.user.referralSuccessRate}% | Industry Avg: {benchmarkData?.benchmarks.avgReferralSuccessRate}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            {benchmarkData?.industry} Networking Best Practices
          </CardTitle>
          <CardDescription>Proven strategies for success in your industry</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {benchmarkData?.benchmarks.bestPractices.map((practice, idx) => (
              <li key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                  <Award className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm">{practice}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
