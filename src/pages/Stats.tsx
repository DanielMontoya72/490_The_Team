import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/layout/AppNav";
import { AnalyticsSidebar } from "@/components/layout/AnalyticsSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Target, Zap, Award, Briefcase, Users, FileText, TrendingUp, RefreshCw, DollarSign, GitCompare, Activity, Map, ChevronRight } from "lucide-react";
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
  const location = useLocation();
  const isCurrentPage = (path: string) => location.pathname === path;
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
    <>
      <AppNav />
      
      <div className="flex min-h-screen bg-background pt-16">
        <AnalyticsSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden lg:ml-56">
          <div className="h-full">
            <div className="w-full px-4 py-6 lg:pt-0 pt-16">
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                      <BarChart3 className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                        Job Statistics Dashboard
                      </h1>
                      <p className="text-muted-foreground text-lg mt-1">
                        Your comprehensive job search analytics at a glance
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">Live Data</span>
                  </div>
                </div>
              </div>

          {/* Overview Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950/30 dark:via-background dark:to-blue-950/30 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active Applications</CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                <Briefcase className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {jobs?.filter(job => !job.archived_at).length || 0}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {jobs?.filter(job => job.archived_at).length || 0} archived
                </p>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${jobs && jobs.length > 0 ? (jobs.filter(job => !job.archived_at).length / jobs.length) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-green-950/30 dark:via-background dark:to-green-950/30 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Upcoming Interviews</CardTitle>
              <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                <Target className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                {interviews?.filter(interview => new Date(interview.interview_date) > new Date()).length || 0}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {interviews?.filter(interview => interview.status === 'completed').length || 0} completed
                </p>
                {interviews && interviews.length > 0 && (
                  <div className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                    {Math.round((interviews.filter(interview => interview.status === 'completed').length / interviews.length) * 100)}% success
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-purple-50 dark:from-purple-950/30 dark:via-background dark:to-purple-950/30 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Network Contacts</CardTitle>
              <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                {contacts?.length || 0}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Professional connections
                </p>
                {contacts && contacts.length > 0 && (
                  <div className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                    Active
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-orange-950/30 dark:via-background dark:to-orange-950/30 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Success Rate</CardTitle>
              <div className="p-2 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition-colors">
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                {jobs && jobs.length > 0 
                  ? Math.round((interviews?.length || 0) / jobs.filter(job => !job.archived_at).length * 100) 
                  : 0}%
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Interview conversion
                </p>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div 
                    className="bg-orange-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${jobs && jobs.length > 0 ? Math.round((interviews?.length || 0) / jobs.filter(job => !job.archived_at).length * 100) : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-50 via-white to-cyan-50 dark:from-cyan-950/30 dark:via-background dark:to-cyan-950/30 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Resume Views</CardTitle>
              <div className="p-2 bg-cyan-500/10 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
                <FileText className="h-5 w-5 text-cyan-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-cyan-600 dark:text-cyan-400 mb-2">
                {resumes?.length || 0}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Total resumes
                </p>
                <div className="text-xs px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-full">
                  Ready
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-white to-pink-50 dark:from-pink-950/30 dark:via-background dark:to-pink-950/30 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 left-0 w-1 h-full bg-pink-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">This Month</CardTitle>
              <div className="p-2 bg-pink-500/10 rounded-lg group-hover:bg-pink-500/20 transition-colors">
                <Activity className="h-5 w-5 text-pink-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-pink-600 dark:text-pink-400 mb-2">
                {jobs?.filter(job => {
                  const created = new Date(job.created_at);
                  const now = new Date();
                  return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                }).length || 0}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Applications this month
                </p>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div className="bg-pink-500 h-1.5 rounded-full w-3/4 transition-all duration-500"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full">
          <Card className="w-full shadow-xl border-0 bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900">
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h3>
                    <p className="text-sm text-muted-foreground mt-1">Explore detailed insights across different aspects of your job search</p>
                  </div>
                  <TabsList className="w-full grid grid-cols-3 lg:grid-cols-6 gap-2 bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-xl h-auto">
                    <TabsTrigger value="performance" className="text-xs sm:text-sm font-medium px-3 py-3 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all duration-200 flex items-center justify-center gap-2 hover:bg-white/50 dark:hover:bg-gray-700/50 dark:data-[state=active]:bg-gray-800" title="Job search performance metrics and trends">
                      <BarChart3 className="h-4 w-4 flex-shrink-0" />
                      <span className="hidden md:inline">Performance</span>
                    </TabsTrigger>
                    <TabsTrigger value="productivity" className="text-xs sm:text-sm font-medium px-3 py-3 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all duration-200 flex items-center justify-center gap-2 hover:bg-white/50 dark:hover:bg-gray-700/50 dark:data-[state=active]:bg-gray-800" title="Time tracking and productivity insights">
                      <Zap className="h-4 w-4 flex-shrink-0" />
                      <span className="hidden md:inline">Productivity</span>
                    </TabsTrigger>
                    <TabsTrigger value="matching" className="text-xs sm:text-sm font-medium px-3 py-3 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all duration-200 flex items-center justify-center gap-2 hover:bg-white/50 dark:hover:bg-gray-700/50 dark:data-[state=active]:bg-gray-800" title="Job matching and compatibility analysis">
                      <Target className="h-4 w-4 flex-shrink-0" />
                      <span className="hidden md:inline">Matching</span>
                    </TabsTrigger>
                    <TabsTrigger value="competitive" className="text-xs sm:text-sm font-medium px-3 py-3 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all duration-200 flex items-center justify-center gap-2 hover:bg-white/50 dark:hover:bg-gray-700/50 dark:data-[state=active]:bg-gray-800" title="Competitive analysis and market positioning">
                      <Award className="h-4 w-4 flex-shrink-0" />
                      <span className="hidden md:inline">Competitive</span>
                    </TabsTrigger>
                    <TabsTrigger value="networking" className="text-xs sm:text-sm font-medium px-3 py-3 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all duration-200 flex items-center justify-center gap-2 hover:bg-white/50 dark:hover:bg-gray-700/50 dark:data-[state=active]:bg-gray-800" title="Networking activities and relationship tracking">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span className="hidden md:inline">Networking</span>
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="text-xs sm:text-sm font-medium px-3 py-3 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all duration-200 flex items-center justify-center gap-2 hover:bg-white/50 dark:hover:bg-gray-700/50 dark:data-[state=active]:bg-gray-800" title="Custom reports and data exports">
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="hidden md:inline">Reports</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="bg-white/50 dark:bg-gray-900/50">
                  <TabsContent value="matching" className="px-6 py-6 mt-0 data-[state=inactive]:hidden">
                    <div className="mb-6">
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Target className="h-6 w-6 text-primary" />
                        Job Matching Analysis
                      </h4>
                      <p className="text-muted-foreground mt-2">Analyze how well your profile matches with available opportunities</p>
                    </div>
                    <JobMatchingTab />
                  </TabsContent>

                  <TabsContent value="performance" className="px-6 py-6 mt-0 data-[state=inactive]:hidden">
                    <div className="mb-6">
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-primary" />
                        Performance Metrics
                      </h4>
                      <p className="text-muted-foreground mt-2">Track your job search progress and success rates over time</p>
                    </div>
                    <JobSearchPerformanceTab />
                  </TabsContent>

                  <TabsContent value="productivity" className="px-6 py-6 mt-0 data-[state=inactive]:hidden">
                    <div className="mb-6">
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Zap className="h-6 w-6 text-primary" />
                        Productivity Analytics
                      </h4>
                      <p className="text-muted-foreground mt-2">Monitor your time investment and productivity patterns</p>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Productivity Patterns - Always visible */}
                      <div className="p-6 rounded-lg bg-gradient-to-br from-green-50 to-background dark:from-green-950/20 border-l-4 border-l-green-500">
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

                        <TabsContent value="tracking" className="space-y-4 mt-6">
                          <TimeTrackingWidget />
                        </TabsContent>

                        <TabsContent value="allocation" className="space-y-4 mt-6">
                          <div className="p-6 rounded-lg bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20 border-l-4 border-l-blue-500">
                            <TimeAllocationChart 
                              entries={timeEntries || []} 
                              onStartTracking={() => setProductivitySubTab('tracking')}
                            />
                          </div>
                        </TabsContent>

                        <TabsContent value="insights" className="space-y-4 mt-6">
                          <div className="p-6 rounded-lg bg-gradient-to-br from-orange-50 to-background dark:from-orange-950/20 border-l-4 border-l-orange-500">
                            <ProductivityInsights 
                              insights={productivityInsights || []}
                              entries={timeEntries || []}
                              metrics={productivityMetrics || []}
                            />
                          </div>
                        </TabsContent>

                        <TabsContent value="burnout" className="space-y-4 mt-6">
                          <div className="p-6 rounded-lg bg-gradient-to-br from-red-50 to-background dark:from-red-950/20 border-l-4 border-l-red-500">
                            <BurnoutMonitoring 
                              entries={timeEntries || []} 
                              metrics={productivityMetrics || []}
                            />
                          </div>
                        </TabsContent>

                        <TabsContent value="investment" className="space-y-4 mt-6">
                          <div className="p-6 rounded-lg bg-gradient-to-br from-indigo-50 to-background dark:from-indigo-950/20 border-l-4 border-l-indigo-500">
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

                  <TabsContent value="competitive" className="px-6 py-6 mt-0 data-[state=inactive]:hidden">
                    <div className="mb-6">
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Award className="h-6 w-6 text-primary" />
                        Competitive Analysis
                      </h4>
                      <p className="text-muted-foreground mt-2">Compare your position against peers in your field</p>
                    </div>
                    
                    {competitiveAnalysis ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-6">
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

                          <TabsContent value="positioning" className="space-y-4 mt-6">
                            <CompetitivePositioning data={competitiveAnalysis.competitive_positioning} />
                          </TabsContent>

                          <TabsContent value="peers" className="space-y-4 mt-6">
                            <PeerComparison data={competitiveAnalysis.peer_comparison} />
                          </TabsContent>

                          <TabsContent value="skills" className="space-y-4 mt-6">
                            <SkillGapsComparison data={competitiveAnalysis.skill_gaps as any[]} />
                          </TabsContent>

                          <TabsContent value="differentiation" className="space-y-4 mt-6">
                            <DifferentiationStrategies data={competitiveAnalysis.differentiation_strategies as any[]} />
                          </TabsContent>

                          <TabsContent value="market" className="space-y-4 mt-6">
                            <MarketPositioning data={competitiveAnalysis.market_positioning} />
                          </TabsContent>

                          <TabsContent value="metrics" className="space-y-4 mt-6">
                            <PerformanceMetrics data={competitiveAnalysis.performance_metrics} />
                          </TabsContent>

                          <TabsContent value="recommendations" className="space-y-4 mt-6">
                            <CompetitiveRecommendations data={competitiveAnalysis.recommendations as any[]} />
                          </TabsContent>
                        </Tabs>
                      </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-full blur-xl"></div>
                        <div className="relative p-4 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700">
                          <Award className="h-12 w-12 text-primary" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Ready to Analyze Your Position?</h3>
                      <p className="text-muted-foreground text-center max-w-md mb-6 leading-relaxed">
                        Get detailed insights into how you stack up against other professionals in your field. Our AI will analyze your skills, experience, and market positioning.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <Button
                          onClick={handleGenerateAnalysis}
                          disabled={isGenerating}
                          variant="default"
                          size="lg"
                          className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg"
                        >
                          {isGenerating ? (
                            <>
                              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                              Analyzing Your Profile...
                            </>
                          ) : (
                            <>
                              <Award className="h-5 w-5 mr-2" />
                              Generate Analysis
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground">Takes 30-60 seconds</p>
                      </div>
                    </div>
                  )}
                  </TabsContent>

                  <TabsContent value="networking" className="px-6 py-6 mt-0 data-[state=inactive]:hidden">
                    <div className="mb-6">
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" />
                        Networking Analytics
                      </h4>
                      <p className="text-muted-foreground mt-2">Track your networking activities and relationship building</p>
                    </div>
                    
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

                        <TabsContent value="activity" className="space-y-4 mt-6">
                          <NetworkingActivityTracker />
                        </TabsContent>

                        <TabsContent value="relationships" className="space-y-4 mt-6">
                          <RelationshipStrengthAnalyzer />
                        </TabsContent>

                        <TabsContent value="events" className="space-y-4 mt-6">
                          <NetworkingEventROI />
                        </TabsContent>

                        <TabsContent value="referrals" className="space-y-4 mt-6">
                          <div className="space-y-6">
                            <ReferralMetrics />
                            <CampaignAnalytics />
                          </div>
                        </TabsContent>

                        <TabsContent value="insights" className="space-y-4 mt-6">
                          <NetworkingStrategyInsights />
                        </TabsContent>

                        <TabsContent value="benchmarks" className="space-y-4 mt-6">
                          <NetworkingBenchmarks />
                        </TabsContent>
                      </Tabs>
                    </div>
                  </TabsContent>

                  <TabsContent value="reports" className="px-6 py-6 mt-0 data-[state=inactive]:hidden">
                    <div className="mb-6">
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="h-6 w-6 text-primary" />
                        Custom Reports
                      </h4>
                      <p className="text-muted-foreground mt-2">Generate custom reports and export your data</p>
                    </div>
                    <CustomReportBuilder />
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Stats;
