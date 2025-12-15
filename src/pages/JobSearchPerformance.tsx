import { useState, useEffect } from "react";
import { AppNav } from "@/components/layout/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar as CalendarIcon, 
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  Award,
  Plus,
  X,
  BarChart3,
  Lightbulb
} from "lucide-react";
import { ConversionRateTracker } from "@/components/analytics/ConversionRateTracker";
import { CompanyTypePerformance } from "@/components/analytics/CompanyTypePerformance";
import { InterviewAreasAnalysis } from "@/components/analytics/InterviewAreasAnalysis";
import { FormatComparison } from "@/components/analytics/FormatComparison";
import { ImprovementTimeline } from "@/components/analytics/ImprovementTimeline";
import { StrategyInsights } from "@/components/analytics/StrategyInsights";
import { PersonalizedRecommendations } from "@/components/analytics/PersonalizedRecommendations";
import { ApplicationSuccessAnalysis } from "@/components/analytics/ApplicationSuccessAnalysis";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

interface Goal {
  id: string;
  goal_type: string;
  target_value: number;
  time_period: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

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
}

export default function JobSearchPerformance() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [newGoal, setNewGoal] = useState({
    goal_type: "applications",
    target_value: 0,
    time_period: "weekly",
  });

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
  const { data: interviews = [], isLoading: interviewsLoading } = useQuery({
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

  // Fetch interview analytics supporting data (predictions, mocks, responses)
  const { data: analyticsData } = useQuery({
    queryKey: ['interview-analytics-data', dateRange, interviews.length],
    enabled: !interviewsLoading,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return { interviews, predictions: [], mockSessions: [], questionResponses: [], jobs };
      
      const [predictions, mockSessions, questionResponses] = await Promise.all([
        supabase
          .from('interview_success_predictions')
          .select('*')
          .eq('user_id', session.user.id)
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('mock_interview_sessions')
          .select('*')
          .eq('user_id', session.user.id)
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('interview_question_responses')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_practiced', true)
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString()),
      ]);

      return {
        interviews,
        predictions: predictions.data || [],
        mockSessions: mockSessions.data || [],
        questionResponses: questionResponses.data || [],
        jobs,
      };
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

  // Fetch goals
  const { data: goals = [], refetch: refetchGoals } = useQuery({
    queryKey: ["job-search-goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_search_goals")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate performance metrics
  const metrics: PerformanceMetrics = {
    totalApplications: jobs.filter(j => j.status !== "Interested").length,
    interviewsScheduled: interviews.length,
    offersReceived: jobs.filter(j => j.status === "Offer Received").length,
    responseRate: 0,
    interviewConversionRate: 0,
    offerConversionRate: 0,
    avgTimeToResponse: 0,
    avgTimeToInterview: 0,
    avgTimeToOffer: 0,
    applicationTrend: 0,
  };

  // Calculate conversion rates
  if (metrics.totalApplications > 0) {
    const responded = statusHistory.filter(h => h.to_status !== "Interested" && h.to_status !== "Applied").length;
    metrics.responseRate = (responded / metrics.totalApplications) * 100;
    metrics.interviewConversionRate = (metrics.interviewsScheduled / metrics.totalApplications) * 100;
    metrics.offerConversionRate = (metrics.offersReceived / metrics.totalApplications) * 100;
  }

  // Calculate time metrics
  // Time to Response: First status change after initial application
  const responseJobs = jobs.filter(j => {
    const history = statusHistory.filter(h => h.job_id === j.id);
    return history.length > 0;
  });
  
  if (responseJobs.length > 0) {
    const totalDays = responseJobs.reduce((sum, job) => {
      const firstChange = statusHistory
        .filter(h => h.job_id === job.id)
        .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime())[0];
      if (!firstChange) return sum;
      const days = Math.floor((new Date(firstChange.changed_at).getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    metrics.avgTimeToResponse = totalDays / responseJobs.length;
  }

  // Time to Interview: From job creation to first interview
  const interviewJobs = jobs.filter(j => {
    return interviews.some(i => i.job_id === j.id);
  });
  
  if (interviewJobs.length > 0) {
    const totalDays = interviewJobs.reduce((sum, job) => {
      const firstInterview = interviews
        .filter(i => i.job_id === job.id)
        .sort((a, b) => new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime())[0];
      if (!firstInterview || !firstInterview.interview_date) return sum;
      const days = Math.floor((new Date(firstInterview.interview_date).getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    metrics.avgTimeToInterview = totalDays / interviewJobs.length;
  }

  // Time to Offer: From job creation to offer received status
  const offerJobs = jobs.filter(j => j.status === "Offer Received");
  
  if (offerJobs.length > 0) {
    const totalDays = offerJobs.reduce((sum, job) => {
      const offerTransition = statusHistory
        .filter(h => h.job_id === job.id && h.to_status === "Offer Received")
        .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime())[0];
      if (!offerTransition) return sum;
      const days = Math.floor((new Date(offerTransition.changed_at).getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    metrics.avgTimeToOffer = totalDays / offerJobs.length;
  }

  // Calculate application trend
  const midpoint = new Date((dateRange.from.getTime() + dateRange.to.getTime()) / 2);
  const firstHalf = jobs.filter(j => new Date(j.created_at) < midpoint).length;
  const secondHalf = jobs.filter(j => new Date(j.created_at) >= midpoint).length;
  metrics.applicationTrend = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

  // Funnel data
  const funnelData = [
    { stage: "Applied", count: metrics.totalApplications, percentage: 100 },
    { stage: "Response", count: Math.round(metrics.totalApplications * metrics.responseRate / 100), percentage: metrics.responseRate },
    { stage: "Interview", count: metrics.interviewsScheduled, percentage: metrics.interviewConversionRate },
    { stage: "Offer", count: metrics.offersReceived, percentage: metrics.offerConversionRate },
  ];

  // Trend data by week
  const trendData = [];
  const weeks = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (7 * 24 * 60 * 60 * 1000));
  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date(dateRange.from.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const weekJobs = jobs.filter(j => {
      const date = new Date(j.created_at);
      return date >= weekStart && date < weekEnd;
    });
    
    const weekInterviews = interviews.filter(i => {
      const date = new Date(i.created_at);
      return date >= weekStart && date < weekEnd;
    });
    
    trendData.push({
      week: `Week ${i + 1}`,
      applications: weekJobs.length,
      interviews: weekInterviews.length,
      offers: weekJobs.filter(j => j.status === "Offer Received").length,
    });
  }

  // Industry benchmarks (hardcoded for now)
  const benchmarks = {
    responseRate: 25,
    interviewConversionRate: 15,
    offerConversionRate: 5,
    avgTimeToResponse: 14,
  };

  // Generate insights
  const insights = [];
  
  if (metrics.responseRate < benchmarks.responseRate) {
    insights.push({
      type: "warning",
      title: "Low Response Rate",
      message: `Your response rate (${metrics.responseRate.toFixed(1)}%) is below industry average (${benchmarks.responseRate}%). Consider improving your resume and application materials.`,
    });
  }
  
  if (metrics.interviewConversionRate > benchmarks.interviewConversionRate) {
    insights.push({
      type: "success",
      title: "Strong Interview Performance",
      message: `Your interview conversion rate (${metrics.interviewConversionRate.toFixed(1)}%) exceeds industry average (${benchmarks.interviewConversionRate}%). Keep up the great work!`,
    });
  }
  
  if (metrics.avgTimeToResponse > benchmarks.avgTimeToResponse) {
    insights.push({
      type: "info",
      title: "Slow Response Times",
      message: `Average time to response is ${metrics.avgTimeToResponse.toFixed(1)} days, above the ${benchmarks.avgTimeToResponse} day benchmark. Consider following up more proactively.`,
    });
  }
  
  if (metrics.applicationTrend > 20) {
    insights.push({
      type: "success",
      title: "Increasing Activity",
      message: `Your application volume has increased by ${metrics.applicationTrend.toFixed(1)}% in the selected period. Maintain this momentum!`,
    });
  } else if (metrics.applicationTrend < -20) {
    insights.push({
      type: "warning",
      title: "Decreasing Activity",
      message: `Your application volume has decreased by ${Math.abs(metrics.applicationTrend).toFixed(1)}%. Consider setting daily or weekly application goals to stay on track.`,
    });
  }

  const handleCreateGoal = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("job_search_goals").insert({
        user_id: user.id,
        goal_type: newGoal.goal_type,
        target_value: newGoal.target_value,
        time_period: newGoal.time_period,
        start_date: new Date().toISOString().split("T")[0],
        is_active: true,
      });

      if (error) throw error;

      toast.success("Goal created successfully");
      setShowGoalDialog(false);
      setNewGoal({ goal_type: "applications", target_value: 0, time_period: "weekly" });
      refetchGoals();
    } catch (error: any) {
      toast.error(error.message || "Failed to create goal");
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from("job_search_goals")
        .update({ is_active: false })
        .eq("id", goalId);

      if (error) throw error;

      toast.success("Goal removed");
      refetchGoals();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove goal");
    }
  };

  const exportReport = () => {
    const report = `Job Search Performance Report
Generated: ${format(new Date(), "PPP")}
Period: ${format(dateRange.from, "PPP")} - ${format(dateRange.to, "PPP")}

KEY METRICS:
- Total Applications: ${metrics.totalApplications}
- Interviews Scheduled: ${metrics.interviewsScheduled}
- Offers Received: ${metrics.offersReceived}
- Response Rate: ${metrics.responseRate.toFixed(1)}%
- Interview Conversion: ${metrics.interviewConversionRate.toFixed(1)}%
- Offer Conversion: ${metrics.offerConversionRate.toFixed(1)}%

TIME METRICS:
- Avg Time to Response: ${metrics.avgTimeToResponse.toFixed(1)} days
- Avg Time to Interview: ${metrics.avgTimeToInterview.toFixed(1)} days
- Avg Time to Offer: ${metrics.avgTimeToOffer.toFixed(1)} days

INSIGHTS:
${insights.map(i => `- ${i.title}: ${i.message}`).join("\n")}
`;

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-search-performance-${format(new Date(), "yyyy-MM-dd")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Job Search Performance</h1>
            <p className="text-muted-foreground">Track and optimize your job search effectiveness</p>
          </div>
          
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-4 space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                  >
                    Last 7 days
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                  >
                    Last 30 days
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setDateRange({ 
                      from: startOfMonth(new Date()), 
                      to: endOfMonth(new Date()) 
                    })}
                  >
                    This month
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            <Button onClick={exportReport} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Applications Sent</p>
                <p className="text-3xl font-bold">{metrics.totalApplications}</p>
                <div className="flex items-center gap-1 mt-2">
                  {metrics.applicationTrend > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm ${metrics.applicationTrend > 0 ? "text-green-500" : "text-red-500"}`}>
                    {Math.abs(metrics.applicationTrend).toFixed(1)}%
                  </span>
                </div>
              </div>
              <Target className="h-12 w-12 text-muted-foreground opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Interviews Scheduled</p>
                <p className="text-3xl font-bold">{metrics.interviewsScheduled}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {metrics.interviewConversionRate.toFixed(1)}% conversion
                </p>
              </div>
              <Clock className="h-12 w-12 text-muted-foreground opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Offers Received</p>
                <p className="text-3xl font-bold">{metrics.offersReceived}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {metrics.offerConversionRate.toFixed(1)}% conversion
                </p>
              </div>
              <Award className="h-12 w-12 text-muted-foreground opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="text-3xl font-bold">{metrics.responseRate.toFixed(1)}%</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={metrics.responseRate >= benchmarks.responseRate ? "default" : "secondary"}>
                    vs {benchmarks.responseRate}% avg
                  </Badge>
                </div>
              </div>
              <Zap className="h-12 w-12 text-muted-foreground opacity-50" />
            </div>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="funnel" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="interview-analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Interview Analytics
            </TabsTrigger>
            <TabsTrigger value="success-analysis" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              Success Analysis
            </TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          {/* Funnel Tab */}
          <TabsContent value="funnel" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Application Funnel</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnelData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
              
              <div className="mt-6 space-y-4">
                {funnelData.map((stage, index) => (
                  <div key={stage.stage}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{stage.stage}</span>
                      <span className="text-sm text-muted-foreground">
                        {stage.count} ({stage.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={stage.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Avg Time to Response</p>
                <p className="text-2xl font-bold">{metrics.avgTimeToResponse.toFixed(1)} days</p>
                <Badge variant={metrics.avgTimeToResponse <= benchmarks.avgTimeToResponse ? "default" : "secondary"} className="mt-2">
                  Benchmark: {benchmarks.avgTimeToResponse} days
                </Badge>
              </Card>

              <Card className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Avg Time to Interview</p>
                <p className="text-2xl font-bold">{metrics.avgTimeToInterview.toFixed(1)} days</p>
                <p className="text-xs text-muted-foreground mt-2">From phone screen</p>
              </Card>

              <Card className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Avg Time to Offer</p>
                <p className="text-2xl font-bold">{metrics.avgTimeToOffer.toFixed(1)} days</p>
                <p className="text-xs text-muted-foreground mt-2">From interview</p>
              </Card>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Activity Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Legend />
                  <Line type="monotone" dataKey="applications" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="interviews" stroke="hsl(var(--secondary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="offers" stroke="hsl(var(--accent))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Performance vs Benchmarks</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Response Rate</span>
                      <span className="text-sm font-medium">{metrics.responseRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={(metrics.responseRate / benchmarks.responseRate) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">Target: {benchmarks.responseRate}%</p>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Interview Conversion</span>
                      <span className="text-sm font-medium">{metrics.interviewConversionRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={(metrics.interviewConversionRate / benchmarks.interviewConversionRate) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">Target: {benchmarks.interviewConversionRate}%</p>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Offer Conversion</span>
                      <span className="text-sm font-medium">{metrics.offerConversionRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={(metrics.offerConversionRate / benchmarks.offerConversionRate) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">Target: {benchmarks.offerConversionRate}%</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Success Patterns</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Best Application Day</p>
                      <p className="text-xs text-muted-foreground">
                        Tuesday shows highest response rates
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Optimal Follow-up Time</p>
                      <p className="text-xs text-muted-foreground">
                        7-10 days after application
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Interview Success Rate</p>
                      <p className="text-xs text-muted-foreground">
                        {metrics.interviewsScheduled > 0 
                          ? ((metrics.offersReceived / metrics.interviewsScheduled) * 100).toFixed(1) 
                          : 0}% of interviews lead to offers
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Your Goals</h3>
              <Button onClick={() => setShowGoalDialog(!showGoalDialog)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Goal
              </Button>
            </div>

            {showGoalDialog && (
              <Card className="p-6">
                <h4 className="font-semibold mb-4">Create New Goal</h4>
                <div className="space-y-4">
                  <div>
                    <Label>Goal Type</Label>
                    <Select 
                      value={newGoal.goal_type} 
                      onValueChange={(value) => setNewGoal({ ...newGoal, goal_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="applications">Applications Sent</SelectItem>
                        <SelectItem value="interviews">Interviews Scheduled</SelectItem>
                        <SelectItem value="offers">Offers Received</SelectItem>
                        <SelectItem value="response_rate">Response Rate (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Target Value</Label>
                    <Input
                      type="number"
                      value={newGoal.target_value}
                      onChange={(e) => setNewGoal({ ...newGoal, target_value: Number(e.target.value) })}
                      placeholder="Enter target value"
                    />
                  </div>

                  <div>
                    <Label>Time Period</Label>
                    <Select 
                      value={newGoal.time_period} 
                      onValueChange={(value) => setNewGoal({ ...newGoal, time_period: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleCreateGoal} className="flex-1">Create Goal</Button>
                    <Button onClick={() => setShowGoalDialog(false)} variant="outline">Cancel</Button>
                  </div>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((goal) => {
                let currentValue = 0;
                let unit = "";
                
                switch (goal.goal_type) {
                  case "applications":
                    currentValue = metrics.totalApplications;
                    unit = "applications";
                    break;
                  case "interviews":
                    currentValue = metrics.interviewsScheduled;
                    unit = "interviews";
                    break;
                  case "offers":
                    currentValue = metrics.offersReceived;
                    unit = "offers";
                    break;
                  case "response_rate":
                    currentValue = metrics.responseRate;
                    unit = "%";
                    break;
                }

                const progress = (currentValue / goal.target_value) * 100;

                return (
                  <Card key={goal.id} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-semibold capitalize">{goal.goal_type.replace("_", " ")}</p>
                        <p className="text-xs text-muted-foreground capitalize">{goal.time_period} Goal</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-2xl font-bold">
                          {currentValue.toFixed(goal.goal_type === "response_rate" ? 1 : 0)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          of {goal.target_value} {unit}
                        </span>
                      </div>
                      <Progress value={Math.min(progress, 100)} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {progress >= 100 ? "Goal achieved! 🎉" : `${Math.max(0, goal.target_value - currentValue).toFixed(0)} ${unit} to go`}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>

            {goals.length === 0 && !showGoalDialog && (
              <Card className="p-12 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Goals Set</h3>
                <p className="text-muted-foreground mb-4">
                  Set goals to track your progress and stay motivated
                </p>
                <Button onClick={() => setShowGoalDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Goal
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* Interview Analytics Tab - UC-080 */}
          <TabsContent value="interview-analytics" className="space-y-6">
            <div className="space-y-2 mb-6">
              <h2 className="text-2xl font-bold">Interview Performance Analytics</h2>
              <p className="text-muted-foreground">
                Deep insights into your interview performance, trends, and personalized recommendations
              </p>
            </div>

            {/* Overview Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Overview
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                <ConversionRateTracker data={analyticsData} />
                <FormatComparison data={analyticsData} />
              </div>
              <InterviewAreasAnalysis data={analyticsData} />
            </div>

            {/* Trends Section */}
            <div className="space-y-6 pt-6 border-t">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Trends
              </h3>
              <ImprovementTimeline data={analyticsData} />
              <CompanyTypePerformance data={analyticsData} />
            </div>

            {/* Insights & Recommendations Section */}
            <div className="space-y-6 pt-6 border-t">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                AI-Powered Insights & Recommendations
              </h3>
              <StrategyInsights data={analyticsData} />
              <PersonalizedRecommendations data={analyticsData} />
            </div>

            {/* Benchmark Comparison */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Industry Benchmarks</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Interview-to-Offer Rate</span>
                      <span className="text-sm text-muted-foreground">Industry: 20-25%</span>
                    </div>
                    <Progress 
                      value={analyticsData?.interviews?.length > 0 
                        ? (analyticsData.interviews.filter((i: any) => i.outcome === 'offer').length / analyticsData.interviews.length) * 100 
                        : 0
                      } 
                      className="h-2" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Your Rate: {analyticsData?.interviews?.length > 0 
                        ? ((analyticsData.interviews.filter((i: any) => i.outcome === 'offer').length / analyticsData.interviews.length) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Preparation Score</span>
                      <span className="text-sm text-muted-foreground">Target: 70%+</span>
                    </div>
                    <Progress 
                      value={analyticsData?.predictions?.length > 0
                        ? analyticsData.predictions.reduce((sum: number, p: any) => sum + (p.preparation_score || 0), 0) / analyticsData.predictions.length
                        : 0
                      } 
                      className="h-2" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Your Average: {analyticsData?.predictions?.length > 0
                        ? (analyticsData.predictions.reduce((sum: number, p: any) => sum + (p.preparation_score || 0), 0) / analyticsData.predictions.length).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Practice Sessions</span>
                      <span className="text-sm text-muted-foreground">Recommended: 5+</span>
                    </div>
                    <Progress 
                      value={Math.min((analyticsData?.mockSessions?.length || 0) / 5 * 100, 100)} 
                      className="h-2" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed: {analyticsData?.mockSessions?.length || 0} sessions
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Question Bank</span>
                      <span className="text-sm text-muted-foreground">Target: 20+</span>
                    </div>
                    <Progress 
                      value={Math.min((analyticsData?.questionResponses?.length || 0) / 20 * 100, 100)} 
                      className="h-2" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Prepared: {analyticsData?.questionResponses?.length || 0} responses
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Actionable Insights</h3>
              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      insight.type === "success"
                        ? "bg-green-50 dark:bg-green-950 border-green-500"
                        : insight.type === "warning"
                        ? "bg-yellow-50 dark:bg-yellow-950 border-yellow-500"
                        : "bg-blue-50 dark:bg-blue-950 border-blue-500"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {insight.type === "success" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : insight.type === "warning" ? (
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      )}
                      <div>
                        <p className="font-semibold">{insight.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{insight.message}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {insights.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      No insights available yet. Apply to more jobs to generate insights.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="bg-primary/10 p-2 rounded">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Optimize Application Timing</p>
                    <p className="text-xs text-muted-foreground">
                      Apply early in the week (Monday-Tuesday) for better visibility
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="bg-primary/10 p-2 rounded">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Follow Up Strategically</p>
                    <p className="text-xs text-muted-foreground">
                      Send a follow-up email 7-10 days after applying to increase response rates
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="bg-primary/10 p-2 rounded">
                    <Award className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Tailor Your Materials</p>
                    <p className="text-xs text-muted-foreground">
                      Customize your resume and cover letter for each application to improve conversion
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="bg-primary/10 p-2 rounded">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Maintain Consistency</p>
                    <p className="text-xs text-muted-foreground">
                      Set a goal of 5-10 applications per week to maintain momentum
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
          {/* Success Analysis Tab */}
          <TabsContent value="success-analysis">
            <ApplicationSuccessAnalysis />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}