import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, Activity, Calendar, Target, Zap, Briefcase } from "lucide-react";
import { format, subDays, differenceInDays } from "date-fns";

export function MenteeEngagementMonitor({ menteeId }: { menteeId: string }) {
  const [showJobsDialog, setShowJobsDialog] = useState(false);
  const [showInterviewsDialog, setShowInterviewsDialog] = useState(false);
  
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const { data: engagementData, isLoading } = useQuery({
    queryKey: ['mentee-engagement', menteeId],
    queryFn: async () => {
      // Get activity data for the last 30 days
      const [jobs, interviews, timeTracking, materials, goals] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, job_title, company_name, status, created_at, updated_at')
          .eq('user_id', menteeId)
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('interviews')
          .select('id, interview_type, interview_date, status, job_id, created_at, updated_at')
          .eq('user_id', menteeId)
          .gte('created_at', thirtyDaysAgo)
          .order('interview_date', { ascending: false }),
        
        supabase
          .from('time_tracking_entries')
          .select('id, duration_minutes, created_at')
          .eq('user_id', menteeId)
          .gte('created_at', thirtyDaysAgo),
        
        supabase
          .from('application_materials')
          .select('id, created_at, updated_at')
          .eq('user_id', menteeId)
          .gte('created_at', thirtyDaysAgo),
        
        supabase
          .from('career_goals')
          .select('id, created_at, updated_at, progress_percentage')
          .eq('user_id', menteeId)
      ]);

      // Fetch job details for interviews
      const interviewJobIds = interviews.data?.map(i => i.job_id).filter(Boolean) || [];
      let jobsForInterviews: any[] = [];
      if (interviewJobIds.length > 0) {
        const { data: jobData } = await supabase
          .from('jobs')
          .select('id, job_title, company_name')
          .in('id', interviewJobIds);
        jobsForInterviews = jobData || [];
      }

      // Calculate engagement metrics
      const jobsAdded = jobs.data?.length || 0;
      const interviewsScheduled = interviews.data?.length || 0;
      const totalTimeTracked = timeTracking.data?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0;
      const materialsUpdated = materials.data?.length || 0;
      
      // Calculate activity frequency (days with activity)
      const allActivities = [
        ...(jobs.data?.map(j => j.created_at) || []),
        ...(interviews.data?.map(i => i.created_at) || []),
        ...(timeTracking.data?.map(t => t.created_at) || []),
        ...(materials.data?.map(m => m.created_at) || []),
      ];
      
      const uniqueDaysWithActivity = new Set(
        allActivities.map(date => format(new Date(date), 'yyyy-MM-dd'))
      ).size;
      
      const activityFrequency = Math.round((uniqueDaysWithActivity / 30) * 100);

      // Calculate goal progress momentum
      const activeGoals = goals.data?.filter(g => g.progress_percentage !== null && g.progress_percentage < 100) || [];
      const avgGoalProgress = activeGoals.length > 0 
        ? Math.round(activeGoals.reduce((sum, g) => sum + (g.progress_percentage || 0), 0) / activeGoals.length)
        : 0;

      // Get last login/activity date
      const lastActivity = allActivities.length > 0 
        ? new Date(Math.max(...allActivities.map(d => new Date(d).getTime())))
        : null;
      
      const daysSinceLastActivity = lastActivity ? differenceInDays(new Date(), lastActivity) : 30;

      // Calculate overall engagement score (0-100)
      const engagementScore = Math.round(
        (activityFrequency * 0.4) + // 40% weight on frequency
        (Math.min(jobsAdded * 5, 20)) + // 20% weight on job additions (up to 4 jobs)
        (Math.min(totalTimeTracked / 60, 20)) + // 20% weight on time tracking (up to 60 mins/day avg)
        (Math.min(materialsUpdated * 10, 20)) // 20% weight on materials updates (up to 2 materials)
      );

      // Enrich interviews with job info
      const enrichedInterviews = interviews.data?.map(interview => {
        const job = jobsForInterviews.find(j => j.id === interview.job_id);
        return {
          ...interview,
          jobTitle: job?.job_title || 'Unknown Position',
          company: job?.company_name || 'Unknown Company'
        };
      }) || [];

      return {
        engagementScore,
        activityFrequency,
        jobsAdded,
        interviewsScheduled,
        totalTimeTracked,
        materialsUpdated,
        activeGoals: activeGoals.length,
        avgGoalProgress,
        lastActivity,
        daysSinceLastActivity,
        trend: engagementScore > 60 ? 'high' : engagementScore > 30 ? 'medium' : 'low',
        jobsList: jobs.data || [],
        interviewsList: enrichedInterviews
      };
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Loading engagement data...
        </CardContent>
      </Card>
    );
  }

  if (!engagementData) {
    return null;
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'high':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'low':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'high':
        return 'text-green-500';
      case 'low':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Offer':
      case 'completed':
        return 'default';
      case 'Interview':
      case 'scheduled':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Engagement Overview
            </span>
            <Badge variant={engagementData.trend === 'high' ? 'default' : engagementData.trend === 'low' ? 'destructive' : 'secondary'}>
              {engagementData.trend.toUpperCase()} ENGAGEMENT
            </Badge>
          </CardTitle>
          <CardDescription>
            Last 30 days of activity • {engagementData.daysSinceLastActivity === 0 ? 'Active today' : 
              `Last active ${engagementData.daysSinceLastActivity} day${engagementData.daysSinceLastActivity > 1 ? 's' : ''} ago`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Engagement Score */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Engagement Score</span>
              <div className="flex items-center gap-2">
                {getTrendIcon(engagementData.trend)}
                <span className={`text-2xl font-bold ${getTrendColor(engagementData.trend)}`}>
                  {engagementData.engagementScore}%
                </span>
              </div>
            </div>
            <Progress value={engagementData.engagementScore} className="h-2" />
          </div>

          {/* Activity Frequency */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Activity Frequency
              </span>
              <span className="text-lg font-semibold">{engagementData.activityFrequency}%</span>
            </div>
            <Progress value={engagementData.activityFrequency} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Active on {Math.round((engagementData.activityFrequency / 100) * 30)} of last 30 days
            </p>
          </div>

          {/* Key Activity Metrics */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setShowJobsDialog(true)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Job Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{engagementData.jobsAdded}</div>
                <p className="text-xs text-muted-foreground">New jobs tracked</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setShowInterviewsDialog(true)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Interviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{engagementData.interviewsScheduled}</div>
                <p className="text-xs text-muted-foreground">Scheduled or completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Time Invested
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(engagementData.totalTimeTracked / 60)}h
                </div>
                <p className="text-xs text-muted-foreground">
                  ~{Math.round(engagementData.totalTimeTracked / 30)} min/day avg
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Goal Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{engagementData.avgGoalProgress}%</div>
                <p className="text-xs text-muted-foreground">
                  {engagementData.activeGoals} active goal{engagementData.activeGoals !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Materials Updates */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Resume/Cover Letter Updates</span>
            <Badge variant="outline">{engagementData.materialsUpdated} update{engagementData.materialsUpdated !== 1 ? 's' : ''}</Badge>
          </div>

          {/* Engagement Insights */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm font-medium mb-2">Coaching Insight</p>
            <p className="text-sm text-muted-foreground">
              {engagementData.trend === 'high' 
                ? "Excellent engagement! Your mentee is actively working on their job search and making consistent progress."
                : engagementData.trend === 'medium'
                ? "Moderate engagement. Consider checking in to see if your mentee needs additional support or motivation."
                : engagementData.daysSinceLastActivity > 7
                ? `Low engagement. Your mentee hasn't been active in ${engagementData.daysSinceLastActivity} days. A check-in call might help identify any blockers.`
                : "Low engagement detected. Consider scheduling a coaching session to re-energize your mentee's job search momentum."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Dialog */}
      <Dialog open={showJobsDialog} onOpenChange={setShowJobsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Mentee's Job Applications
            </DialogTitle>
            <DialogDescription>
              Jobs tracked in the last 30 days
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {engagementData.jobsList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No job applications in the last 30 days
              </p>
            ) : (
              <div className="space-y-3 pr-4">
                {engagementData.jobsList.map((job: any) => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{job.job_title}</p>
                      <p className="text-sm text-muted-foreground">{job.company_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Added {format(new Date(job.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(job.status)}>
                      {job.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Interviews Dialog */}
      <Dialog open={showInterviewsDialog} onOpenChange={setShowInterviewsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Mentee's Interviews
            </DialogTitle>
            <DialogDescription>
              Interviews scheduled or completed in the last 30 days
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {engagementData.interviewsList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No interviews in the last 30 days
              </p>
            ) : (
              <div className="space-y-3 pr-4">
                {engagementData.interviewsList.map((interview: any) => (
                  <div key={interview.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{interview.jobTitle}</p>
                      <p className="text-sm text-muted-foreground">{interview.company}</p>
                      <p className="text-xs text-muted-foreground">
                        {interview.interview_type} • {format(new Date(interview.interview_date), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(interview.status)}>
                      {interview.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}