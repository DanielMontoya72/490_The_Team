import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar as CalendarIcon, 
  CheckCircle2,
  Clock,
  Zap,
  Award,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";
import { DateRange, DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { ConversionRateTracker } from "@/components/analytics/ConversionRateTracker";
import { CompanyTypePerformance } from "@/components/analytics/CompanyTypePerformance";
import { InterviewAreasAnalysis } from "@/components/analytics/InterviewAreasAnalysis";
import { FormatComparison } from "@/components/analytics/FormatComparison";
import { IndustryBenchmarkComparison } from "@/components/analytics/IndustryBenchmarkComparison";
import { ApplicationAnalyticsDashboard } from "@/components/jobs/ApplicationAnalyticsDashboard";
import { ApplicationSuccessAnalysis } from "@/components/analytics/ApplicationSuccessAnalysis";
import { FeedbackThemesTracker } from "@/components/analytics/FeedbackThemesTracker";
import { ConfidenceAnxietyTracker } from "@/components/analytics/ConfidenceAnxietyTracker";

interface PerformanceMetrics {
  totalApplications: number;
  interviewsScheduled: number;
  offersReceived: number;
  responseRate: number;
  interviewConversionRate: number;
  offerConversionRate: number;
  avgTimeToResponse: number;
  avgTimeToInterview: number;
  avgTimeToOffer: number;
  applicationTrend: number;
  avgApplicationResponseDays: number;
  avgInterviewSchedulingDays: number;
}

export function JobSearchPerformanceTab() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>();

  // Fetch jobs data for current user only
  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs", dateRange],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("user_id", session.user.id)
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString())
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch interviews data for current user only
  const { data: interviews = [] } = useQuery({
    queryKey: ["interviews", dateRange],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from("interviews")
        .select("*, jobs(company_name, industry, company_size)")
        .eq("user_id", session.user.id)
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString());
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch job status history for current user's jobs only
  const { data: statusHistory = [] } = useQuery({
    queryKey: ["job-status-history", dateRange, jobs],
    enabled: jobs.length > 0,
    queryFn: async () => {
      const jobIds = jobs.map((j: any) => j.id);
      if (jobIds.length === 0) return [];
      const { data, error } = await supabase
        .from("job_status_history")
        .select("*")
        .in("job_id", jobIds)
        .gte("changed_at", dateRange.from.toISOString())
        .lte("changed_at", dateRange.to.toISOString());
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch interview analytics data (NO date filtering for all-time trends)
  const { data: analyticsData } = useQuery({
    queryKey: ['interview-analytics-data', interviews, jobs, statusHistory],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const [predictions, mockSessions, questionResponses] = await Promise.all([
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
          .eq('is_practiced', true),
      ]);

      // Build interview data from jobs that have reached interview stages
      // This combines actual interview records with job-status-based interview tracking
      const interviewStatusJobs = jobs.filter((j: any) => {
        // Include jobs currently in interview stages
        if (["Interview", "Interview Scheduled", "Phone Screen"].includes(j.status)) {
          return true;
        }
        // Include offer/accepted jobs (they passed interviews)
        if (["Offer Received", "Accepted"].includes(j.status)) {
          return true;
        }
        // For rejected jobs, check if they had interview stages
        if (j.status === "Rejected") {
          const jobHistory = statusHistory.filter((h: any) => h.job_id === j.id);
          return jobHistory.some((h: any) => 
            ["Interview", "Interview Scheduled", "Phone Screen"].includes(h.to_status)
          );
        }
        return false;
      });

      // Create synthetic interview records from jobs for analytics
      const jobBasedInterviews = interviewStatusJobs.map((job: any) => {
        // Determine outcome based on job status
        let outcome = "pending";
        if (["Offer Received", "Accepted"].includes(job.status)) {
          outcome = "passed";
        } else if (job.status === "Rejected") {
          outcome = "failed";
        }

        // Determine interview type based on status
        let interviewType = "in-person";
        if (job.status === "Phone Screen") {
          interviewType = "phone";
        }
        // Check history for interview type hints
        const jobHistory = statusHistory.filter((h: any) => h.job_id === job.id);
        const hadPhoneScreen = jobHistory.some((h: any) => h.to_status === "Phone Screen");
        const hadInterview = jobHistory.some((h: any) => 
          ["Interview", "Interview Scheduled"].includes(h.to_status)
        );
        
        if (hadPhoneScreen && !hadInterview) {
          interviewType = "phone";
        }

        return {
          id: job.id,
          job_id: job.id,
          interview_date: job.updated_at,
          interview_type: interviewType,
          outcome: outcome,
          status: job.status,
          jobs: {
            company_name: job.company_name,
            industry: job.industry,
            company_size: job.company_size,
          }
        };
      });

      // Use actual interviews only - don't combine with synthetic job-based interviews
      // This ensures accurate interview counts without duplicates
      return {
        interviews: interviews,
        predictions: predictions.data || [],
        mockSessions: mockSessions.data || [],
        questionResponses: questionResponses.data || [],
        jobs: jobs,
        statusHistory: statusHistory
      };
    },
    enabled: jobs.length >= 0, // Run after jobs are loaded
  });

  // Calculate previous period for trend
  const periodDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
  const previousPeriodStart = new Date(dateRange.from.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const previousPeriodJobs = jobs.filter(j => {
    const createdAt = new Date(j.created_at);
    return createdAt >= previousPeriodStart && createdAt < dateRange.from;
  });
  
  const currentPeriodApps = jobs.filter(j => j.status !== "Interested").length;
  const previousPeriodApps = previousPeriodJobs.filter(j => j.status !== "Interested").length;
  const applicationTrend = previousPeriodApps > 0 
    ? ((currentPeriodApps - previousPeriodApps) / previousPeriodApps) * 100 
    : 0;

  // Calculate performance metrics
  // Count unique jobs that have ever been in interview status
  // This includes: 1) jobs with interview status history, 2) jobs currently in interview stages,
  // 3) jobs that reached Offer (they must have had interviews)
  const jobsFromHistory = new Set(
    statusHistory
      .filter(h => ["Interview", "Interview Scheduled", "Phone Screen"].includes(h.to_status))
      .map(h => h.job_id)
  );
  
  // Also include jobs currently in interview stages or that reached offer stage
  // Jobs with offers MUST have had interviews to get there
  const jobsInInterviewStatus = new Set([
    ...jobsFromHistory,
    ...jobs.filter(j => [
      "Interview", 
      "Interview Scheduled", 
      "Phone Screen",
      "Offer Received", 
      "Accepted"
    ].includes(j.status)).map(j => j.id)
  ]);
  
  const metrics: PerformanceMetrics = {
    totalApplications: currentPeriodApps,
    interviewsScheduled: jobsInInterviewStatus.size,
    offersReceived: jobs.filter(j => ["Offer Received", "Accepted"].includes(j.status)).length,
    responseRate: 0,
    interviewConversionRate: 0,
    offerConversionRate: 0,
    avgTimeToResponse: 0,
    avgTimeToInterview: 0,
    avgTimeToOffer: 0,
    applicationTrend,
    avgApplicationResponseDays: 0,
    avgInterviewSchedulingDays: 0,
  };
  
  // Calculate conversion rates
  if (metrics.totalApplications > 0) {
    // Progressed jobs = any application that moved beyond "Applied" / "Interested"
    // Exclude rejections that happened without meaningful progression
    const progressedJobs = jobs.filter(j => {
      // Include jobs with positive progression statuses
      if ([
        "Interview",
        "Interview Scheduled",
        "Phone Screen",
        "Offer Received",
        "Accepted",
      ].includes(j.status)) {
        return true;
      }
      
      // For rejected jobs, check if they had any meaningful progression
      if (j.status === "Rejected") {
        const jobHistory = statusHistory.filter(h => h.job_id === j.id);
        const hadProgression = jobHistory.some(h => 
          ["Phone Screen", "Interview", "Interview Scheduled", "Offer Received", "Accepted"].includes(h.to_status)
        );
        return hadProgression;
      }
      
      return false;
    });

    metrics.responseRate = (progressedJobs.length / metrics.totalApplications) * 100;
    metrics.interviewConversionRate = (metrics.interviewsScheduled / metrics.totalApplications) * 100;
    metrics.offerConversionRate = metrics.interviewsScheduled > 0
      ? (metrics.offersReceived / metrics.interviewsScheduled) * 100
      : 0;
  }

  // Calculate time-to-response for applications
  const applicationResponseTimes: number[] = [];
  jobs.forEach(job => {
    if (job.status !== "Interested") {
      // Find first status change after "Applied"
      const jobHistory = statusHistory
        .filter(h => h.job_id === job.id)
        .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
      
      const firstResponse = jobHistory.find(h => 
        h.to_status !== "Applied" && h.to_status !== "Interested"
      );
      
      if (firstResponse) {
        const applicationDate = new Date(job.created_at);
        const responseDate = new Date(firstResponse.changed_at);
        const daysDiff = (responseDate.getTime() - applicationDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff >= 0) {
          applicationResponseTimes.push(daysDiff);
        }
      }
    }
  });

  if (applicationResponseTimes.length > 0) {
    metrics.avgApplicationResponseDays = applicationResponseTimes.reduce((a, b) => a + b, 0) / applicationResponseTimes.length;
  }

  // Calculate time from interview scheduling to interview date
  const interviewSchedulingTimes: number[] = [];
  interviews.forEach(interview => {
    const createdDate = new Date(interview.created_at);
    const interviewDate = new Date(interview.interview_date);
    const daysDiff = (interviewDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff >= 0) {
      interviewSchedulingTimes.push(daysDiff);
    }
  });

  if (interviewSchedulingTimes.length > 0) {
    metrics.avgInterviewSchedulingDays = interviewSchedulingTimes.reduce((a, b) => a + b, 0) / interviewSchedulingTimes.length;
  }
  
  // Funnel data
  const funnelData = [
    { stage: "Applied", count: metrics.totalApplications, percentage: 100 },
    { stage: "Progressed", count: Math.round(metrics.totalApplications * metrics.responseRate / 100), percentage: metrics.responseRate },
    { stage: "Interview", count: metrics.interviewsScheduled, percentage: metrics.interviewConversionRate },
    { stage: "Offer", count: metrics.offersReceived, percentage: metrics.offerConversionRate },
  ];

  // Trend data by month, week, or day
  const trendData = [];
  const totalDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (24 * 60 * 60 * 1000));
  const periods = totalDays <= 7 ? totalDays : (totalDays > 60 ? Math.ceil(totalDays / 30) : Math.ceil(totalDays / 7)); // Use days if <= 7, months if > 60, else weeks
  const periodLength = totalDays <= 7 ? 1 : (totalDays > 60 ? 30 : 7);
  const periodLabel = totalDays <= 7 ? "Day" : (totalDays > 60 ? "Month" : "Week");
  
  for (let i = 0; i < periods; i++) {
    const periodStart = new Date(dateRange.from.getTime() + i * periodLength * 24 * 60 * 60 * 1000);
    const periodEnd = new Date(periodStart.getTime() + periodLength * 24 * 60 * 60 * 1000);
    
    const periodJobs = jobs.filter(j => {
      const date = new Date(j.created_at);
      return date >= periodStart && date < periodEnd;
    });
    
    // Count unique jobs that moved to Interview status during this period
    const periodInterviewJobIds = new Set(
      statusHistory
        .filter(h => {
          const changedAt = new Date(h.changed_at);
          return ["Interview", "Interview Scheduled"].includes(h.to_status) &&
                 changedAt >= periodStart && 
                 changedAt < periodEnd;
        })
        .map(h => h.job_id)
    );
    
    // Count unique jobs that moved to Offer status during this period
    const periodOfferJobIds = new Set(
      statusHistory
        .filter(h => {
          const changedAt = new Date(h.changed_at);
          return ["Offer Received", "Accepted"].includes(h.to_status) &&
                 changedAt >= periodStart && 
                 changedAt < periodEnd;
        })
        .map(h => h.job_id)
    );
    
    trendData.push({
      week: totalDays <= 7 ? format(periodStart, "MMM d") : (totalDays > 60 ? format(periodStart, "MMM yyyy") : `${periodLabel} ${i + 1}`),
      applications: periodJobs.length,
      interviews: periodInterviewJobIds.size,
      offers: periodOfferJobIds.size,
    });
  }

  const exportPerformanceReport = () => {
    const report = `Job Search Performance Report
Generated: ${new Date().toLocaleDateString()}
Date Range: ${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}

Key Metrics:
- Total Applications: ${metrics.totalApplications}
- Interviews Scheduled: ${metrics.interviewsScheduled}
- Offers Received: ${metrics.offersReceived}
- Response Rate: ${metrics.responseRate.toFixed(1)}%
- Interview Conversion Rate: ${metrics.interviewConversionRate.toFixed(1)}%
- Offer Conversion Rate: ${metrics.offerConversionRate.toFixed(1)}%

Activity Trend:
${trendData.map(d => `- ${d.week}: ${d.applications} applications, ${d.interviews} interviews, ${d.offers} offers`).join('\n')}
`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-search-performance-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Performance report exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Job Search Performance</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Track your progress and optimize your job search strategy
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportPerformanceReport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-4 space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    setDateRange({
                      from: subDays(new Date(), 7),
                      to: new Date(),
                    });
                    setTempDateRange(undefined);
                  }}
                >
                  Last 7 days
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    setDateRange({
                      from: subDays(new Date(), 30),
                      to: new Date(),
                    });
                    setTempDateRange(undefined);
                  }}
                >
                  Last 30 days
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    setDateRange({
                      from: subDays(new Date(), 90),
                      to: new Date(),
                    });
                    setTempDateRange(undefined);
                  }}
                >
                  Last 90 days
                </Button>
                <div className="border-t pt-2 mt-2">
                  <p className="text-sm font-medium mb-2 px-2">Custom Range</p>
                  <DayPicker
                    mode="range"
                    selected={tempDateRange}
                    onSelect={setTempDateRange}
                    numberOfMonths={2}
                    disabled={(date) => date > new Date()}
                    className={cn("p-3 pointer-events-auto")}
                  />
                  <div className="p-2 pt-0">
                    <Button
                      className="w-full"
                      disabled={!tempDateRange?.from || !tempDateRange?.to}
                      onClick={() => {
                        if (tempDateRange?.from && tempDateRange?.to) {
                          setDateRange({
                            from: tempDateRange.from,
                            to: tempDateRange.to,
                          });
                        }
                      }}
                    >
                      Apply Custom Range
                    </Button>
                  </div>
                </div>
              </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Total Applications</span>
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div className="text-3xl font-bold">{metrics.totalApplications}</div>
          <div className="flex items-center gap-1 mt-2">
            {metrics.applicationTrend === 0 ? (
              <span className="text-sm text-muted-foreground">
                No change
              </span>
            ) : (
              <>
                {metrics.applicationTrend > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm ${metrics.applicationTrend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(metrics.applicationTrend).toFixed(1)}%
                </span>
              </>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Interview Rate</span>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold">{metrics.responseRate.toFixed(1)}%</div>
          <Progress value={metrics.responseRate} className="mt-2 h-2" />
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Interviews</span>
            <Clock className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold">{metrics.interviewsScheduled}</div>
          <p className="text-sm text-muted-foreground mt-2">
            {metrics.interviewConversionRate.toFixed(1)}% conversion
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Offers</span>
            <Award className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold">{metrics.offersReceived}</div>
          <p className="text-sm text-muted-foreground mt-2">
            {metrics.offerConversionRate.toFixed(1)}% success rate
          </p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Application Funnel</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--foreground))'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
              />
              <Bar dataKey="count" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Activity Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--foreground))'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Line type="monotone" dataKey="applications" stroke="#8B5CF6" strokeWidth={2} />
              <Line type="monotone" dataKey="interviews" stroke="#06B6D4" strokeWidth={2} />
              <Line type="monotone" dataKey="offers" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Quick Insights - Key findings from each tab */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Quick Insights from Each Category
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Conversion Rates Insight */}
          <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              <span className="text-sm font-medium">Conversion Performance</span>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">
                {metrics.responseRate.toFixed(0)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.responseRate > 50 
                  ? `Excellent - well above average`
                  : metrics.responseRate > 30
                  ? `Good conversion rate`
                  : `Focus on quality applications`}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {metrics.avgApplicationResponseDays.toFixed(0)} days avg response
              </div>
            </div>
          </div>

          {/* Application Analytics Insight */}
          <div className="space-y-2 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span className="text-sm font-medium">Application Activity</span>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {jobs.filter(j => j.status === 'Applied').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Applications pending response
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {metrics.applicationTrend > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : metrics.applicationTrend < 0 ? (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                ) : null}
                {metrics.applicationTrend !== 0 
                  ? `${Math.abs(metrics.applicationTrend).toFixed(0)}% ${metrics.applicationTrend > 0 ? 'increase' : 'decrease'}`
                  : 'Steady activity'}
              </div>
            </div>
          </div>

          {/* Interview Analytics Insight */}
          <div className="space-y-2 p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">Interview Pipeline</span>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {metrics.interviewsScheduled}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.interviewsScheduled === 1 ? 'Interview scheduled' : 'Interviews scheduled'}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {metrics.interviewConversionRate > 0 ? (
                  <>
                    <Award className="h-3 w-3" />
                    {metrics.interviewConversionRate.toFixed(0)}% to interview rate
                  </>
                ) : (
                  <>
                    <Target className="h-3 w-3" />
                    Focus on securing interviews
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Recommendations Insight */}
          <div className="space-y-2 p-4 border rounded-lg bg-yellow-50/50 dark:bg-yellow-950/20">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              <span className="text-sm font-medium">Top Action</span>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">
                {metrics.totalApplications === 0 
                  ? 'Start applying'
                  : metrics.responseRate < 30
                  ? 'Improve quality'
                  : metrics.interviewsScheduled === 0
                  ? 'Secure interviews'
                  : metrics.offersReceived === 0
                  ? 'Convert interviews'
                  : 'Keep momentum'}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.totalApplications === 0 
                  ? 'Begin your job search journey'
                  : metrics.responseRate < 30
                  ? 'Focus on targeted, quality applications'
                  : metrics.interviewsScheduled === 0
                  ? 'Applications need stronger positioning'
                  : metrics.offersReceived === 0
                  ? 'Polish interview performance'
                  : 'Continue current strategy'}
              </p>
              <Badge variant="outline" className="text-xs mt-1">
                Priority Action
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Advanced Analytics Components */}
      <Tabs defaultValue="conversion" className="w-full">
        <TabsList className="w-full bg-transparent border-b-2 border-primary/20 flex-wrap">
          <TabsTrigger value="conversion" className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none">Conversion Rates</TabsTrigger>
          <TabsTrigger value="application" className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none">Application Analytics</TabsTrigger>
          <TabsTrigger value="interviews" className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none">Interview Analytics</TabsTrigger>
          <TabsTrigger value="feedback" className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none">Feedback & Confidence</TabsTrigger>
          <TabsTrigger value="success-analysis" className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none">Success Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="conversion" className="space-y-4 mt-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Conversion Rate Insights</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 p-2 rounded">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Applications that Progress</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.responseRate.toFixed(1)}% of applications receive a response and progress beyond applied
                  </p>
                  <Progress value={metrics.responseRate} className="mt-2 h-2" />
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 p-2 rounded">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Application to Interview</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.interviewConversionRate.toFixed(1)}% of applications lead to interviews
                  </p>
                  <Progress value={metrics.interviewConversionRate} className="mt-2 h-2" />
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 p-2 rounded">
                  <Award className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Interview to Offer</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.interviewsScheduled > 0 
                      ? ((metrics.offersReceived / metrics.interviewsScheduled) * 100).toFixed(1)
                      : 0}% of interviews result in offers
                  </p>
                  <Progress 
                    value={metrics.interviewsScheduled > 0 ? (metrics.offersReceived / metrics.interviewsScheduled) * 100 : 0} 
                    className="mt-2 h-2" 
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Time-to-Response Metrics</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <div className="bg-blue-500/10 p-2 rounded">
                  <Clock className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Average Application Response Time</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.avgApplicationResponseDays > 0 
                      ? `${metrics.avgApplicationResponseDays.toFixed(1)} days on average until first response`
                      : "No response data available yet"}
                  </p>
                  {metrics.avgApplicationResponseDays > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="text-2xl font-bold text-blue-500">
                        {metrics.avgApplicationResponseDays.toFixed(1)}
                      </div>
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-purple-500/10 p-2 rounded">
                  <CalendarIcon className="h-4 w-4 text-purple-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Average Interview Scheduling Time</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.avgInterviewSchedulingDays > 0 
                      ? `${metrics.avgInterviewSchedulingDays.toFixed(1)} days from scheduling to interview date`
                      : "No interview scheduling data available yet"}
                  </p>
                  {metrics.avgInterviewSchedulingDays > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="text-2xl font-bold text-purple-500">
                        {metrics.avgInterviewSchedulingDays.toFixed(1)}
                      </div>
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <IndustryBenchmarkComparison 
            metrics={{
              responseRate: metrics.responseRate,
              interviewConversionRate: metrics.interviewConversionRate,
              offerConversionRate: metrics.offerConversionRate,
              avgApplicationResponseDays: metrics.avgApplicationResponseDays,
              avgInterviewSchedulingDays: metrics.avgInterviewSchedulingDays,
            }}
          />
        </TabsContent>

        <TabsContent value="application" className="space-y-4 mt-4">
          <ApplicationAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="interviews" className="space-y-4 mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <ConversionRateTracker data={analyticsData} />
            <FormatComparison data={analyticsData} />
          </div>
          <InterviewAreasAnalysis data={analyticsData} />
          <CompanyTypePerformance data={analyticsData} />
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4 mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <FeedbackThemesTracker data={analyticsData} />
            <ConfidenceAnxietyTracker data={analyticsData} />
          </div>
        </TabsContent>

        <TabsContent value="success-analysis" className="space-y-4 mt-4">
          <ApplicationSuccessAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}
