import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JobSearchTimelineForecast } from './JobSearchTimelineForecast';
import { SalaryNegotiationOutcomePredictor } from './SalaryNegotiationOutcomePredictor';
import { JobSearchScenarioPlanner } from './JobSearchScenarioPlanner';
import { SuccessPatternRecognition } from './SuccessPatternRecognition';
import { InterviewPredictionAccuracy } from '@/components/jobs/InterviewPredictionAccuracy';
import { PersonalizedRecommendations } from './PersonalizedRecommendations';
import { StrategyInsights } from './StrategyInsights';
import { ImprovementTimeline } from './ImprovementTimeline';
import { CustomReportBuilder } from './CustomReportBuilder';
import { Calendar, DollarSign, GitBranch, Target, TrendingUp, Sparkles, Lightbulb, LineChart, Brain, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function PredictiveAnalyticsHub() {
  // Fetch analytics data for the components
  const { data: analyticsData } = useQuery({
    queryKey: ['interview-analytics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const [predictions, mockSessions, questionResponses, interviews, jobs] = await Promise.all([
        supabase
          .from('interview_success_predictions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('mock_interview_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('interview_question_responses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('interviews')
          .select('*')
          .eq('user_id', user.id)
          .order('interview_date', { ascending: false }),
        supabase
          .from('jobs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      return {
        predictions: predictions.data || [],
        mockSessions: mockSessions.data || [],
        questionResponses: questionResponses.data || [],
        interviews: interviews.data || [],
        jobs: jobs.data || [],
      };
    },
  });

  // Calculate metrics for PersonalizedRecommendations (case-insensitive matching)
  const metrics = analyticsData ? {
    totalApplications: analyticsData.jobs?.length || 0,
    responseRate: analyticsData.jobs?.filter((j: any) => (j.status || '').toLowerCase() !== 'wishlist')?.length || 0,
    interviewRate: analyticsData.interviews?.length || 0,
    offerRate: analyticsData.interviews?.filter((i: any) => {
      const outcome = (i.outcome || '').toLowerCase();
      return outcome === 'offer' || outcome === 'accepted' || outcome === 'passed' || outcome === 'hired' || outcome === 'success';
    })?.length || 0,
    avgResponseDays: 5, // placeholder
    avgInterviewDays: 7, // placeholder
  } : undefined;

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-background dark:from-purple-950/20 border-l-4 border-l-purple-500">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          AI-Powered Predictions & Forecasting
        </h3>
        <p className="text-sm text-muted-foreground">
          Anticipate outcomes, optimize strategies, and make data-driven decisions about your job search
        </p>
      </div>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-950/30 dark:to-pink-950/30">
          <TabsTrigger value="timeline" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="salary" className="data-[state=active]:bg-green-500 data-[state=active]:text-white gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Salary</span>
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white gap-2">
            <GitBranch className="h-4 w-4" />
            <span className="hidden sm:inline">Scenarios</span>
          </TabsTrigger>
          <TabsTrigger value="patterns" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Patterns</span>
          </TabsTrigger>
          <TabsTrigger value="accuracy" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Accuracy</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white gap-2">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">AI Advice</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Insights</span>
          </TabsTrigger>
          <TabsTrigger value="improvement" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white gap-2">
            <LineChart className="h-4 w-4" />
            <span className="hidden sm:inline">Growth</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4 mt-4">
          <JobSearchTimelineForecast />
        </TabsContent>

        <TabsContent value="salary" className="space-y-4 mt-4">
          <SalaryNegotiationOutcomePredictor />
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-4 mt-4">
          <JobSearchScenarioPlanner />
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4 mt-4">
          <SuccessPatternRecognition />
        </TabsContent>

        <TabsContent value="accuracy" className="space-y-4 mt-4">
          <InterviewPredictionAccuracy />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 mt-4">
          <CustomReportBuilder />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4 mt-4">
          <PersonalizedRecommendations data={analyticsData} metrics={metrics} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4 mt-4">
          <StrategyInsights data={analyticsData} />
        </TabsContent>

        <TabsContent value="improvement" className="space-y-4 mt-4">
          <ImprovementTimeline data={analyticsData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
