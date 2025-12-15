import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Target, Download, Users, Clock, Award, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface Analytics {
  totalApplications: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  avgTimeToResponse: number;
  avgTimeToInterview: number;
  avgTimeToOffer: number;
  topPerformingIndustries: Array<{ industry: string; successRate: number; count: number }>;
  topPerformingJobTypes: Array<{ jobType: string; successRate: number; count: number }>;
  applicationTrend: Array<{ month: string; count: number }>;
  funnelData: Array<{ stage: string; count: number; percentage: number }>;
}

export function ApplicationAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all jobs
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false);

      if (jobsError) throw jobsError;

      // Fetch interviews
      const { data: interviews, error: interviewsError } = await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', user.id);

      if (interviewsError) throw interviewsError;

      // Calculate analytics
      const totalApplications = jobs?.filter(j => j.status !== 'Interested').length || 0;
      const appliedJobs = jobs?.filter(j => j.status !== 'Interested') || [];
      const progressedJobs = jobs?.filter(j =>
        [
          'Interview',
          'Interview Scheduled',
          'Phone Screen',
          'Offer Received',
          'Accepted',
          'Rejected',
        ].includes(j.status)
      ) || [];
      const interviewedCount = interviews?.length || 0;
      const offeredJobs = jobs?.filter(j => ['Offer Received', 'Accepted'].includes(j.status)) || [];

      const responseRate = totalApplications > 0 ? (progressedJobs.length / totalApplications) * 100 : 0;
      const interviewRate = totalApplications > 0 ? (interviewedCount / totalApplications) * 100 : 0;
      const offerRate = interviewedCount > 0 ? (offeredJobs.length / interviewedCount) * 100 : 0;

      // Calculate average times from job_status_history
      let statusHistory: any[] = [];
      try {
        // @ts-ignore - Supabase type inference issue
        const result = await supabase
          .from('job_status_history')
          .select('*')
          .eq('user_id', user.id)
          .order('changed_at', { ascending: true });
        statusHistory = result.data || [];
      } catch (e) {
        console.error('Error fetching status history:', e);
      }

      // Calculate time to response (Applied → any non-Interested status)
      let totalResponseTime = 0;
      let responseCount = 0;
      const jobResponseTimes = new Map<string, { applied?: string; response?: string }>();
      
      statusHistory?.forEach((record: any) => {
        if (!jobResponseTimes.has(record.job_id)) {
          if (record.from_status === 'Applied' && record.to_status !== 'Interested') {
            jobResponseTimes.set(record.job_id, { applied: record.changed_at });
          }
        } else {
          const times = jobResponseTimes.get(record.job_id);
          if (times && times.applied && !times.response && record.to_status !== 'Interested' && record.to_status !== 'Applied') {
            times.response = record.changed_at;
            const days = Math.ceil((new Date(times.response).getTime() - new Date(times.applied).getTime()) / (1000 * 60 * 60 * 24));
            totalResponseTime += days;
            responseCount++;
          }
        }
      });

      // Calculate time to interview (Applied → Interview scheduled)
      let totalInterviewTime = 0;
      let interviewTimeCount = 0;
      const jobInterviewTimes = new Map<string, { applied?: string; interview?: string }>();
      
      statusHistory?.forEach((record: any) => {
        if (!jobInterviewTimes.has(record.job_id)) {
          if (record.from_status === 'Applied') {
            jobInterviewTimes.set(record.job_id, { applied: record.changed_at });
          }
        } else {
          const times = jobInterviewTimes.get(record.job_id);
          if (times && times.applied && !times.interview && ['Interview', 'Phone Screen', 'Interview Scheduled'].includes(record.to_status)) {
            times.interview = record.changed_at;
            const days = Math.ceil((new Date(times.interview).getTime() - new Date(times.applied).getTime()) / (1000 * 60 * 60 * 24));
            totalInterviewTime += days;
            interviewTimeCount++;
          }
        }
      });

      // Calculate time to offer (Applied → Offer Received)
      let totalOfferTime = 0;
      let offerTimeCount = 0;
      const jobOfferTimes = new Map<string, { applied?: string; offer?: string }>();
      
      statusHistory?.forEach((record: any) => {
        if (!jobOfferTimes.has(record.job_id)) {
          if (record.from_status === 'Applied') {
            jobOfferTimes.set(record.job_id, { applied: record.changed_at });
          }
        } else {
          const times = jobOfferTimes.get(record.job_id);
          if (times && times.applied && !times.offer && ['Offer Received', 'Accepted'].includes(record.to_status)) {
            times.offer = record.changed_at;
            const days = Math.ceil((new Date(times.offer).getTime() - new Date(times.applied).getTime()) / (1000 * 60 * 60 * 24));
            totalOfferTime += days;
            offerTimeCount++;
          }
        }
      });

      const avgTimeToResponse = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0;
      const avgTimeToInterview = interviewTimeCount > 0 ? Math.round(totalInterviewTime / interviewTimeCount) : 0;
      const avgTimeToOffer = offerTimeCount > 0 ? Math.round(totalOfferTime / offerTimeCount) : 0;

      // Industry performance
      const industryMap = new Map<string, { success: number; total: number }>();
      jobs?.forEach(job => {
        if (job.industry) {
          const current = industryMap.get(job.industry) || { success: 0, total: 0 };
          current.total++;
          if (['Interview', 'Offer Received', 'Accepted'].includes(job.status)) {
            current.success++;
          }
          industryMap.set(job.industry, current);
        }
      });

      const topPerformingIndustries = Array.from(industryMap.entries())
        .map(([industry, data]) => ({
          industry,
          successRate: (data.success / data.total) * 100,
          count: data.total
        }))
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 5);

      // Job type performance
      const jobTypeMap = new Map<string, { success: number; total: number }>();
      jobs?.forEach(job => {
        if (job.job_type) {
          const current = jobTypeMap.get(job.job_type) || { success: 0, total: 0 };
          current.total++;
          if (['Interview', 'Offer Received', 'Accepted'].includes(job.status)) {
            current.success++;
          }
          jobTypeMap.set(job.job_type, current);
        }
      });

      const topPerformingJobTypes = Array.from(jobTypeMap.entries())
        .map(([jobType, data]) => ({
          jobType,
          successRate: (data.success / data.total) * 100,
          count: data.total
        }))
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 5);

      // Monthly trend
      const monthMap = new Map<string, number>();
      jobs?.forEach(job => {
        const month = new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        monthMap.set(month, (monthMap.get(month) || 0) + 1);
      });

      const applicationTrend = Array.from(monthMap.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
        .slice(-6);

      // Funnel data
      const funnelData = [
        { stage: 'Total Applications', count: totalApplications, percentage: 100 },
        { stage: 'Progressed', count: progressedJobs.length, percentage: responseRate },
        { stage: 'Interview', count: interviewedCount, percentage: interviewRate },
        { stage: 'Offer', count: offeredJobs.length, percentage: offerRate },
      ];

      setAnalytics({
        totalApplications,
        responseRate,
        interviewRate,
        offerRate,
        avgTimeToResponse,
        avgTimeToInterview,
        avgTimeToOffer,
        topPerformingIndustries,
        topPerformingJobTypes,
        applicationTrend,
        funnelData
      });
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!analytics) return;

    const report = `Application Analytics Report
Generated: ${new Date().toLocaleDateString()}

Key Metrics:
- Total Applications: ${analytics.totalApplications}
- Response Rate: ${analytics.responseRate.toFixed(1)}%
- Interview Rate: ${analytics.interviewRate.toFixed(1)}%
- Offer Rate: ${analytics.offerRate.toFixed(1)}%

Average Times:
- Time to Response: ${analytics.avgTimeToResponse} days
- Time to Interview: ${analytics.avgTimeToInterview} days
- Time to Offer: ${analytics.avgTimeToOffer} days

Top Performing Industries:
${analytics.topPerformingIndustries.map(i => `- ${i.industry}: ${i.successRate.toFixed(1)}% (${i.count} applications)`).join('\n')}

Top Performing Job Types:
${analytics.topPerformingJobTypes.map(j => `- ${j.jobType}: ${j.successRate.toFixed(1)}% (${j.count} applications)`).join('\n')}
`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `application-analytics-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported successfully");
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="text-center py-8">No analytics data available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Application Analytics</h2>
          <p className="text-muted-foreground">Insights and performance metrics</p>
        </div>
        <Button onClick={exportReport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalApplications}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.responseRate.toFixed(1)}%</div>
            <Progress value={analytics.responseRate} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interview Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.interviewRate.toFixed(1)}%</div>
            <Progress value={analytics.interviewRate} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offer Rate</CardTitle>
            <Award className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.offerRate.toFixed(1)}%</div>
            <Progress value={analytics.offerRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {/* Application Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Application Funnel</CardTitle>
            <CardDescription>Conversion rates through your application pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.funnelData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip 
                  cursor={false}
                  animationDuration={200}
                  animationEasing="ease-out"
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    padding: '8px'
                  }} 
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {analytics.funnelData.map((stage, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{stage.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{stage.count}</span>
                    <Badge variant="outline">{stage.percentage.toFixed(1)}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Avg. Time to Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {analytics.avgTimeToResponse > 0 ? `${analytics.avgTimeToResponse} days` : 'N/A'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Avg. Time to Interview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {analytics.avgTimeToInterview > 0 ? `${analytics.avgTimeToInterview} days` : 'N/A'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Avg. Time to Offer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {analytics.avgTimeToOffer > 0 ? `${analytics.avgTimeToOffer} days` : 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Application Volume Trend</CardTitle>
            <CardDescription>Monthly application activity</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.applicationTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  cursor={false}
                  animationDuration={200}
                  animationEasing="ease-out"
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    padding: '8px'
                  }} 
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Industries</CardTitle>
              <CardDescription>Success rates by industry</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topPerformingIndustries.map((industry, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{industry.industry}</span>
                      <span className="text-sm text-muted-foreground">
                        {industry.successRate.toFixed(1)}% ({industry.count} apps)
                      </span>
                    </div>
                    <Progress value={industry.successRate} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Performing Job Types</CardTitle>
              <CardDescription>Success rates by job type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topPerformingJobTypes.map((jobType, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{jobType.jobType}</span>
                      <span className="text-sm text-muted-foreground">
                        {jobType.successRate.toFixed(1)}% ({jobType.count} apps)
                      </span>
                    </div>
                    <Progress value={jobType.successRate} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Optimization Recommendations</CardTitle>
            <CardDescription>Data-driven suggestions to improve your success rate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.interviewRate < 20 && (
              <div className="flex gap-3 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <TrendingDown className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">Low Interview Rate</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Consider tailoring your resume and cover letters more specifically to each role. Focus on industries where you've had success.
                  </p>
                </div>
              </div>
            )}

            {analytics.responseRate > 50 && analytics.interviewRate > 30 && (
              <div className="flex gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-green-900 dark:text-green-100">Great Performance!</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Your application strategy is working well. Keep focusing on {analytics.topPerformingIndustries[0]?.industry} roles.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <Target className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-blue-900 dark:text-blue-100">Suggested Focus Areas</p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
                  <li>Apply to more {analytics.topPerformingJobTypes[0]?.jobType} positions</li>
                  <li>Network with professionals in {analytics.topPerformingIndustries[0]?.industry}</li>
                  <li>Set up job alerts for your top-performing industries</li>
                  <li>Follow up on applications after 1 week if no response</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
