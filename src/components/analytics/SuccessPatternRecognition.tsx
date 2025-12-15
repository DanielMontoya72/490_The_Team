import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  Clock,
  Target,
  Lightbulb,
  Award,
  Calendar,
  Activity,
  Brain,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Sparkles
} from "lucide-react";

export function SuccessPatternRecognition() {
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  // Fetch all relevant data for pattern analysis
  const { data: analysisData, isLoading } = useQuery({
    queryKey: ['success-pattern-analysis', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const userId = session!.user!.id;

      // Fetch jobs with outcomes
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      // Fetch interviews with outcomes
      const { data: interviews, error: interviewsError } = await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', userId)
        .order('interview_date', { ascending: false });

      if (interviewsError) throw interviewsError;

      // Fetch time tracking entries
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_tracking_entries')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (timeError) throw timeError;

      // Fetch mock interview sessions
      const { data: mockSessions, error: mockError } = await supabase
        .from('mock_interview_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (mockError) throw mockError;

      // Fetch interview success predictions
      const { data: predictions, error: predError } = await supabase
        .from('interview_success_predictions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (predError) throw predError;

      // Fetch company research
      const { data: research, error: resError } = await supabase
        .from('company_research')
        .select('*')
        .eq('user_id', userId);

      if (resError) throw resError;

      // Fetch application checklists
      const { data: checklists, error: checkError } = await supabase
        .from('application_checklists')
        .select('*')
        .eq('user_id', userId);

      if (checkError) throw checkError;

      return {
        jobs: jobs || [],
        interviews: interviews || [],
        timeEntries: timeEntries || [],
        mockSessions: mockSessions || [],
        predictions: predictions || [],
        research: research || [],
        checklists: checklists || [],
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!analysisData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No data available for pattern analysis</p>
        </CardContent>
      </Card>
    );
  }

  const { jobs, interviews, timeEntries, mockSessions, predictions, research, checklists } = analysisData;

  // Pattern Analysis: Successful Applications (case-insensitive matching)
  const successfulJobs = jobs.filter(job => {
    const status = (job.status || '').toLowerCase();
    return status === 'offer' || status === 'accepted' || status === 'offer received';
  });
  const interviewedJobs = jobs.filter(job => 
    interviews.some(interview => interview.job_id === job.id)
  );

  const applicationSuccessRate = jobs.length > 0 
    ? (interviewedJobs.length / jobs.length) * 100 
    : 0;

  const offerRate = interviewedJobs.length > 0 
    ? (successfulJobs.length / interviewedJobs.length) * 100 
    : 0;

  // Pattern Analysis: Preparation Correlation (case-insensitive matching)
  const completedInterviews = interviews.filter(i => (i.status || '').toLowerCase() === 'completed');
  const successfulInterviews = completedInterviews.filter(i => {
    const outcome = (i.outcome || '').toLowerCase();
    return outcome === 'offer' || outcome === 'advanced' || outcome === 'passed' || outcome === 'accepted';
  });
  
  const interviewsWithPrep = completedInterviews.filter(interview => {
    const interviewDate = new Date(interview.interview_date);
    const prepWindow = new Date(interviewDate);
    prepWindow.setDate(prepWindow.getDate() - 7); // 7 days before
    
    const prepTime = timeEntries.filter(entry => {
      const entryDate = new Date(entry.started_at);
      return entryDate >= prepWindow && entryDate <= interviewDate &&
        (entry.activity_type === 'interview_prep' || entry.activity_type === 'research');
    });

    return prepTime.length > 0;
  });

  const successWithPrep = successfulInterviews.filter(interview => {
    const interviewDate = new Date(interview.interview_date);
    const prepWindow = new Date(interviewDate);
    prepWindow.setDate(prepWindow.getDate() - 7);
    
    const prepTime = timeEntries.filter(entry => {
      const entryDate = new Date(entry.started_at);
      return entryDate >= prepWindow && entryDate <= interviewDate &&
        (entry.activity_type === 'interview_prep' || entry.activity_type === 'research');
    });

    return prepTime.length > 0;
  });

  const prepSuccessRate = interviewsWithPrep.length > 0
    ? (successWithPrep.length / interviewsWithPrep.length) * 100
    : 0;

  const noPrepSuccessRate = (completedInterviews.length - interviewsWithPrep.length) > 0
    ? ((successfulInterviews.length - successWithPrep.length) / (completedInterviews.length - interviewsWithPrep.length)) * 100
    : 0;

  // Pattern Analysis: Mock Interview Impact
  const interviewsWithMocks = completedInterviews.filter(interview => {
    const interviewDate = new Date(interview.interview_date);
    const mockWindow = new Date(interviewDate);
    mockWindow.setDate(mockWindow.getDate() - 14); // 2 weeks before
    
    const hasMock = mockSessions.some(mock => {
      const mockDate = new Date(mock.created_at);
      return mockDate >= mockWindow && mockDate <= interviewDate;
    });

    return hasMock;
  });

  const successWithMocks = successfulInterviews.filter(interview => {
    const interviewDate = new Date(interview.interview_date);
    const mockWindow = new Date(interviewDate);
    mockWindow.setDate(mockWindow.getDate() - 14);
    
    const hasMock = mockSessions.some(mock => {
      const mockDate = new Date(mock.created_at);
      return mockDate >= mockWindow && mockDate <= interviewDate;
    });

    return hasMock;
  });

  const mockSuccessRate = interviewsWithMocks.length > 0
    ? (successWithMocks.length / interviewsWithMocks.length) * 100
    : 0;

  // Pattern Analysis: Company Research Impact
  const jobsWithResearch = jobs.filter(job => 
    research.some(r => r.job_id === job.id)
  );

  const successWithResearch = successfulJobs.filter(job => 
    research.some(r => r.job_id === job.id)
  );

  const researchSuccessRate = jobsWithResearch.length > 0
    ? (successWithResearch.length / jobsWithResearch.length) * 100
    : 0;

  // Pattern Analysis: Timing Patterns
  const applicationsByDayOfWeek = jobs.reduce((acc, job) => {
    const day = new Date(job.created_at).getDay();
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const successByDayOfWeek = successfulJobs.reduce((acc, job) => {
    const day = new Date(job.created_at).getDay();
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const bestApplicationDays = Object.entries(applicationsByDayOfWeek)
    .map(([day, count]) => ({
      day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parseInt(day)],
      successRate: count > 0 ? ((successByDayOfWeek[parseInt(day)] || 0) / count) * 100 : 0,
      count
    }))
    .sort((a, b) => b.successRate - a.successRate);

  // Pattern Analysis: Application Checklist Completion
  const jobsWithChecklists = jobs.filter(job =>
    checklists.some(c => c.job_id === job.id)
  );

  const avgChecklistCompletion = checklists.length > 0
    ? checklists.reduce((sum, c) => sum + (c.completion_percentage || 0), 0) / checklists.length
    : 0;

  const highCompletionJobs = jobs.filter(job => {
    const checklist = checklists.find(c => c.job_id === job.id);
    return checklist && (checklist.completion_percentage || 0) >= 80;
  });

  const successWithHighCompletion = successfulJobs.filter(job => {
    const checklist = checklists.find(c => c.job_id === job.id);
    return checklist && (checklist.completion_percentage || 0) >= 80;
  });

  const checklistSuccessRate = highCompletionJobs.length > 0
    ? (successWithHighCompletion.length / highCompletionJobs.length) * 100
    : 0;

  // Pattern Analysis: Industry & Company Size Patterns
  const successByIndustry = successfulJobs.reduce((acc, job) => {
    const industry = job.industry || 'Unknown';
    acc[industry] = (acc[industry] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const successByCompanySize = successfulJobs.reduce((acc, job) => {
    const size = job.company_size || 'Unknown';
    acc[size] = (acc[size] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topIndustries = Object.entries(successByIndustry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const topCompanySizes = Object.entries(successByCompanySize)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Pattern Analysis: Time-to-Offer (case-insensitive matching)
  const jobsWithOffers = jobs.filter(job => {
    const status = (job.status || '').toLowerCase();
    return status === 'offer' || status === 'accepted' || status === 'offer received';
  });

  const avgTimeToOffer = jobsWithOffers.length > 0
    ? jobsWithOffers.reduce((sum, job) => {
        const applied = new Date(job.created_at);
        const firstInterview = interviews
          .filter(i => i.job_id === job.id)
          .sort((a, b) => new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime())[0];
        
        if (firstInterview) {
          const interviewDate = new Date(firstInterview.interview_date);
          const days = Math.floor((interviewDate.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }
        return sum;
      }, 0) / jobsWithOffers.length
    : 0;

  // Predictive Insights
  const recentPredictions = predictions.slice(0, 10);
  const avgPredictedProbability = recentPredictions.length > 0
    ? recentPredictions.reduce((sum, p) => sum + (p.overall_probability || 0), 0) / recentPredictions.length
    : 0;

  // Generate Recommendations
  const recommendations = [];

  if (prepSuccessRate > noPrepSuccessRate + 10) {
    recommendations.push({
      type: 'preparation',
      title: 'Preparation Shows Strong Impact',
      description: `Your success rate is ${(prepSuccessRate - noPrepSuccessRate).toFixed(1)}% higher when you prepare. Continue dedicating time to interview prep.`,
      impact: 'high',
      metric: `${prepSuccessRate.toFixed(0)}% with prep vs ${noPrepSuccessRate.toFixed(0)}% without`,
    });
  }

  if (mockSuccessRate > 60 && interviewsWithMocks.length >= 3) {
    recommendations.push({
      type: 'practice',
      title: 'Mock Interviews Drive Success',
      description: `You achieve ${mockSuccessRate.toFixed(0)}% success rate when practicing with mock interviews. Keep this as part of your routine.`,
      impact: 'high',
      metric: `${mockSuccessRate.toFixed(0)}% success with mocks`,
    });
  }

  if (researchSuccessRate > 50 && jobsWithResearch.length >= 3) {
    recommendations.push({
      type: 'research',
      title: 'Company Research Pays Off',
      description: `${researchSuccessRate.toFixed(0)}% of researched companies lead to offers. Continue thorough company research.`,
      impact: 'medium',
      metric: `${researchSuccessRate.toFixed(0)}% success with research`,
    });
  }

  if (checklistSuccessRate > 50 && highCompletionJobs.length >= 3) {
    recommendations.push({
      type: 'checklist',
      title: 'Thorough Applications Win',
      description: `Completing 80%+ of application checklists correlates with ${checklistSuccessRate.toFixed(0)}% success rate.`,
      impact: 'medium',
      metric: `${checklistSuccessRate.toFixed(0)}% success rate`,
    });
  }

  if (bestApplicationDays.length > 0 && bestApplicationDays[0].count >= 5) {
    recommendations.push({
      type: 'timing',
      title: `${bestApplicationDays[0].day}s Are Your Best Day`,
      description: `Your ${bestApplicationDays[0].day} applications have ${bestApplicationDays[0].successRate.toFixed(0)}% success rate. Consider focusing applications on this day.`,
      impact: 'low',
      metric: `${bestApplicationDays[0].successRate.toFixed(0)}% on ${bestApplicationDays[0].day}s`,
    });
  }

  if (topIndustries.length > 0 && topIndustries[0][1] >= 2) {
    recommendations.push({
      type: 'industry',
      title: `Strong Performance in ${topIndustries[0][0]}`,
      description: `You've secured ${topIndustries[0][1]} offer(s) in ${topIndustries[0][0]}. Consider focusing more on this industry.`,
      impact: 'medium',
      metric: `${topIndustries[0][1]} successful offer(s)`,
    });
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getImpactBadgeVariant = (impact: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (impact) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Success Pattern Recognition</CardTitle>
              <CardDescription>
                AI-powered analysis of what strategies lead to your best outcomes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Success Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Application Success
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {applicationSuccessRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {interviewedJobs.length} of {jobs.length} led to interviews
            </p>
            <Progress value={applicationSuccessRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-blue-500" />
              Interview-to-Offer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {offerRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {successfulJobs.length} offers from {interviewedJobs.length} interviews
            </p>
            <Progress value={offerRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              Prep Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              +{(prepSuccessRate - noPrepSuccessRate).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Higher success with preparation
            </p>
            <Progress value={Math.max(0, prepSuccessRate - noPrepSuccessRate)} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Avg Time to Offer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {avgTimeToOffer.toFixed(0)} days
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From application to interview
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Correlation Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Preparation Activity Correlation
          </CardTitle>
          <CardDescription>
            How preparation activities impact your success rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Interview Prep Time</span>
                <Badge variant={prepSuccessRate > noPrepSuccessRate ? "default" : "secondary"}>
                  {prepSuccessRate > noPrepSuccessRate ? 'Positive' : 'Neutral'}
                </Badge>
              </div>
              <Progress value={prepSuccessRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {prepSuccessRate.toFixed(0)}% success with prep vs {noPrepSuccessRate.toFixed(0)}% without
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Mock Interviews</span>
                <Badge variant={mockSuccessRate > 50 ? "default" : "secondary"}>
                  {mockSuccessRate > 50 ? 'Strong' : 'Building'}
                </Badge>
              </div>
              <Progress value={mockSuccessRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {mockSuccessRate.toFixed(0)}% success rate with practice interviews
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Company Research</span>
                <Badge variant={researchSuccessRate > 40 ? "default" : "secondary"}>
                  {researchSuccessRate > 40 ? 'Impactful' : 'Growing'}
                </Badge>
              </div>
              <Progress value={researchSuccessRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {researchSuccessRate.toFixed(0)}% success when researching companies
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timing Patterns */}
      {bestApplicationDays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Optimal Timing Patterns
            </CardTitle>
            <CardDescription>
              When you submit applications matters for success
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bestApplicationDays.slice(0, 3).map((dayData) => (
                <div key={dayData.day} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${dayData.successRate > 30 ? 'bg-green-500' : dayData.successRate > 15 ? 'bg-yellow-500' : 'bg-gray-500'}`} />
                    <div>
                      <p className="font-medium">{dayData.day}</p>
                      <p className="text-xs text-muted-foreground">{dayData.count} applications</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{dayData.successRate.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">Success rate</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Factor Insights */}
      {(topIndustries.length > 0 || topCompanySizes.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Personal Success Factors
            </CardTitle>
            <CardDescription>
              Industries and company types where you excel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {topIndustries.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Top Industries</h4>
                  {topIndustries.map(([industry, count]) => (
                    <div key={industry} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm font-medium">{industry}</span>
                      <Badge variant="secondary">{count} offer{count > 1 ? 's' : ''}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {topCompanySizes.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Top Company Sizes</h4>
                  {topCompanySizes.map(([size, count]) => (
                    <div key={size} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm font-medium">{size}</span>
                      <Badge variant="secondary">{count} offer{count > 1 ? 's' : ''}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI-Powered Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Recommended Strategies Based on Your Patterns
            </CardTitle>
            <CardDescription>
              Actionable insights derived from your historical success data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-background">
                  <div className="flex items-start gap-3">
                    <div className={`w-1 h-full rounded-full ${getImpactColor(rec.impact)}`} />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold flex items-center gap-2">
                          {rec.type === 'preparation' && <Activity className="h-4 w-4" />}
                          {rec.type === 'practice' && <Target className="h-4 w-4" />}
                          {rec.type === 'research' && <Lightbulb className="h-4 w-4" />}
                          {rec.type === 'checklist' && <CheckCircle2 className="h-4 w-4" />}
                          {rec.type === 'timing' && <Clock className="h-4 w-4" />}
                          {rec.type === 'industry' && <TrendingUp className="h-4 w-4" />}
                          {rec.title}
                        </h4>
                        <Badge variant={getImpactBadgeVariant(rec.impact)}>
                          {rec.impact} impact
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                        <span className="font-medium text-green-600 dark:text-green-400">{rec.metric}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predictive Modeling */}
      {recentPredictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Predictive Success Modeling
            </CardTitle>
            <CardDescription>
              AI predictions for future interview outcomes based on your patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">Average Predicted Success Probability</p>
                  <p className="text-xs text-muted-foreground mt-1">Based on last {recentPredictions.length} predictions</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{(avgPredictedProbability * 100).toFixed(0)}%</p>
                  <Badge variant={avgPredictedProbability > 0.6 ? "default" : "secondary"} className="mt-1">
                    {avgPredictedProbability > 0.6 ? 'Strong' : 'Building'}
                  </Badge>
                </div>
              </div>

              {avgPredictedProbability < 0.5 && (
                <div className="flex items-start gap-3 p-3 border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-900 dark:text-yellow-100">
                      Consider increasing preparation activities
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                      Your recent prediction scores suggest more prep time could improve outcomes.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Insufficient Message */}
      {jobs.length < 5 && (
        <Card className="border-2 border-dashed">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="font-medium">Building Your Success Profile</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                As you add more applications and track outcomes, we'll identify more patterns and provide increasingly accurate recommendations.
                Current data: {jobs.length} applications, {interviews.length} interviews.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
