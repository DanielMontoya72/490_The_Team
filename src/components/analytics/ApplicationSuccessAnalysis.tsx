import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter
} from "recharts";
import {
  TrendingUp, TrendingDown, Target, Building2, Briefcase, Clock,
  FileText, Sparkles, AlertTriangle, CheckCircle2, Info, Loader2,
  BarChart3, PieChartIcon, Activity, Lightbulb, Calendar
} from "lucide-react";

interface AnalysisData {
  jobs: any[];
  interviews: any[];
  materials: any[];
  coverLetterPerformance: any[];
}

// Statistical significance helper (chi-square approximation)
function calculateSignificance(observed: number, expected: number, total: number): { pValue: number; significant: boolean } {
  if (expected === 0 || total === 0) return { pValue: 1, significant: false };
  const chiSquare = Math.pow(observed - expected, 2) / expected;
  // Simplified p-value approximation
  const pValue = Math.exp(-chiSquare / 2);
  return { pValue, significant: pValue < 0.05 };
}

export function ApplicationSuccessAnalysis() {
  const queryClient = useQueryClient();
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<any>(null);

  // Fetch all jobs for current user only
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["success-analysis-jobs"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch interviews
  const { data: interviews = [] } = useQuery({
    queryKey: ["success-analysis-interviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interviews")
        .select("*, jobs(company_name, industry, company_size)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch application materials
  const { data: materials = [] } = useQuery({
    queryKey: ["success-analysis-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_materials")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch cover letter performance
  const { data: coverLetterPerformance = [] } = useQuery({
    queryKey: ["success-analysis-cl-performance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cover_letter_performance")
        .select("*, jobs(company_name, industry)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch application packages
  const { data: packages = [] } = useQuery({
    queryKey: ["success-analysis-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_packages")
        .select("*, jobs(status, industry, company_size)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate success metrics
  const successfulStatuses = ["Offer Received", "Accepted"];
  const interviewStatuses = ["Interview Scheduled", "Interviewing", "Offer Received", "Accepted"];
  const rejectedStatuses = ["Rejected", "Declined"];

  const totalApplications = jobs.filter(j => j.status !== "Interested").length;
  const successfulApplications = jobs.filter(j => successfulStatuses.includes(j.status)).length;
  const interviewedApplications = jobs.filter(j => interviewStatuses.includes(j.status)).length;
  const rejectedApplications = jobs.filter(j => rejectedStatuses.includes(j.status)).length;

  // 1. Success rates by industry
  const industryStats = jobs.reduce((acc: any, job) => {
    const industry = job.industry || "Unknown";
    if (!acc[industry]) {
      acc[industry] = { total: 0, success: 0, interviews: 0, rejected: 0 };
    }
    if (job.status !== "Interested") {
      acc[industry].total++;
      if (successfulStatuses.includes(job.status)) acc[industry].success++;
      if (interviewStatuses.includes(job.status)) acc[industry].interviews++;
      if (rejectedStatuses.includes(job.status)) acc[industry].rejected++;
    }
    return acc;
  }, {});

  const industryData = Object.entries(industryStats)
    .map(([industry, stats]: [string, any]) => ({
      industry,
      total: stats.total,
      successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0,
      interviewRate: stats.total > 0 ? (stats.interviews / stats.total) * 100 : 0,
      rejectionRate: stats.total > 0 ? (stats.rejected / stats.total) * 100 : 0,
    }))
    .filter(d => d.total >= 2)
    .sort((a, b) => b.successRate - a.successRate);

  // 2. Success rates by company size
  const companySizeStats = jobs.reduce((acc: any, job) => {
    const size = job.company_size || "Unknown";
    if (!acc[size]) {
      acc[size] = { total: 0, success: 0, interviews: 0 };
    }
    if (job.status !== "Interested") {
      acc[size].total++;
      if (successfulStatuses.includes(job.status)) acc[size].success++;
      if (interviewStatuses.includes(job.status)) acc[size].interviews++;
    }
    return acc;
  }, {});

  const companySizeData = Object.entries(companySizeStats)
    .map(([size, stats]: [string, any]) => ({
      size,
      total: stats.total,
      successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0,
      interviewRate: stats.total > 0 ? (stats.interviews / stats.total) * 100 : 0,
    }))
    .filter(d => d.total >= 2);

  // 3. Success rates by role type (job_type)
  const roleTypeStats = jobs.reduce((acc: any, job) => {
    const roleType = job.job_type || "Unknown";
    if (!acc[roleType]) {
      acc[roleType] = { total: 0, success: 0, interviews: 0 };
    }
    if (job.status !== "Interested") {
      acc[roleType].total++;
      if (successfulStatuses.includes(job.status)) acc[roleType].success++;
      if (interviewStatuses.includes(job.status)) acc[roleType].interviews++;
    }
    return acc;
  }, {});

  const roleTypeData = Object.entries(roleTypeStats)
    .map(([roleType, stats]: [string, any]) => ({
      roleType,
      total: stats.total,
      successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0,
      interviewRate: stats.total > 0 ? (stats.interviews / stats.total) * 100 : 0,
    }))
    .filter(d => d.total >= 2);

  // 4. Application source analysis (inferred from job_url)
  const sourceStats = jobs.reduce((acc: any, job) => {
    let source = "Direct Application";
    if (job.job_url) {
      if (job.job_url.includes("linkedin")) source = "LinkedIn";
      else if (job.job_url.includes("indeed")) source = "Indeed";
      else if (job.job_url.includes("glassdoor")) source = "Glassdoor";
      else if (job.job_url.includes("ziprecruiter")) source = "ZipRecruiter";
      else source = "Company Website";
    }
    if (!acc[source]) {
      acc[source] = { total: 0, success: 0, interviews: 0 };
    }
    if (job.status !== "Interested") {
      acc[source].total++;
      if (successfulStatuses.includes(job.status)) acc[source].success++;
      if (interviewStatuses.includes(job.status)) acc[source].interviews++;
    }
    return acc;
  }, {});

  const sourceData = Object.entries(sourceStats)
    .map(([source, stats]: [string, any]) => ({
      source,
      total: stats.total,
      successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0,
      interviewRate: stats.total > 0 ? (stats.interviews / stats.total) * 100 : 0,
    }))
    .filter(d => d.total >= 1);

  // 5. Patterns: Successful vs Rejected applications
  const successfulJobs = jobs.filter(j => successfulStatuses.includes(j.status));
  const rejectedJobs = jobs.filter(j => rejectedStatuses.includes(j.status));

  const patterns = {
    successful: {
      avgDescriptionLength: successfulJobs.length > 0
        ? successfulJobs.reduce((sum, j) => sum + (j.job_description?.length || 0), 0) / successfulJobs.length
        : 0,
      hasNotes: successfulJobs.filter(j => j.notes).length,
      hasSalary: successfulJobs.filter(j => j.salary_range_min || j.salary_range_max).length,
      hasLocation: successfulJobs.filter(j => j.location).length,
    },
    rejected: {
      avgDescriptionLength: rejectedJobs.length > 0
        ? rejectedJobs.reduce((sum, j) => sum + (j.job_description?.length || 0), 0) / rejectedJobs.length
        : 0,
      hasNotes: rejectedJobs.filter(j => j.notes).length,
      hasSalary: rejectedJobs.filter(j => j.salary_range_min || j.salary_range_max).length,
      hasLocation: rejectedJobs.filter(j => j.location).length,
    },
  };

  // 6. Application materials correlation
  const jobsWithCustomResume = packages.filter(p => p.resume_id).length;
  const jobsWithCustomCoverLetter = packages.filter(p => p.cover_letter_id).length;
  const customizedSuccessRate = packages.filter(p => 
    (p.resume_id || p.cover_letter_id) && 
    p.jobs && successfulStatuses.includes(p.jobs.status)
  ).length / (packages.filter(p => p.resume_id || p.cover_letter_id).length || 1) * 100;

  const nonCustomizedSuccessRate = packages.filter(p => 
    !p.resume_id && !p.cover_letter_id && 
    p.jobs && successfulStatuses.includes(p.jobs.status)
  ).length / (packages.filter(p => !p.resume_id && !p.cover_letter_id).length || 1) * 100;

  // 7. Timing analysis
  const timingData = jobs.reduce((acc: any, job) => {
    const date = new Date(job.created_at);
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    const hour = date.getHours();
    const hourRange = hour < 9 ? "Early Morning (6-9)" : 
                      hour < 12 ? "Morning (9-12)" :
                      hour < 14 ? "Lunch (12-14)" :
                      hour < 17 ? "Afternoon (14-17)" :
                      hour < 20 ? "Evening (17-20)" : "Night (20+)";
    
    if (!acc.days[dayOfWeek]) acc.days[dayOfWeek] = { total: 0, success: 0, interviews: 0 };
    if (!acc.hours[hourRange]) acc.hours[hourRange] = { total: 0, success: 0, interviews: 0 };
    
    if (job.status !== "Interested") {
      acc.days[dayOfWeek].total++;
      acc.hours[hourRange].total++;
      if (successfulStatuses.includes(job.status)) {
        acc.days[dayOfWeek].success++;
        acc.hours[hourRange].success++;
      }
      if (interviewStatuses.includes(job.status)) {
        acc.days[dayOfWeek].interviews++;
        acc.hours[hourRange].interviews++;
      }
    }
    return acc;
  }, { days: {}, hours: {} });

  const dayData = Object.entries(timingData.days)
    .map(([day, stats]: [string, any]) => ({
      day,
      total: stats.total,
      successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0,
      interviewRate: stats.total > 0 ? (stats.interviews / stats.total) * 100 : 0,
    }));

  const hourData = Object.entries(timingData.hours)
    .map(([hour, stats]: [string, any]) => ({
      hour,
      total: stats.total,
      successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0,
      interviewRate: stats.total > 0 ? (stats.interviews / stats.total) * 100 : 0,
    }));

  // Statistical significance for key findings
  const overallSuccessRate = totalApplications > 0 ? (successfulApplications / totalApplications) * 100 : 0;
  
  const significanceTests = industryData.map(ind => {
    const expected = ind.total * (overallSuccessRate / 100);
    const observed = ind.total * (ind.successRate / 100);
    const sig = calculateSignificance(observed, expected, ind.total);
    return { ...ind, ...sig };
  });

  // Generate AI recommendations
  const generateRecommendations = async () => {
    setIsGeneratingRecommendations(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-application-success", {
        body: {
          totalApplications,
          successfulApplications,
          interviewedApplications,
          rejectedApplications,
          industryData,
          companySizeData,
          roleTypeData,
          sourceData,
          patterns,
          timingData: { dayData, hourData },
          customizationImpact: {
            customizedSuccessRate,
            nonCustomizedSuccessRate,
            jobsWithCustomResume,
            jobsWithCustomCoverLetter,
          },
        },
      });

      if (error) throw error;
      setRecommendations(data);
      toast.success("Recommendations generated!");
    } catch (error: any) {
      toast.error("Failed to generate recommendations: " + error.message);
    } finally {
      setIsGeneratingRecommendations(false);
    }
  };

  const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  if (jobsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallSuccessRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {successfulApplications} of {totalApplications} applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Interview Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalApplications > 0 ? ((interviewedApplications / totalApplications) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {interviewedApplications} interviews from {totalApplications} apps
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Best Industry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {industryData[0]?.industry || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {industryData[0]?.successRate.toFixed(1) || 0}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Best Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {sourceData.sort((a, b) => b.interviewRate - a.interviewRate)[0]?.source || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {sourceData[0]?.interviewRate.toFixed(1) || 0}% interview rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis Tabs */}
      <Tabs defaultValue="breakdown" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="breakdown" className="gap-1">
            <PieChartIcon className="h-4 w-4" />
            Breakdown
          </TabsTrigger>
          <TabsTrigger value="patterns" className="gap-1">
            <Activity className="h-4 w-4" />
            Patterns
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-1">
            <FileText className="h-4 w-4" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="timing" className="gap-1">
            <Clock className="h-4 w-4" />
            Timing
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-1">
            <Lightbulb className="h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Industry Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Success by Industry
                </CardTitle>
                <CardDescription>
                  Success and interview rates across industries
                </CardDescription>
              </CardHeader>
              <CardContent>
                {industryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={industryData.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="industry" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      <Legend />
                      <Bar dataKey="interviewRate" name="Interview %" fill="hsl(var(--primary))" />
                      <Bar dataKey="successRate" name="Success %" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Add more applications with industry data
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Company Size Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Success by Company Size
                </CardTitle>
                <CardDescription>
                  Performance across different company sizes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {companySizeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={companySizeData}
                        dataKey="total"
                        nameKey="size"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ size, successRate }) => `${size}: ${successRate.toFixed(0)}%`}
                      >
                        {companySizeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string, props: any) => [
                        `${props.payload.successRate.toFixed(1)}% success`,
                        props.payload.size
                      ]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Add company size data to jobs
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Role Type Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Success by Role Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                {roleTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={roleTypeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="roleType" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      <Legend />
                      <Bar dataKey="interviewRate" name="Interview %" fill="hsl(var(--primary))" />
                      <Bar dataKey="successRate" name="Success %" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Add job type data to applications
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Source Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Success by Application Source
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sourceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={sourceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      <Legend />
                      <Bar dataKey="interviewRate" name="Interview %" fill="hsl(var(--primary))" />
                      <Bar dataKey="successRate" name="Success %" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Add source data to applications
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Statistical Significance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Statistical Significance
              </CardTitle>
              <CardDescription>
                Industries with statistically significant success rates (p &lt; 0.05)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {significanceTests.filter(t => t.total >= 3).map((test, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{test.industry}</span>
                      <Badge variant={test.significant ? "default" : "secondary"}>
                        {test.successRate.toFixed(1)}% success
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">p = {test.pValue.toFixed(3)}</span>
                      {test.significant ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Significant
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <Info className="h-3 w-3 mr-1" />
                          Not Significant
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {significanceTests.filter(t => t.total >= 3).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Need more data per industry for statistical significance testing
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          {/* Explanation banner */}
          {(successfulJobs.length < 3 || rejectedJobs.length < 3) && (
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Limited Pattern Data
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      This analysis compares characteristics of jobs with offers ({successfulJobs.length}) vs rejections ({rejectedJobs.length}). 
                      More applications will reveal stronger patterns. Current data shows average job description length and how often you fill in notes, salary, and location fields.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Successful Application Patterns
                </CardTitle>
                <CardDescription>
                  Analysis of {successfulJobs.length} job{successfulJobs.length !== 1 ? 's' : ''} that resulted in offers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg Description Length</span>
                    <Badge variant="outline">{Math.round(patterns.successful.avgDescriptionLength)} chars</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">With Personal Notes</span>
                    <Badge variant="outline">{patterns.successful.hasNotes} / {successfulJobs.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">With Salary Info</span>
                    <Badge variant="outline">{patterns.successful.hasSalary} / {successfulJobs.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">With Location Info</span>
                    <Badge variant="outline">{patterns.successful.hasLocation} / {successfulJobs.length}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Rejected Application Patterns
                </CardTitle>
                <CardDescription>
                  Analysis of {rejectedJobs.length} rejected application{rejectedJobs.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg Description Length</span>
                    <Badge variant="outline">{Math.round(patterns.rejected.avgDescriptionLength)} chars</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">With Personal Notes</span>
                    <Badge variant="outline">{patterns.rejected.hasNotes} / {rejectedJobs.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">With Salary Info</span>
                    <Badge variant="outline">{patterns.rejected.hasSalary} / {rejectedJobs.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">With Location Info</span>
                    <Badge variant="outline">{patterns.rejected.hasLocation} / {rejectedJobs.length}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pattern Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Pattern Comparison: Success vs Rejection</CardTitle>
              <CardDescription>
                Radar chart showing data completeness differences between successful and rejected applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={[
                  {
                    metric: "Notes Added",
                    successful: successfulJobs.length > 0 ? (patterns.successful.hasNotes / successfulJobs.length) * 100 : 0,
                    rejected: rejectedJobs.length > 0 ? (patterns.rejected.hasNotes / rejectedJobs.length) * 100 : 0,
                  },
                  {
                    metric: "Salary Known",
                    successful: successfulJobs.length > 0 ? (patterns.successful.hasSalary / successfulJobs.length) * 100 : 0,
                    rejected: rejectedJobs.length > 0 ? (patterns.rejected.hasSalary / rejectedJobs.length) * 100 : 0,
                  },
                  {
                    metric: "Location Set",
                    successful: successfulJobs.length > 0 ? (patterns.successful.hasLocation / successfulJobs.length) * 100 : 0,
                    rejected: rejectedJobs.length > 0 ? (patterns.rejected.hasLocation / rejectedJobs.length) * 100 : 0,
                  },
                  {
                    metric: "Description Detail",
                    successful: Math.min((patterns.successful.avgDescriptionLength / 2000) * 100, 100),
                    rejected: Math.min((patterns.rejected.avgDescriptionLength / 2000) * 100, 100),
                  },
                ]}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar name="Successful" dataKey="successful" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.5} />
                  <Radar name="Rejected" dataKey="rejected" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.3} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
              
              {/* Pattern Insights */}
              <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  What This Means
                </h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {patterns.successful.avgDescriptionLength > patterns.rejected.avgDescriptionLength + 50 ? (
                    <p>✓ Successful applications have {Math.round(patterns.successful.avgDescriptionLength - patterns.rejected.avgDescriptionLength)} more characters in job descriptions on average - researching roles thoroughly may correlate with success.</p>
                  ) : patterns.rejected.avgDescriptionLength > patterns.successful.avgDescriptionLength + 50 ? (
                    <p>⚠ Rejected applications have longer descriptions. This might indicate over-analysis of unsuitable roles.</p>
                  ) : (
                    <p>→ Description lengths are similar between successful and rejected applications ({Math.round(patterns.successful.avgDescriptionLength)} vs {Math.round(patterns.rejected.avgDescriptionLength)} chars).</p>
                  )}
                  
                  {successfulJobs.length > 0 && rejectedJobs.length > 0 ? (
                    <>
                      <p>• Personal notes added: {patterns.successful.hasNotes} of {successfulJobs.length} successful vs {patterns.rejected.hasNotes} of {rejectedJobs.length} rejected</p>
                      <p>• Salary info tracked: {patterns.successful.hasSalary} of {successfulJobs.length} successful vs {patterns.rejected.hasSalary} of {rejectedJobs.length} rejected</p>
                      <p>• Location specified: {patterns.successful.hasLocation} of {successfulJobs.length} successful vs {patterns.rejected.hasLocation} of {rejectedJobs.length} rejected</p>
                    </>
                  ) : (
                    <p className="text-xs">Complete more applications with different statuses to see detailed patterns.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Customization Impact</CardTitle>
                <CardDescription>
                  Success rates with vs without customized materials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">With Custom Materials</span>
                      <span className="text-sm">{customizedSuccessRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={customizedSuccessRate} className="h-3" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Without Custom Materials</span>
                      <span className="text-sm">{nonCustomizedSuccessRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={nonCustomizedSuccessRate} className="h-3" />
                  </div>
                  
                  {customizedSuccessRate > nonCustomizedSuccessRate && (
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          +{(customizedSuccessRate - nonCustomizedSuccessRate).toFixed(1)}% improvement with customization
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Material Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Custom Resumes Used</span>
                    </div>
                    <Badge>{jobsWithCustomResume}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Custom Cover Letters Used</span>
                    </div>
                    <Badge>{jobsWithCustomCoverLetter}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Total Application Packages</span>
                    </div>
                    <Badge>{packages.length}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cover Letter Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Cover Letter Performance Tracking</CardTitle>
              <CardDescription>
                Response rates and effectiveness by cover letter style
              </CardDescription>
            </CardHeader>
            <CardContent>
              {coverLetterPerformance.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <div className="text-2xl font-bold">
                        {((coverLetterPerformance.filter(c => c.response_received).length / coverLetterPerformance.length) * 100).toFixed(0)}%
                      </div>
                      <p className="text-sm text-muted-foreground">Response Rate</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <div className="text-2xl font-bold">
                        {coverLetterPerformance.reduce((sum, c) => sum + (c.effectiveness_score || 0), 0) / coverLetterPerformance.length || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Avg Effectiveness Score</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <div className="text-2xl font-bold">
                        {Math.round(coverLetterPerformance.reduce((sum, c) => sum + (c.time_to_response_hours || 0), 0) / coverLetterPerformance.filter(c => c.time_to_response_hours).length / 24) || "N/A"}
                      </div>
                      <p className="text-sm text-muted-foreground">Avg Days to Response</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Track cover letter performance to see insights here
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timing Tab */}
        <TabsContent value="timing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Success by Day of Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dayData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dayData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      <Legend />
                      <Bar dataKey="interviewRate" name="Interview %" fill="hsl(var(--primary))" />
                      <Bar dataKey="successRate" name="Success %" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Not enough data</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Success by Time of Day
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hourData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hourData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      <Legend />
                      <Bar dataKey="interviewRate" name="Interview %" fill="hsl(var(--primary))" />
                      <Bar dataKey="successRate" name="Success %" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Not enough data</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Optimal Timing Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Optimal Application Timing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Best Day to Apply</h4>
                  <div className="text-2xl font-bold text-primary">
                    {dayData.sort((a, b) => b.interviewRate - a.interviewRate)[0]?.day || "N/A"}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {dayData.sort((a, b) => b.interviewRate - a.interviewRate)[0]?.interviewRate.toFixed(1) || 0}% interview rate
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Best Time to Apply</h4>
                  <div className="text-2xl font-bold text-primary">
                    {hourData.sort((a, b) => b.interviewRate - a.interviewRate)[0]?.hour || "N/A"}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {hourData.sort((a, b) => b.interviewRate - a.interviewRate)[0]?.interviewRate.toFixed(1) || 0}% interview rate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI-Powered Recommendations
              </CardTitle>
              <CardDescription>
                Personalized insights based on your application data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!recommendations ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Generate personalized recommendations based on your application patterns
                  </p>
                  <Button onClick={generateRecommendations} disabled={isGeneratingRecommendations}>
                    {isGeneratingRecommendations ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Recommendations
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Key Findings */}
                  {recommendations.keyFindings && (
                    <div>
                      <h4 className="font-medium mb-3">Key Findings</h4>
                      <ul className="space-y-2">
                        {recommendations.keyFindings.map((finding: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                            {finding}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {recommendations.recommendations && (
                    <div>
                      <h4 className="font-medium mb-3">Recommendations</h4>
                      <div className="space-y-3">
                        {recommendations.recommendations.map((rec: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "default" : "secondary"}>
                                {rec.priority}
                              </Badge>
                              <span className="font-medium text-sm">{rec.title}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{rec.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Focus Areas */}
                  {recommendations.focusAreas && (
                    <div>
                      <h4 className="font-medium mb-3">Focus Areas</h4>
                      <div className="flex flex-wrap gap-2">
                        {recommendations.focusAreas.map((area: string, i: number) => (
                          <Badge key={i} variant="outline">{area}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button variant="outline" onClick={() => setRecommendations(null)} className="mt-4">
                    Regenerate Recommendations
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
