import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, TrendingUp, Award, AlertCircle, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { TeamMemberMessageDialog } from "./TeamMemberMessageDialog";

interface TeamReportsTabProps {
  teamId: string;
}

interface TeamMetrics {
  topPerformer: { name: string; score: number; type: 'goals' | 'applications' } | null;
  mostActiveApplications: { name: string; count: number } | null;
  needsSupport: Array<{ name: string; reason: string; userId: string }>;
  teamSuccessRate: number;
}

export const TeamReportsTab = ({ teamId }: TeamReportsTabProps) => {
  const queryClient = useQueryClient();
  const [metrics, setMetrics] = useState<TeamMetrics>({
    topPerformer: null,
    mostActiveApplications: null,
    needsSupport: [],
    teamSuccessRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ name: string; userId: string } | null>(null);

  useEffect(() => {
    fetchTeamMetrics();
  }, [teamId]);

  // Fetch progress shares for reports section
  const { data: teamShares } = useQuery({
    queryKey: ["team-progress-shares-reports", teamId],
    queryFn: async () => {
      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId);

      if (!members?.length) return [];

      const memberIds = members.map(m => m.user_id);

      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", memberIds);

      const { data: shares } = await supabase
        .from("progress_shares")
        .select("*")
        .in("user_id", memberIds)
        .eq("share_type", "report")
        .or("visibility.eq.team,visibility.eq.all")
        .order("created_at", { ascending: false })
        .limit(10);

      return (shares || []).map(share => {
        const profile = profiles?.find(p => p.user_id === share.user_id);
        return {
          ...share,
          user_name: profile 
            ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email
            : "Team Member"
        };
      });
    },
  });

  // Generate progress report mutation
  const generateReport = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: goals } = await supabase
        .from("career_goals")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["active", "in_progress", "completed"]);

      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, status, created_at")
        .eq("user_id", user.id);

      const { data: interviews } = await supabase
        .from("interviews")
        .select("id, interview_date, status")
        .eq("user_id", user.id);

      const activeGoals = goals?.filter(g => g.status === "active" || g.status === "in_progress") || [];
      const completedGoals = goals?.filter(g => g.status === "completed") || [];
      const avgGoalProgress = activeGoals.length
        ? Math.round(activeGoals.reduce((sum, g) => sum + (g.progress_percentage || 0), 0) / activeGoals.length)
        : 0;

      const totalApplications = jobs?.length || 0;
      const activeApplications = jobs?.filter(j => 
        !["Rejected", "Withdrawn", "Accepted"].includes(j.status)
      ).length || 0;
      const upcomingInterviews = interviews?.filter(i => 
        new Date(i.interview_date) > new Date() && i.status === "scheduled"
      ).length || 0;

      const reportContent = {
        message: `📊 Progress Report - ${format(new Date(), "MMM d, yyyy")}\n\n` +
          `🎯 Goals: ${activeGoals.length} active, ${completedGoals.length} completed (${avgGoalProgress}% avg progress)\n` +
          `📋 Applications: ${totalApplications} total, ${activeApplications} in progress\n` +
          `🗓️ Upcoming Interviews: ${upcomingInterviews}\n\n` +
          `Keep pushing forward! 💪`,
        reportData: {
          goals: { active: activeGoals.length, completed: completedGoals.length, avgProgress: avgGoalProgress },
          applications: { total: totalApplications, active: activeApplications },
          interviews: { upcoming: upcomingInterviews },
          generatedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("progress_shares")
        .insert({
          user_id: user.id,
          share_type: "report",
          content: reportContent,
          visibility: "team",
        });

      if (error) throw error;
      return reportContent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-progress-shares-reports", teamId] });
      toast.success("Progress report generated and shared! 📊");
    },
    onError: () => {
      toast.error("Failed to generate report");
    },
  });

  const fetchTeamMetrics = async () => {
    try {
      // Get team members first (separate query to avoid FK issues)
      const { data: teamMembersData, error: membersError } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", teamId);

      if (membersError) {
        console.error("Error fetching team members:", membersError);
        return;
      }

      if (!teamMembersData || teamMembersData.length === 0) {
        console.log("No team members found for team:", teamId);
        return;
      }

      // Get user profiles separately (including email as fallback for names)
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

      let topPerformer = { name: "", score: 0, hasGoals: false };
      let mostActive = { name: "", count: 0 };
      const needsSupport: Array<{ name: string; reason: string; userId: string }> = [];
      let totalApps = 0;
      let successfulApps = 0;

      for (const member of teamMembersData) {
        const profile = profilesMap.get(member.user_id);
        // Use first_name + last_name, fallback to email, then "Unknown"
        const fullName = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
          : '';
        const name = fullName || profile?.email || "Unknown";

        // Calculate goal progress score
        const { data: goals, error: goalsError } = await supabase
          .from("career_goals")
          .select("progress_percentage")
          .eq("user_id", member.user_id)
          .in("status", ["active", "in_progress", "completed"]);

        if (goalsError) {
          console.error("Error fetching goals:", goalsError);
        }

        const avgProgress = goals?.length
          ? goals.reduce((sum, g) => sum + (g.progress_percentage || 0), 0) / goals.length
          : 0;

        // Track top performer - prefer those with goals and progress, but also track for fallback
        const hasGoals = (goals?.length || 0) > 0;
        if (hasGoals && avgProgress > topPerformer.score) {
          topPerformer = { name, score: avgProgress, hasGoals: true };
        } else if (!topPerformer.hasGoals && (avgProgress > topPerformer.score || !topPerformer.name)) {
          // Fallback: if no one has goals yet, track anyway
          topPerformer = { name, score: avgProgress, hasGoals };
        }

        // Check application activity
        const { data: jobs, count: jobsCount, error: jobsError } = await supabase
          .from("jobs")
          .select("*", { count: "exact" })
          .eq("user_id", member.user_id);

        if (jobsError) {
          console.error("Error fetching jobs:", jobsError);
        }

        if (jobsCount && jobsCount > mostActive.count) {
          mostActive = { name, count: jobsCount };
        }

        totalApps += jobsCount || 0;

        const successCount = jobs?.filter(j => j.status === "Accepted" || j.status === "Offer" || j.status === "Offer Received").length || 0;
        successfulApps += successCount;

        // Identify members needing support
        if (jobsCount === 0) {
          needsSupport.push({ name, reason: "No active applications", userId: member.user_id });
        } else if (avgProgress < 30 && (goals?.length || 0) > 0) {
          needsSupport.push({ name, reason: "Low goal progress", userId: member.user_id });
        }
      }

      console.log("Team reports data:", { topPerformer, mostActive, totalApps, successfulApps });

      // Show top performer if they have goals with progress, or fall back to most active
      const topPerformerResult = topPerformer.hasGoals && topPerformer.score > 0 
        ? { name: topPerformer.name, score: topPerformer.score, type: 'goals' as const }
        : mostActive.count > 0 
          ? { name: mostActive.name, score: mostActive.count, type: 'applications' as const }
          : null;

      setMetrics({
        topPerformer: topPerformerResult,
        mostActiveApplications: mostActive.count > 0 ? mostActive : null,
        needsSupport: needsSupport.slice(0, 3),
        teamSuccessRate: totalApps > 0 ? (successfulApps / totalApps) * 100 : 0,
      });
    } catch (error) {
      console.error("Error fetching team metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading team reports...</div>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Performance Reports & Coaching Insights</h3>

      {/* Generate Progress Report Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Progress Reports
          </CardTitle>
          <CardDescription>
            Generate regular progress reports to share with mentors and accountability partners
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">What's included in reports:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Goal progress updates and milestone achievements</li>
              <li>• Job application activity summary</li>
              <li>• Upcoming interview schedule</li>
              <li>• Overall progress metrics</li>
            </ul>
          </div>
          <Button 
            onClick={() => generateReport.mutate()}
            disabled={generateReport.isPending}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {generateReport.isPending ? "Generating..." : "Generate & Share Progress Report"}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Reports Shared */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Reports Shared</CardTitle>
        </CardHeader>
        <CardContent>
          {teamShares && teamShares.length > 0 ? (
            <div className="space-y-4">
              {teamShares.map((report: any) => {
                const content = report.content;
                const reportData = content?.reportData;
                
                return (
                  <div key={report.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📊</span>
                        <div>
                          <p className="font-medium text-sm">{report.user_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{report.reaction_count || 0} reactions</Badge>
                    </div>
                    
                    {reportData && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-border/50">
                        <div className="text-center p-2 bg-background/50 rounded">
                          <p className="text-lg font-bold">{reportData.goals?.active || 0}</p>
                          <p className="text-xs text-muted-foreground">Active Goals</p>
                        </div>
                        <div className="text-center p-2 bg-background/50 rounded">
                          <p className="text-lg font-bold">{reportData.goals?.completed || 0}</p>
                          <p className="text-xs text-muted-foreground">Completed Goals</p>
                        </div>
                        <div className="text-center p-2 bg-background/50 rounded">
                          <p className="text-lg font-bold">{reportData.applications?.total || 0}</p>
                          <p className="text-xs text-muted-foreground">Applications</p>
                        </div>
                        <div className="text-center p-2 bg-background/50 rounded">
                          <p className="text-lg font-bold">{reportData.interviews?.upcoming || 0}</p>
                          <p className="text-xs text-muted-foreground">Upcoming Interviews</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No reports shared yet. Generate your first report above!
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metrics.topPerformer ? (
              <div>
                <div className="text-2xl font-bold">{metrics.topPerformer.name}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.topPerformer.type === 'goals' 
                    ? `${metrics.topPerformer.score.toFixed(0)}% avg goal progress`
                    : `${metrics.topPerformer.score} applications`
                  }
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metrics.mostActiveApplications ? (
              <div>
                <div className="text-2xl font-bold">{metrics.mostActiveApplications.name}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.mostActiveApplications.count} applications
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Team Success Rate
          </CardTitle>
          <CardDescription>Based on job offers and acceptances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{metrics.teamSuccessRate.toFixed(1)}%</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Members Needing Support
          </CardTitle>
          <CardDescription>Coaching opportunities and interventions</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.needsSupport.length === 0 ? (
            <p className="text-sm text-muted-foreground">All team members are progressing well!</p>
          ) : (
            <div className="space-y-2">
              {metrics.needsSupport.map((member, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.reason}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedMember({ name: member.name, userId: member.userId });
                      setMessageDialogOpen(true);
                    }}
                  >
                    Reach Out
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedMember && (
        <TeamMemberMessageDialog
          open={messageDialogOpen}
          onOpenChange={setMessageDialogOpen}
          teamId={teamId}
          recipientName={selectedMember.name}
          recipientId={selectedMember.userId}
        />
      )}
    </div>
  );
};
