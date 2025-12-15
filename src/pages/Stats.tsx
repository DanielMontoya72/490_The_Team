import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/layout/AppNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Target, Zap, Award, Briefcase, Users, FileText, TrendingUp, RefreshCw } from "lucide-react";
import { useTextSize } from "@/components/text-size-provider";
import { toast } from "sonner";
import { JobMatchingTab } from "@/components/jobs/JobMatchingTab";
import { JobSearchPerformanceTab } from "@/components/jobs/JobSearchPerformanceTab";
import { TimeTrackingWidget } from "@/components/productivity/TimeTrackingWidget";
import { TimeAllocationChart } from "@/components/productivity/TimeAllocationChart";
import { ProductivityPatterns } from "@/components/productivity/ProductivityPatterns";
import { ProductivityInsights } from "@/components/productivity/ProductivityInsights";
import { BurnoutMonitoring } from "@/components/productivity/BurnoutMonitoring";
import { TimeInvestmentAnalysis } from "@/components/productivity/TimeInvestmentAnalysis";
import { CompetitivePositioning } from "@/components/competitive/CompetitivePositioning";
import { PeerComparison } from "@/components/competitive/PeerComparison";
import { SkillGapsComparison } from "@/components/competitive/SkillGapsComparison";
import { DifferentiationStrategies } from "@/components/competitive/DifferentiationStrategies";
import { MarketPositioning } from "@/components/competitive/MarketPositioning";
import { PerformanceMetrics } from "@/components/competitive/PerformanceMetrics";
import { CompetitiveRecommendations } from "@/components/competitive/CompetitiveRecommendations";
import { NetworkingActivityTracker } from "@/components/networking/NetworkingActivityTracker";
import { RelationshipStrengthAnalyzer } from "@/components/networking/RelationshipStrengthAnalyzer";
import { NetworkingEventROI } from "@/components/networking/NetworkingEventROI";
import { NetworkingStrategyInsights } from "@/components/networking/NetworkingStrategyInsights";
import { NetworkingBenchmarks } from "@/components/networking/NetworkingBenchmarks";
import { ReferralMetrics } from "@/components/contacts/ReferralMetrics";
import { CampaignAnalytics } from "@/components/campaigns/CampaignAnalytics";
import { CustomReportBuilder } from "@/components/analytics/CustomReportBuilder";


const Stats = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { textSize } = useTextSize();
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("performance");
  const [productivitySubTab, setProductivitySubTab] = useState("tracking");
  const [selectedPeriod] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);

  // Handle URL parameters to open specific tabs
  useEffect(() => {
    const tab = searchParams.get('tab');
    const subtab = searchParams.get('subtab');
    
    if (tab) {
      // Small delay to ensure tabs are rendered
      setTimeout(() => {
        setActiveTab(tab);
        if (tab === 'productivity' && subtab) {
          setTimeout(() => {
            setProductivitySubTab(subtab);
          }, 100);
        }
      }, 50);
    }
  }, [searchParams]);

  const getTextSizes = () => {
    switch(textSize) {
      case 'small':
        return {
          title: 'text-2xl sm:text-3xl',
          subtitle: 'text-lg sm:text-xl',
          body: 'text-sm',
          icon: 'h-4 w-4'
        };
      case 'large':
        return {
          title: 'text-4xl sm:text-5xl',
          subtitle: 'text-2xl sm:text-3xl',
          body: 'text-xl',
          icon: 'h-6 w-6'
        };
      default:
        return {
          title: 'text-3xl sm:text-4xl',
          subtitle: 'text-xl sm:text-2xl',
          body: 'text-lg',
          icon: 'h-5 w-5'
        };
    }
  };

  const textSizes = getTextSizes();

  // Jobs data query
  const { data: jobs } = useQuery({
    queryKey: ['jobs', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', session!.user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Contacts data query
  const { data: contacts } = useQuery({
    queryKey: ['contacts', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professional_contacts')
        .select('*')
        .eq('user_id', session!.user!.id);

      if (error) throw error;
      return data;
    },
  });

  // Resumes data query
  const { data: resumes } = useQuery({
    queryKey: ['resumes', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', session!.user!.id);

      if (error) throw error;
      return data;
    },
  });

  // Interviews data query
  const { data: interviews } = useQuery({
    queryKey: ['interviews', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', session!.user!.id);

      if (error) throw error;
      return data;
    },
  });

  // Productivity data queries
  const { data: timeEntries } = useQuery({
    queryKey: ['time-entries', session?.user?.id, selectedPeriod],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const startDate = new Date(Date.now() - selectedPeriod * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from('time_tracking_entries')
        .select('*')
        .eq('user_id', session!.user!.id)
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: productivityMetrics } = useQuery({
    queryKey: ['productivity-metrics', session?.user?.id, selectedPeriod],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const startDate = new Date(Date.now() - selectedPeriod * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from('productivity_metrics')
        .select('*')
        .eq('user_id', session!.user!.id)
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: productivityInsights } = useQuery({
    queryKey: ['productivity-insights', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('productivity_insights')
        .select('*')
        .eq('user_id', session!.user!.id)
        .gte('valid_until', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Competitive Analysis data
  const { data: competitiveAnalysis, refetch: refetchCompetitiveAnalysis } = useQuery({
    queryKey: ['competitive-analysis', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('competitive_analysis')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const handleGenerateAnalysis = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-competitive-analysis');
      
      if (error) throw error;
      
      await refetchCompetitiveAnalysis();
      toast.success("Competitive analysis generated successfully");
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error("Failed to generate competitive analysis");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          navigate("/login");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <AppNav />
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className={`font-bold ${textSizes.title}`}>Statistics & Analytics</h1>
          </div>

          {/* Overview Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Applications</CardTitle>
              <Briefcase className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {jobs?.filter(job => !job.archived_at).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {jobs?.filter(job => job.archived_at).length || 0} archived
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-background dark:from-green-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Interviews</CardTitle>
              <Target className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {interviews?.filter(interview => new Date(interview.interview_date) > new Date()).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {interviews?.filter(interview => interview.status === 'completed').length || 0} completed
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-background dark:from-purple-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Network Contacts</CardTitle>
              <Users className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {contacts?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Professional connections
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-background dark:from-orange-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Application Success</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {jobs && jobs.length > 0 
                  ? Math.round((interviews?.length || 0) / jobs.filter(job => !job.archived_at).length * 100) 
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Interview conversion rate
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="h-[calc(100vh-28rem)] min-h-[500px]">
          <Card className="w-full shadow-sm h-full flex flex-col">
            <CardContent className="pt-4 sm:pt-6 flex flex-col h-full overflow-hidden p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full">
                <div className="px-4 sm:px-6 pb-2">
                  <TabsList className="w-full h-auto grid grid-cols-3 sm:grid-cols-6 gap-1 bg-transparent px-0 py-1 border-b-2 border-primary/20">
                    <TabsTrigger value="performance" className="text-xs sm:text-sm font-medium px-2 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 sm:mr-1.5 flex-shrink-0" />
                      <span className="hidden sm:inline">Performance</span>
                    </TabsTrigger>
                    <TabsTrigger value="productivity" className="text-xs sm:text-sm font-medium px-2 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none flex items-center justify-center">
                      <Zap className="h-4 w-4 sm:mr-1.5 flex-shrink-0" />
                      <span className="hidden sm:inline">Productivity</span>
                    </TabsTrigger>
                    <TabsTrigger value="matching" className="text-xs sm:text-sm font-medium px-2 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none flex items-center justify-center">
                      <Target className="h-4 w-4 sm:mr-1.5 flex-shrink-0" />
                      <span className="hidden sm:inline">Matching</span>
                    </TabsTrigger>
                    <TabsTrigger value="competitive" className="text-xs sm:text-sm font-medium px-2 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none flex items-center justify-center">
                      <Award className="h-4 w-4 sm:mr-1.5 flex-shrink-0" />
                      <span className="hidden sm:inline">Competitive</span>
                    </TabsTrigger>
                    <TabsTrigger value="networking" className="text-xs sm:text-sm font-medium px-2 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none flex items-center justify-center">
                      <Users className="h-4 w-4 sm:mr-1.5 flex-shrink-0" />
                      <span className="hidden sm:inline">Networking</span>
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="text-xs sm:text-sm font-medium px-2 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none flex items-center justify-center">
                      <FileText className="h-4 w-4 sm:mr-1.5 flex-shrink-0" />
                      <span className="hidden sm:inline">Reports</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-hidden">
                  <TabsContent value="matching" className="h-full overflow-y-auto px-4 sm:px-6 pb-4 mt-0 data-[state=inactive]:hidden">
                    <JobMatchingTab />
                  </TabsContent>

                  <TabsContent value="performance" className="h-full overflow-y-auto px-4 sm:px-6 pb-4 mt-0 data-[state=inactive]:hidden">
                    <JobSearchPerformanceTab />
                  </TabsContent>

                  <TabsContent value="productivity" className="h-full overflow-y-auto px-4 sm:px-6 pb-4 mt-0 data-[state=inactive]:hidden">
                    <div className="space-y-6">
                  {/* Productivity Patterns - Always visible */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-background dark:from-green-950/20 border-l-4 border-l-green-500">
                    <ProductivityPatterns 
                      entries={timeEntries || []} 
                      metrics={productivityMetrics || []}
                    />
                  </div>

                  <Tabs value={productivitySubTab} onValueChange={setProductivitySubTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-950/30 dark:to-pink-950/30">
                      <TabsTrigger value="tracking" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">Tracking</TabsTrigger>
                      <TabsTrigger value="allocation" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Time Allocation</TabsTrigger>
                      <TabsTrigger value="insights" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">Insights</TabsTrigger>
                      <TabsTrigger value="burnout" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">Burnout</TabsTrigger>
                      <TabsTrigger value="investment" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">Investment</TabsTrigger>
                    </TabsList>

                    <TabsContent value="tracking" className="space-y-4 mt-4">
                      <TimeTrackingWidget />
                    </TabsContent>

                    <TabsContent value="allocation" className="space-y-4 mt-4">
                      <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20 border-l-4 border-l-blue-500">
                        <TimeAllocationChart 
                          entries={timeEntries || []} 
                          onStartTracking={() => setProductivitySubTab('tracking')}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="insights" className="space-y-4 mt-4">
                      <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-background dark:from-orange-950/20 border-l-4 border-l-orange-500">
                        <ProductivityInsights 
                          insights={productivityInsights || []}
                          entries={timeEntries || []}
                          metrics={productivityMetrics || []}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="burnout" className="space-y-4 mt-4">
                      <div className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-background dark:from-red-950/20 border-l-4 border-l-red-500">
                        <BurnoutMonitoring 
                          entries={timeEntries || []} 
                          metrics={productivityMetrics || []}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="investment" className="space-y-4 mt-4">
                      <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-background dark:from-indigo-950/20 border-l-4 border-l-indigo-500">
                        <TimeInvestmentAnalysis 
                          entries={timeEntries || []} 
                          metrics={productivityMetrics || []}
                          period={selectedPeriod}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
                  </TabsContent>

                  <TabsContent value="competitive" className="h-full overflow-y-auto px-4 sm:px-6 pb-4 mt-0 data-[state=inactive]:hidden">
                    {competitiveAnalysis ? (
                      <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Last updated: {new Date(competitiveAnalysis.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={handleGenerateAnalysis}
                        disabled={isGenerating}
                        variant="outline"
                        size="sm"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                        {isGenerating ? 'Refreshing...' : 'Refresh Analysis'}
                      </Button>
                    </div>
                    <Tabs defaultValue="positioning" className="w-full">
                      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
                        <TabsTrigger value="positioning">Positioning</TabsTrigger>
                        <TabsTrigger value="peers">Peers</TabsTrigger>
                        <TabsTrigger value="skills">Skill Gaps</TabsTrigger>
                        <TabsTrigger value="differentiation">Strategy</TabsTrigger>
                        <TabsTrigger value="market">Market</TabsTrigger>
                        <TabsTrigger value="metrics">Metrics</TabsTrigger>
                        <TabsTrigger value="recommendations">Actions</TabsTrigger>
                      </TabsList>

                      <TabsContent value="positioning" className="space-y-4 mt-4">
                        <CompetitivePositioning data={competitiveAnalysis.competitive_positioning} />
                      </TabsContent>

                      <TabsContent value="peers" className="space-y-4 mt-4">
                        <PeerComparison data={competitiveAnalysis.peer_comparison} />
                      </TabsContent>

                      <TabsContent value="skills" className="space-y-4 mt-4">
                        <SkillGapsComparison data={competitiveAnalysis.skill_gaps as any[]} />
                      </TabsContent>

                      <TabsContent value="differentiation" className="space-y-4 mt-4">
                        <DifferentiationStrategies data={competitiveAnalysis.differentiation_strategies as any[]} />
                      </TabsContent>

                      <TabsContent value="market" className="space-y-4 mt-4">
                        <MarketPositioning data={competitiveAnalysis.market_positioning} />
                      </TabsContent>

                      <TabsContent value="metrics" className="space-y-4 mt-4">
                        <PerformanceMetrics data={competitiveAnalysis.performance_metrics} />
                      </TabsContent>

                      <TabsContent value="recommendations" className="space-y-4 mt-4">
                        <CompetitiveRecommendations data={competitiveAnalysis.recommendations as any[]} />
                      </TabsContent>
                      </Tabs>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Award className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium mb-2">No Competitive Analysis Available</p>
                        <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                          Generate a competitive analysis to see how you compare to peers in your field
                        </p>
                        <Button
                          onClick={handleGenerateAnalysis}
                          disabled={isGenerating}
                          variant="default"
                          size="lg"
                        >
                          {isGenerating ? 'Generating Analysis...' : 'Generate Competitive Analysis'}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                  </TabsContent>

                  <TabsContent value="networking" className="h-full overflow-y-auto px-4 sm:px-6 pb-4 mt-0 data-[state=inactive]:hidden">
                    <div className="space-y-6">
                      <Tabs defaultValue="activity" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
                      <TabsTrigger value="activity">Activity</TabsTrigger>
                      <TabsTrigger value="relationships">Relationships</TabsTrigger>
                      <TabsTrigger value="events">Event ROI</TabsTrigger>
                      <TabsTrigger value="referrals">Referrals</TabsTrigger>
                      <TabsTrigger value="insights">Insights</TabsTrigger>
                      <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
                    </TabsList>

                    <TabsContent value="activity" className="space-y-4 mt-4">
                      <NetworkingActivityTracker />
                    </TabsContent>

                    <TabsContent value="relationships" className="space-y-4 mt-4">
                      <RelationshipStrengthAnalyzer />
                    </TabsContent>

                    <TabsContent value="events" className="space-y-4 mt-4">
                      <NetworkingEventROI />
                    </TabsContent>

                    <TabsContent value="referrals" className="space-y-4 mt-4">
                      <div className="space-y-6">
                        <ReferralMetrics />
                        <CampaignAnalytics />
                      </div>
                    </TabsContent>

                      <TabsContent value="benchmarks" className="space-y-4 mt-4">
                        <NetworkingBenchmarks />
                      </TabsContent>
                      </Tabs>
                    </div>
                  </TabsContent>

                  <TabsContent value="reports" className="h-full overflow-y-auto px-4 sm:px-6 pb-4 mt-0 data-[state=inactive]:hidden">
                    <CustomReportBuilder />
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Stats;
