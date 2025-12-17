import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, DollarSign, Target, Sparkles, BarChart3, Calendar, Award, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SalaryProgressionChart } from "./SalaryProgressionChart";
import { MarketPositionCard } from "./MarketPositionCard";
import { NegotiationPerformance } from "./NegotiationPerformance";
import { SalaryRecommendations } from "./SalaryRecommendations";
import { AddSalaryEntryDialog } from "./AddSalaryEntryDialog";
import { CompensationTrends } from "./CompensationTrends";
import { IndustryBenchmarks } from "./IndustryBenchmarks";

export function SalaryAnalyticsDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  // Fetch salary progression data
  const { data: salaryProgression, isLoading: loadingProgression } = useQuery({
    queryKey: ['salary-progression'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('salary_progression')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch salary research data (from job applications)
  const { data: salaryResearch, isLoading: loadingResearch } = useQuery({
    queryKey: ['salary-research-all'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('salary_research')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Ensure salaryResearch is always an array
  const salaryData = Array.isArray(salaryResearch) ? salaryResearch : [];

  // Fetch user profile for context
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-salary'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Fetch employment history for experience calculation
  const { data: employmentHistory } = useQuery({
    queryKey: ['employment-history-salary'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('employment_history')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate years of experience
  const yearsExperience = employmentHistory?.reduce((total, job) => {
    const start = new Date(job.start_date);
    const end = job.is_current ? new Date() : new Date(job.end_date || new Date());
    return total + Math.max(0, (end.getFullYear() - start.getFullYear()));
  }, 0) || 0;

  // Get current compensation from most recent entry
  const currentEntry = salaryProgression?.find(s => s.is_current) || salaryProgression?.[salaryProgression.length - 1];
  const currentCompensation = currentEntry?.total_compensation || 0;

  // Calculate negotiation stats
  const negotiationStats = {
    total: salaryData.filter(r => r.negotiation_outcome).length || 0,
    successful: salaryData.filter(r => r.negotiation_success).length || 0,
    avgIncrease: salaryData.reduce((sum, r) => sum + (r.salary_increase_percentage || 0), 0) / 
      (salaryData.filter(r => r.salary_increase_percentage).length || 1) || 0,
  };

  // Generate AI analysis
  const analysisMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('analyze-salary-progression', {
        body: {
          salaryProgression: salaryProgression || [],
          currentCompensation,
          marketData: salaryData[0] || {},
          negotiationHistory: salaryData.filter(r => r.negotiation_outcome) || [],
          industry: userProfile?.industry || currentEntry?.industry,
          location: userProfile?.location || currentEntry?.location,
          yearsExperience,
          jobTitle: currentEntry?.job_title || userProfile?.headline,
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      toast({
        title: "Analysis Complete",
        description: "Your salary analytics have been generated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save analytics snapshot
  const saveSnapshotMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('salary_analytics_snapshots')
        .insert({
          user_id: user.id,
          current_total_compensation: currentCompensation,
          market_median: salaryData[0]?.median_salary,
          market_percentile_25: salaryData[0]?.percentile_25,
          market_percentile_75: salaryData[0]?.percentile_75,
          market_position: analysis?.market_position_analysis?.position_label || 'unknown',
          percentile_rank: analysis?.market_position_analysis?.current_percentile,
          industry: currentEntry?.industry,
          location: currentEntry?.location,
          job_title: currentEntry?.job_title,
          years_experience: yearsExperience,
          career_growth_rate: analysis?.salary_progression_insights?.annual_growth_rate,
          negotiation_success_rate: negotiationStats.total > 0 
            ? (negotiationStats.successful / negotiationStats.total) * 100 
            : null,
          total_negotiations: negotiationStats.total,
          successful_negotiations: negotiationStats.successful,
          ai_recommendations: analysis?.advancement_recommendations,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-analytics-snapshots'] });
      toast({
        title: "Snapshot Saved",
        description: "Your salary analytics snapshot has been saved.",
      });
    },
  });

  const isLoading = loadingProgression || loadingResearch;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Salary Analytics</h2>
          <p className="text-muted-foreground">Track your salary progression and market position</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddEntry(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Salary Entry
          </Button>
          <Button 
            onClick={() => analysisMutation.mutate()}
            disabled={analysisMutation.isPending}
          >
            {analysisMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate Analysis
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Current Total Comp</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              ${currentCompensation.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Career Growth Rate</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {analysis?.salary_progression_insights?.annual_growth_rate?.toFixed(1) || '--'}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Negotiation Success</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {negotiationStats.total > 0 
                ? `${((negotiationStats.successful / negotiationStats.total) * 100).toFixed(0)}%` 
                : '--'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Market Position</span>
            </div>
            <Badge className="mt-2" variant={
              analysis?.market_position_analysis?.position_label === 'above_market' ? 'default' :
              analysis?.market_position_analysis?.position_label === 'at_market' ? 'secondary' : 'outline'
            }>
              {analysis?.market_position_analysis?.position_label?.replace('_', ' ') || 'Not analyzed'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="progression" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="progression">Progression</TabsTrigger>
          <TabsTrigger value="market">Market Position</TabsTrigger>
          <TabsTrigger value="negotiation">Negotiation</TabsTrigger>
          <TabsTrigger value="trends">Comp Trends</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="progression" className="space-y-4">
          <SalaryProgressionChart 
            data={salaryProgression || []} 
            analysis={analysis?.salary_progression_insights}
          />
          <IndustryBenchmarks 
            benchmarks={analysis?.industry_benchmarks}
            currentSalary={currentCompensation}
          />
        </TabsContent>

        <TabsContent value="market" className="space-y-4">
          <MarketPositionCard 
            analysis={analysis?.market_position_analysis}
            currentCompensation={currentCompensation}
            marketData={salaryData[0]}
          />
        </TabsContent>

        <TabsContent value="negotiation" className="space-y-4">
          <NegotiationPerformance 
            stats={negotiationStats}
            analysis={analysis?.negotiation_performance}
            history={salaryData.filter(r => r.negotiation_outcome)}
          />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <CompensationTrends 
            progression={salaryProgression || []}
            analysis={analysis?.compensation_trends}
          />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <SalaryRecommendations 
            recommendations={analysis?.advancement_recommendations}
            timingInsights={analysis?.optimal_timing_insights}
            onSaveSnapshot={() => saveSnapshotMutation.mutate()}
            isSaving={saveSnapshotMutation.isPending}
          />
        </TabsContent>
      </Tabs>

      {/* Add Entry Dialog */}
      <AddSalaryEntryDialog 
        open={showAddEntry} 
        onOpenChange={setShowAddEntry}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['salary-progression'] });
        }}
      />
    </div>
  );
}
