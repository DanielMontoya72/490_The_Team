import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { TrendingUp, Briefcase, Calendar, Target, Copy, Share2 } from "lucide-react";
import { format, subDays } from "date-fns";

export function FamilyProgressSummary() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ['family-progress-stats'],
    queryFn: async () => {
      // Get jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('status, created_at')
        .eq('user_id', user?.id);

      // Get interviews
      const { data: interviews } = await supabase
        .from('interviews')
        .select('interview_date, outcome')
        .eq('user_id', user?.id);

      // Get goals
      const { data: goals } = await supabase
        .from('career_goals')
        .select('status, progress_percentage')
        .eq('user_id', user?.id);

      // Get milestones
      const { data: milestones } = await supabase
        .from('family_milestones')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_public_to_supporters', true)
        .order('achieved_at', { ascending: false })
        .limit(5);

      // Calculate stats
      const thisWeekStart = subDays(new Date(), 7);
      const applicationsThisWeek = jobs?.filter(j => 
        new Date(j.created_at) >= thisWeekStart
      ).length || 0;

      const statusCounts = jobs?.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const upcomingInterviews = interviews?.filter(i => 
        i.interview_date && new Date(i.interview_date) >= new Date()
      ).length || 0;

      const completedInterviews = interviews?.filter(i => 
        i.interview_date && new Date(i.interview_date) < new Date()
      ).length || 0;

      const activeGoals = goals?.filter(g => 
        g.status === 'active' || g.status === 'in_progress'
      ).length || 0;

      const avgGoalProgress = goals?.length 
        ? Math.round(goals.reduce((sum, g) => sum + (g.progress_percentage || 0), 0) / goals.length)
        : 0;

      return {
        totalApplications: jobs?.length || 0,
        applicationsThisWeek,
        statusCounts,
        upcomingInterviews,
        completedInterviews,
        activeGoals,
        avgGoalProgress,
        recentMilestones: milestones || [],
      };
    },
    enabled: !!user?.id,
  });

  const generateFamilySummary = () => {
    if (!stats) return "";

    const summary = `📊 Job Search Progress Update

Hi family! Here's a quick update on my job search:

🎯 Applications
• Total Applications: ${stats.totalApplications}
• This Week: ${stats.applicationsThisWeek}
• In Interview Stage: ${stats.statusCounts['interview'] || 0}

📅 Interviews
• Upcoming: ${stats.upcomingInterviews}
• Completed: ${stats.completedInterviews}

🏆 Goals
• Active Goals: ${stats.activeGoals}
• Average Progress: ${stats.avgGoalProgress}%

${stats.recentMilestones.length > 0 ? `🎉 Recent Wins:
${stats.recentMilestones.map(m => `• ${m.milestone_title}`).join('\n')}` : ''}

I'm staying focused and positive. Your support means everything! 💙

Generated ${format(new Date(), 'MMM dd, yyyy')}`;

    return summary;
  };

  const copyToClipboard = () => {
    const summary = generateFamilySummary();
    navigator.clipboard.writeText(summary);
    toast.success("Summary copied to clipboard!", {
      description: "You can now paste this to share with family via text, email, or social media.",
    });
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Family-Friendly Progress Summary
              </CardTitle>
              <CardDescription>
                A shareable overview without sensitive details like company names or salaries
              </CardDescription>
            </div>
            <Button onClick={copyToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Summary
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Applications</p>
                    <p className="text-2xl font-bold">{stats?.totalApplications || 0}</p>
                    <p className="text-xs text-muted-foreground">
                      +{stats?.applicationsThisWeek || 0} this week
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <Calendar className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Interviews</p>
                    <p className="text-2xl font-bold">{stats?.upcomingInterviews || 0}</p>
                    <p className="text-xs text-muted-foreground">
                      {stats?.completedInterviews || 0} completed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-purple-500/10">
                    <Target className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Goals</p>
                    <p className="text-2xl font-bold">{stats?.activeGoals || 0}</p>
                    <p className="text-xs text-muted-foreground">
                      {stats?.avgGoalProgress || 0}% avg progress
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-yellow-500/10">
                    <Share2 className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-bold">{stats?.statusCounts?.['interview'] || 0}</p>
                    <p className="text-xs text-muted-foreground">
                      active opportunities
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview of the shareable summary */}
          <div className="bg-muted rounded-lg p-4">
            <h4 className="font-medium mb-3">Preview (what supporters will see):</h4>
            <pre className="whitespace-pre-wrap text-sm font-mono bg-background rounded p-4 border">
              {generateFamilySummary()}
            </pre>
          </div>
        </CardContent>
      </Card>

      {stats?.recentMilestones && stats.recentMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🎉 Recent Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentMilestones.map((milestone) => (
                <div key={milestone.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <p className="font-medium">{milestone.milestone_title}</p>
                    {milestone.celebration_message && (
                      <p className="text-sm text-muted-foreground italic">
                        "{milestone.celebration_message}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-2">💡 Privacy Protection Active</h4>
          <p className="text-sm text-muted-foreground">
            This summary automatically hides sensitive information like specific company names, 
            job titles, and salary details. Your supporters see encouraging numbers and milestones 
            without confidential details.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
