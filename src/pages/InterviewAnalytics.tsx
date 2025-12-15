import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversionRateTracker } from "@/components/analytics/ConversionRateTracker";
import { CompanyTypePerformance } from "@/components/analytics/CompanyTypePerformance";
import { InterviewAreasAnalysis } from "@/components/analytics/InterviewAreasAnalysis";
import { FormatComparison } from "@/components/analytics/FormatComparison";
import { ImprovementTimeline } from "@/components/analytics/ImprovementTimeline";
import { StrategyInsights } from "@/components/analytics/StrategyInsights";
import { PersonalizedRecommendations } from "@/components/analytics/PersonalizedRecommendations";
import { InterviewPredictionAccuracy } from "@/components/analytics/InterviewPredictionAccuracy";
import { FeedbackThemesTracker } from "@/components/analytics/FeedbackThemesTracker";
import { ConfidenceAnxietyTracker } from "@/components/analytics/ConfidenceAnxietyTracker";
import { IndustryBenchmarkComparison } from "@/components/analytics/IndustryBenchmarkComparison";
import { InterviewPreparednessComparison } from "@/components/analytics/InterviewPreparednessComparison";
import { BarChart3, TrendingUp, Target, Lightbulb, Brain, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function InterviewAnalytics() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['interview-analytics-page', user?.id],
    enabled: !!user?.id,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always',
    queryFn: async () => {
      // Fetch ALL interviews without any date filtering
      const [interviews, predictions, mockSessions, questionResponses, jobs] = await Promise.all([
        supabase
          .from('interviews')
          .select('*, jobs(company_name, industry, company_size, job_title)')
          .eq('user_id', user!.id)
          .order('interview_date', { ascending: false }),
        supabase
          .from('interview_success_predictions')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('mock_interview_sessions')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('interview_question_responses')
          .select('*')
          .eq('user_id', user!.id)
          .eq('is_practiced', true),
        supabase
          .from('jobs')
          .select('*')
          .eq('user_id', user!.id)
      ]);

      console.log('InterviewAnalytics: Fetched', interviews.data?.length, 'interviews from database');

      return {
        interviews: interviews.data || [],
        predictions: predictions.data || [],
        mockSessions: mockSessions.data || [],
        questionResponses: questionResponses.data || [],
        jobs: jobs.data || []
      };
    },
  });

  // Calculate metrics for benchmarking
  const metrics = analyticsData ? {
    responseRate: analyticsData.jobs.length > 0 
      ? (analyticsData.jobs.filter((j: any) => j.status !== 'Applied' && j.status !== 'Bookmarked').length / analyticsData.jobs.length) * 100 
      : 0,
    interviewConversionRate: analyticsData.jobs.length > 0 
      ? (analyticsData.interviews.length / analyticsData.jobs.length) * 100 
      : 0,
    offerConversionRate: analyticsData.interviews.length > 0 
      ? (analyticsData.interviews.filter((i: any) => i.outcome === 'passed' || i.outcome === 'offer').length / analyticsData.interviews.length) * 100 
      : 0,
    avgApplicationResponseDays: 14,
    avgInterviewSchedulingDays: 7,
  } : undefined;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-10 w-96" />
          <Skeleton className="h-5 w-[600px]" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Interview Performance Analytics</h1>
        <p className="text-muted-foreground">
          Track your interview performance, identify patterns, and get personalized improvement recommendations
        </p>
        <p className="text-xs text-muted-foreground/60">
          Loaded {analyticsData?.interviews?.length || 0} interviews from database
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Feedback
          </TabsTrigger>
          <TabsTrigger value="confidence" className="gap-2">
            <Brain className="h-4 w-4" />
            Confidence
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <Target className="h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Coaching
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <InterviewPreparednessComparison data={analyticsData} />
          <div className="grid gap-6 md:grid-cols-2">
            <ConversionRateTracker data={analyticsData} />
            <FormatComparison data={analyticsData} />
          </div>
          <InterviewAreasAnalysis data={analyticsData} />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <ImprovementTimeline data={analyticsData} />
          <InterviewPredictionAccuracy data={analyticsData} />
          <CompanyTypePerformance data={analyticsData} />
        </TabsContent>

        <TabsContent value="feedback" className="space-y-6">
          <FeedbackThemesTracker data={analyticsData} />
          <InterviewAreasAnalysis data={analyticsData} />
        </TabsContent>

        <TabsContent value="confidence" className="space-y-6">
          <ConfidenceAnxietyTracker data={analyticsData} />
          <ImprovementTimeline data={analyticsData} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <StrategyInsights data={analyticsData} />
          {metrics && <IndustryBenchmarkComparison metrics={metrics} />}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <PersonalizedRecommendations data={analyticsData} metrics={metrics ? {
            totalApplications: analyticsData?.jobs.length || 0,
            responseRate: metrics.responseRate,
            interviewRate: metrics.interviewConversionRate,
            offerRate: metrics.offerConversionRate,
            avgResponseDays: metrics.avgApplicationResponseDays,
            avgInterviewDays: metrics.avgInterviewSchedulingDays,
          } : undefined} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
