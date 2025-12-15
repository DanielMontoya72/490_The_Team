import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Target, Calendar, TrendingUp } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface TeamDashboardTabProps {
  teamId: string;
}

interface MemberProgress {
  userId: string;
  userName: string;
  activeApplications: number;
  upcomingInterviews: number;
  activeGoals: number;
  avgGoalProgress: number;
}

export const TeamDashboardTab = ({ teamId }: TeamDashboardTabProps) => {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['team-dashboard', teamId],
    queryFn: async () => {
      console.log("Fetching team dashboard data for team:", teamId);
      
      // Get team members first
      const { data: teamMembersData, error: membersError } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", teamId);

      if (membersError) {
        console.error("Error fetching team members:", membersError);
        throw membersError;
      }

      if (!teamMembersData || teamMembersData.length === 0) {
        console.log("No team members found for team:", teamId);
        return { memberProgress: [], aggregateStats: { totalApplications: 0, totalInterviews: 0, totalGoals: 0, avgProgress: 0 } };
      }

      // Get user profiles separately
      const userIds = teamMembersData.map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("user_profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      // Create a map of profiles
      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );

      const progressData: MemberProgress[] = [];
      let totalApps = 0;
      let totalInts = 0;
      let totalGoals = 0;
      let totalProgress = 0;

      // Fetch all data in parallel for each member
      const memberDataPromises = teamMembersData.map(async (member) => {
        const userId = member.user_id;
        const profile = profilesMap.get(userId);
        const fullName = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
          : '';
        const userName = fullName || profile?.email || "Unknown";

        // Run all queries for this member in parallel
        const [appsResult, interviewsResult, goalsResult] = await Promise.all([
          // Get active applications
          supabase
            .from("jobs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .in("status", ["Applied", "Interview", "Phone Screen", "Offer", "Offer Received", "Interested"]),
          
          // Get upcoming interviews
          supabase
            .from("interviews")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("interview_date", new Date().toISOString())
            .eq("status", "scheduled"),
          
          // Get all goals with progress (including completed)
          supabase
            .from("career_goals")
            .select("progress_percentage, status")
            .eq("user_id", userId)
            .in("status", ["active", "in_progress", "completed"])
        ]);

        if (appsResult.error) {
          console.error("Error fetching jobs for user:", userId, appsResult.error);
        }
        if (interviewsResult.error) {
          console.error("Error fetching interviews for user:", userId, interviewsResult.error);
        }
        if (goalsResult.error) {
          console.error("Error fetching goals for user:", userId, goalsResult.error);
        }

        const totalGoalsCount = goalsResult.data?.length || 0;
        const avgProgress = goalsResult.data?.length
          ? goalsResult.data.reduce((sum, g) => {
              // Completed goals are 100% progress
              const progress = g.status === 'completed' ? 100 : (g.progress_percentage || 0);
              return sum + progress;
            }, 0) / goalsResult.data.length
          : 0;

        console.log(`Member ${userName} (${userId}): apps=${appsResult.count}, interviews=${interviewsResult.count}, goals=${totalGoalsCount}, avgProgress=${avgProgress}`);

        return {
          memberProgress: {
            userId,
            userName,
            activeApplications: appsResult.count || 0,
            upcomingInterviews: interviewsResult.count || 0,
            activeGoals: totalGoalsCount,
            avgGoalProgress: avgProgress,
          },
          stats: {
            apps: appsResult.count || 0,
            interviews: interviewsResult.count || 0,
            goals: totalGoalsCount,
            progress: avgProgress,
          }
        };
      });

      const memberResults = await Promise.all(memberDataPromises);

      memberResults.forEach(result => {
        progressData.push(result.memberProgress);
        totalApps += result.stats.apps;
        totalInts += result.stats.interviews;
        totalGoals += result.stats.goals;
        totalProgress += result.stats.progress;
      });

      console.log("Team dashboard data:", { progressData, totalApps, totalInts, totalGoals });

      return {
        memberProgress: progressData,
        aggregateStats: {
          totalApplications: totalApps,
          totalInterviews: totalInts,
          totalGoals,
          avgProgress: progressData.length ? totalProgress / progressData.length : 0,
        }
      };
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Subscribe to real-time updates for career_goals changes
  useEffect(() => {
    const channel = supabase
      .channel(`team-goals-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'career_goals'
        },
        (payload) => {
          console.log('Career goals changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['team-dashboard', teamId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['team-dashboard', teamId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interviews'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['team-dashboard', teamId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, queryClient]);

  const memberProgress = data?.memberProgress || [];
  const aggregateStats = data?.aggregateStats || { totalApplications: 0, totalInterviews: 0, totalGoals: 0, avgProgress: 0 };

  if (isLoading) {
    return <div className="p-4">Loading team progress...</div>;
  }

  return (
    <div className="space-y-6">

      {/* Aggregate Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Applications</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregateStats.totalApplications}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Interviews</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregateStats.totalInterviews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregateStats.totalGoals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Goal Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregateStats.avgProgress.toFixed(0)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Member Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Member Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {memberProgress.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No team members found.</p>
          ) : (
            memberProgress.map((member) => (
              <div key={member.userId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{member.userName}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline">{member.activeApplications} apps</Badge>
                    <Badge variant="outline">{member.upcomingInterviews} interviews</Badge>
                    <Badge variant="outline">{member.activeGoals} goals</Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Goal Progress</span>
                    <span>{member.avgGoalProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={member.avgGoalProgress} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
