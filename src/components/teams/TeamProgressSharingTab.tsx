import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Share2, Shield, TrendingUp, Target, Award, Heart, 
  MessageCircle, Calendar, Users, PartyPopper, BarChart,
  FileText, Download, Handshake, ThumbsUp
} from "lucide-react";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart as RechartsBarChart, Bar
} from "recharts";

interface TeamProgressSharingTabProps {
  teamId: string;
}

export const TeamProgressSharingTab = ({ teamId }: TeamProgressSharingTabProps) => {
  const queryClient = useQueryClient();
  const [shareContent, setShareContent] = useState("");
  const [shareType, setShareType] = useState("update");
  const [commentingOnShare, setCommentingOnShare] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState({
    share_goals: true,
    share_achievements: true,
    share_job_applications: false,
    share_interviews: false,
    share_resume_updates: false,
  });
  const [allowedViewers, setAllowedViewers] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID on mount
  useState(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  });

  // Fetch team members for sharing context
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members-progress", teamId],
    queryFn: async () => {
      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId);

      if (!members?.length) return [];

      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", userIds);

      return profiles || [];
    },
  });

  // Fetch existing privacy settings
  const { data: existingSettings } = useQuery({
    queryKey: ["progress-sharing-settings-team"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      setCurrentUserId(user.id);

      const { data } = await supabase
        .from("progress_sharing_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setPrivacySettings({
          share_goals: data.share_goals ?? true,
          share_achievements: data.share_achievements ?? true,
          share_job_applications: data.share_job_applications ?? false,
          share_interviews: data.share_interviews ?? false,
          share_resume_updates: data.share_resume_updates ?? false,
        });
        if (data.allowed_viewers && Array.isArray(data.allowed_viewers)) {
          setAllowedViewers(data.allowed_viewers as string[]);
        }
      }

      return data;
    },
  });

  // Fetch progress shares from team members (manual posts only)
  const { data: teamShares, isLoading: sharesLoading } = useQuery({
    queryKey: ["team-progress-shares", teamId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get team member IDs
      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId);

      if (!members?.length) return [];

      const memberIds = members.map(m => m.user_id);

      // Fetch user profiles for all team members
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", memberIds);

      // Get manual shares from team members
      const { data: shares } = await supabase
        .from("progress_shares")
        .select("*")
        .in("user_id", memberIds)
        .or("visibility.eq.team,visibility.eq.all")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!shares) return [];

      // Fetch all comments for these shares
      const shareIds = shares.map(s => s.id);
      const { data: allComments } = await supabase
        .from("achievement_celebrations")
        .select("*")
        .in("progress_share_id", shareIds)
        .eq("celebration_type", "comment")
        .order("created_at", { ascending: true });

      // Get all commenter user IDs for profile lookup
      const commenterIds = [...new Set(allComments?.map(c => c.celebrated_by) || [])];
      const { data: commenterProfiles } = await supabase
        .from("user_profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", commenterIds);

      return shares.map(share => {
        const profile = profiles?.find(p => p.user_id === share.user_id);
        const comments = (allComments || [])
          .filter(c => c.progress_share_id === share.id)
          .map(c => {
            const commenterProfile = commenterProfiles?.find(p => p.user_id === c.celebrated_by);
            return {
              ...c,
              commenter_name: commenterProfile 
                ? `${commenterProfile.first_name} ${commenterProfile.last_name}`.trim() || commenterProfile.email
                : "Team Member"
            };
          });
        return {
          ...share,
          user_name: profile 
            ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email
            : "Team Member",
          comments
        };
      });
    },
  });

  // Fetch achievements (posts with share_type = 'achievement')
  const { data: teamAchievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ["team-achievements", teamId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get team member IDs
      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId);

      if (!members?.length) return [];

      const memberIds = members.map(m => m.user_id);

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", memberIds);

      // Get achievement shares from team members
      const { data: achievements } = await supabase
        .from("progress_shares")
        .select("*")
        .in("user_id", memberIds)
        .eq("share_type", "achievement")
        .or("visibility.eq.team,visibility.eq.all")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!achievements) return [];

      return achievements.map(achievement => {
        const profile = profiles?.find(p => p.user_id === achievement.user_id);
        return {
          ...achievement,
          user_name: profile 
            ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email
            : "Team Member"
        };
      });
    },
  });

  // Fetch accountability insights for the team
  const { data: teamInsights } = useQuery({
    queryKey: ["team-accountability-insights", teamId],
    queryFn: async () => {
      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId);

      if (!members?.length) return null;

      const memberIds = members.map(m => m.user_id);

      // Get goal progress for team
      const { data: goals } = await supabase
        .from("career_goals")
        .select("user_id, progress_percentage, status, created_at")
        .in("user_id", memberIds)
        .in("status", ["active", "in_progress", "completed"]);

      // Get jobs data for success tracking
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, user_id, status, created_at")
        .in("user_id", memberIds);

      // Get progress shares count
      const { data: shares } = await supabase
        .from("progress_shares")
        .select("id")
        .in("user_id", memberIds);

      const activeGoals = goals?.filter(g => g.status === "active" || g.status === "in_progress") || [];
      const completedGoals = goals?.filter(g => g.status === "completed") || [];
      const avgProgress = activeGoals.length 
        ? activeGoals.reduce((sum, g) => sum + (g.progress_percentage || 0), 0) / activeGoals.length 
        : 0;

      const successfulJobs = jobs?.filter(j => 
        j.status === "Offer" || j.status === "Offer Received" || j.status === "Accepted"
      ).length || 0;

      const successRate = jobs?.length ? (successfulJobs / jobs.length) * 100 : 0;

      // Build progress data for chart
      const progressByDate = (shares || []).reduce((acc: any[], share: any) => {
        const date = format(new Date(), "MMM d");
        const existing = acc.find(d => d.date === date);
        if (existing) {
          existing.progress += 5;
        } else {
          acc.push({ date, progress: 5 });
        }
        return acc;
      }, []);

      return {
        totalMembers: memberIds.length,
        activeGoals: activeGoals.length,
        completedGoals: completedGoals.length,
        avgProgress: avgProgress || (shares?.length ? Math.min(100, shares.length * 10) : 0),
        successRate,
        totalShares: shares?.length || 0,
        totalApplications: jobs?.length || 0,
        progressData: progressByDate.slice(-10),
      };
    },
  });

  // Fetch engagement tracking data (track accountability partner support effectiveness)
  const { data: engagementData } = useQuery({
    queryKey: ["team-engagement-tracking", teamId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId);

      if (!members?.length) return null;

      const memberIds = members.map(m => m.user_id);

      // Get all celebrations/reactions
      const { data: celebrations } = await supabase
        .from("achievement_celebrations")
        .select("*")
        .order("created_at", { ascending: false });

      // Get shares from team members to filter celebrations
      const { data: teamSharesForEngagement } = await supabase
        .from("progress_shares")
        .select("id, user_id")
        .in("user_id", memberIds);

      const teamShareIds = teamSharesForEngagement?.map(s => s.id) || [];
      const teamCelebrations = celebrations?.filter(c => 
        teamShareIds.includes(c.progress_share_id || "")
      ) || [];

      // Calculate engagement metrics
      const totalReactions = teamCelebrations.filter(c => c.celebration_type === "reaction").length;
      const totalComments = teamCelebrations.filter(c => c.celebration_type === "comment").length;
      
      // Get unique supporters
      const uniqueSupporters = new Set(teamCelebrations.map(c => c.celebrated_by));
      
      // Calculate support per member
      const supportByMember: Record<string, number> = {};
      teamCelebrations.forEach(c => {
        supportByMember[c.celebrated_by] = (supportByMember[c.celebrated_by] || 0) + 1;
      });

      // Get profiles for top supporters
      const topSupporterIds = Object.entries(supportByMember)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id]) => id);

      const { data: supporterProfiles } = await supabase
        .from("user_profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", topSupporterIds);

      const topSupporters = topSupporterIds.map(id => {
        const profile = supporterProfiles?.find(p => p.user_id === id);
        return {
          id,
          name: profile ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email : "Team Member",
          supportCount: supportByMember[id],
        };
      });

      // Build weekly engagement chart data
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dayStr = format(date, "EEE");
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));
        
        const dayEngagement = teamCelebrations.filter(c => {
          const created = new Date(c.created_at || "");
          return created >= dayStart && created <= dayEnd;
        }).length;

        return { day: dayStr, engagement: dayEngagement };
      });

      return {
        totalReactions,
        totalComments,
        totalEngagement: totalReactions + totalComments,
        uniqueSupporters: uniqueSupporters.size,
        topSupporters,
        weeklyEngagement: last7Days,
        supportEffectiveness: memberIds.length > 0 
          ? Math.round((uniqueSupporters.size / memberIds.length) * 100) 
          : 0,
      };
    },
  });

  // Generate progress report
  const generateReport = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user's goals
      const { data: goals } = await supabase
        .from("career_goals")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["active", "in_progress", "completed"]);

      // Get user's job applications
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, status, created_at")
        .eq("user_id", user.id);

      // Get user's interviews
      const { data: interviews } = await supabase
        .from("interviews")
        .select("id, interview_date, status")
        .eq("user_id", user.id);

      // Calculate metrics
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

      // Create progress report as a share
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
      queryClient.invalidateQueries({ queryKey: ["team-progress-shares", teamId] });
      toast.success("Progress report generated and shared! 📊");
    },
    onError: () => {
      toast.error("Failed to generate report");
    },
  });

  // Save privacy settings
  const savePrivacySettings = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("progress_sharing_settings")
        .upsert(
          {
            user_id: user.id,
            ...privacySettings,
            allowed_viewers: allowedViewers.length > 0 ? allowedViewers : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-sharing-settings-team"] });
      toast.success("Privacy settings updated");
    },
    onError: () => {
      toast.error("Failed to update settings");
    },
  });

  // Share progress with team
  const shareProgress = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("progress_shares")
        .insert({
          user_id: user.id,
          share_type: shareType,
          content: { message: shareContent, timestamp: new Date().toISOString() },
          visibility: "team",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-progress-shares", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-achievements", teamId] });
      toast.success("Progress shared with team! 🎉");
      setShareContent("");
      setShareType("update");
    },
    onError: () => {
      toast.error("Failed to share progress");
    },
  });

  // Celebrate a team member's progress
  const celebrateProgress = useMutation({
    mutationFn: async (shareId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update reaction count
      const { data: currentShare } = await supabase
        .from("progress_shares")
        .select("reaction_count")
        .eq("id", shareId)
        .single();

      await supabase
        .from("progress_shares")
        .update({ reaction_count: (currentShare?.reaction_count || 0) + 1 })
        .eq("id", shareId);

      // Record celebration
      await supabase
        .from("achievement_celebrations")
        .insert({
          progress_share_id: shareId,
          celebrated_by: user.id,
          celebration_type: "reaction",
          message: "🎉",
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-progress-shares", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-achievements", teamId] });
      toast.success("Celebration sent! 🎉");
    },
  });

  // Add comment to share
  const addComment = useMutation({
    mutationFn: async (shareId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await supabase
        .from("achievement_celebrations")
        .insert({
          progress_share_id: shareId,
          celebrated_by: user.id,
          celebration_type: "comment",
          message: commentText,
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-progress-shares", teamId] });
      toast.success("Comment added!");
      setCommentText("");
      setCommentingOnShare(null);
    },
  });

  const getShareTypeIcon = (type: string) => {
    switch (type) {
      case "achievement": return "🏆";
      case "milestone": return "🎯";
      case "report": return "📊";
      default: return "📝";
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="celebrate">Achievements</TabsTrigger>
          <TabsTrigger value="settings">Privacy</TabsTrigger>
        </TabsList>

        {/* Progress Feed Tab */}
        <TabsContent value="feed" className="space-y-4 mt-4">
          {/* Share Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Share Your Progress
              </CardTitle>
              <CardDescription>
                Share updates with your team to stay accountable
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>What are you sharing?</Label>
                <Select value={shareType} onValueChange={setShareType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="update">Progress Update</SelectItem>
                    <SelectItem value="achievement">Achievement</SelectItem>
                    <SelectItem value="milestone">Milestone Reached</SelectItem>
                    <SelectItem value="report">Weekly Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Share your progress, wins, challenges, or what you're working on..."
                value={shareContent}
                onChange={(e) => setShareContent(e.target.value)}
                className="min-h-[100px]"
              />
              <Button 
                onClick={() => shareProgress.mutate()}
                disabled={!shareContent || shareProgress.isPending}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share with Team
              </Button>
            </CardContent>
          </Card>

          {/* Team Progress Feed */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Updates
            </h3>
            {sharesLoading ? (
              <p className="text-muted-foreground">Loading team updates...</p>
            ) : teamShares && teamShares.length > 0 ? (
              teamShares.map((share: any) => (
                <Card key={share.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getShareTypeIcon(share.share_type)}</span>
                        <div>
                          <p className="font-semibold">{share.user_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(share.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {share.share_type}
                      </Badge>
                    </div>
                    <p className="text-sm mb-4">{share.content?.message || "No message"}</p>
                    <div className="flex items-center gap-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => celebrateProgress.mutate(share.id)}
                      >
                        <Heart className="h-4 w-4 mr-1" />
                        {share.reaction_count || 0}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setCommentingOnShare(
                          commentingOnShare === share.id ? null : share.id
                        )}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {share.comments?.length || 0}
                      </Button>
                    </div>

                    {/* Display existing comments */}
                    {share.comments && share.comments.length > 0 && (
                      <div className="mt-4 border-t pt-4 space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">
                          Comments ({share.comments.length})
                        </p>
                        {share.comments.map((comment: any) => (
                          <div key={comment.id} className="flex gap-3 bg-muted/50 rounded-lg p-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{comment.commenter_name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-sm mt-1">{comment.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {commentingOnShare === share.id && (
                      <div className="mt-4 space-y-2">
                        <Textarea
                          placeholder="Add encouragement or feedback..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          className="min-h-[60px]"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCommentingOnShare(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => addComment.mutate(share.id)}
                            disabled={!commentText.trim()}
                          >
                            Post
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No team updates yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Be the first to share your progress!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>


        {/* Engagement Tab - Track accountability partner engagement */}
        <TabsContent value="engagement" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="h-5 w-5" />
                Accountability Partner Engagement
              </CardTitle>
              <CardDescription>
                Track how team members support each other's job search journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Reactions</p>
                        <p className="text-2xl font-bold">{engagementData?.totalReactions || 0}</p>
                      </div>
                      <Heart className="h-6 w-6 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Comments</p>
                        <p className="text-2xl font-bold">{engagementData?.totalComments || 0}</p>
                      </div>
                      <MessageCircle className="h-6 w-6 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Supporters</p>
                        <p className="text-2xl font-bold">{engagementData?.uniqueSupporters || 0}</p>
                      </div>
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Support Rate</p>
                        <p className="text-2xl font-bold">{engagementData?.supportEffectiveness || 0}%</p>
                      </div>
                      <ThumbsUp className="h-6 w-6 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Weekly Engagement Chart */}
              {engagementData?.weeklyEngagement && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Weekly Engagement Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsBarChart data={engagementData.weeklyEngagement}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="engagement" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Top Supporters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4" />
                Top Accountability Partners
              </CardTitle>
              <CardDescription>
                Team members providing the most support
              </CardDescription>
            </CardHeader>
            <CardContent>
              {engagementData?.topSupporters && engagementData.topSupporters.length > 0 ? (
                <div className="space-y-3">
                  {engagementData.topSupporters.map((supporter: any, index: number) => (
                    <div key={supporter.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <span className="text-lg font-bold text-primary">#{index + 1}</span>
                      <div className="flex-1">
                        <p className="font-medium">{supporter.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {supporter.supportCount} interactions
                        </p>
                      </div>
                      {index === 0 && <Badge className="bg-yellow-500">Top Supporter</Badge>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No engagement data yet. Start celebrating team wins!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Impact Insights Tab */}
        <TabsContent value="insights" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Team Accountability Impact
              </CardTitle>
              <CardDescription>
                How team accountability is driving job search success
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Team Members</p>
                        <p className="text-2xl font-bold">{teamInsights?.totalMembers || 0}</p>
                      </div>
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Goals</p>
                        <p className="text-2xl font-bold">{teamInsights?.activeGoals || 0}</p>
                      </div>
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Progress</p>
                        <p className="text-2xl font-bold">{teamInsights?.avgProgress.toFixed(0) || 0}%</p>
                      </div>
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Success Rate</p>
                        <p className="text-2xl font-bold">{teamInsights?.successRate.toFixed(0) || 0}%</p>
                      </div>
                      <Award className="h-6 w-6 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {teamInsights?.progressData && teamInsights.progressData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Team Progress Momentum</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={teamInsights.progressData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="progress" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements & Celebrations Tab */}
        <TabsContent value="celebrate" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PartyPopper className="h-5 w-5" />
                Team Achievements
              </CardTitle>
              <CardDescription>
                Celebrate wins and milestones shared by team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              {achievementsLoading ? (
                <p className="text-muted-foreground">Loading achievements...</p>
              ) : teamAchievements && teamAchievements.length > 0 ? (
                <div className="space-y-4">
                  {teamAchievements.map((achievement: any) => (
                    <Card key={achievement.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">🏆</span>
                            <div>
                              <h4 className="font-semibold">{achievement.user_name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {achievement.content?.message || "Achievement shared"}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {format(new Date(achievement.created_at), "MMM d")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-4">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => celebrateProgress.mutate(achievement.id)}
                          >
                            <Heart className="h-4 w-4 mr-1" />
                            {achievement.reaction_count || 0}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No achievements shared yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Share an achievement from the Progress Feed tab!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Motivation Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Motivation & Encouragement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium">Achievements Shared</p>
                    <p className="text-3xl font-bold mt-2">{teamAchievements?.length || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Keep celebrating wins!</p>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium">Team Updates</p>
                    <p className="text-3xl font-bold mt-2">{teamInsights?.totalShares || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total progress shares
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings Tab */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy Controls
              </CardTitle>
              <CardDescription>
                Choose what to share and with whom
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Team Member Selection */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <Label className="text-base font-medium">Who Can View Your Data?</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click to select specific team members who can see your shared information. 
                  If none are selected, all team members can view your data.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {teamMembers?.filter(m => m.user_id !== currentUserId).length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No other team members found</p>
                  ) : (
                    teamMembers?.filter(m => m.user_id !== currentUserId).map((member) => {
                      const isSelected = allowedViewers.includes(member.user_id);
                      const memberName = `${member.first_name} ${member.last_name}`.trim() || member.email;
                      return (
                        <Badge
                          key={member.user_id}
                          variant={isSelected ? "default" : "outline"}
                          className="cursor-pointer hover:bg-primary/80 transition-colors py-1.5 px-3"
                          onClick={() => {
                            if (isSelected) {
                              setAllowedViewers(allowedViewers.filter(id => id !== member.user_id));
                            } else {
                              setAllowedViewers([...allowedViewers, member.user_id]);
                            }
                          }}
                        >
                          {memberName}
                          {isSelected && <span className="ml-1">✓</span>}
                        </Badge>
                      );
                    })
                  )}
                </div>
                {allowedViewers.length > 0 ? (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Shield className="h-4 w-4" />
                    <span>{allowedViewers.length} member(s) selected — only they can view your data</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No members selected — all team members can view your shared data
                  </p>
                )}
              </div>

              {/* What to Share Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Target className="h-4 w-4" />
                  <Label className="text-base font-medium">What Do You Want to Share?</Label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share_goals">Career Goals</Label>
                    <p className="text-sm text-muted-foreground">
                      Share your career goals and progress
                    </p>
                  </div>
                  <Switch
                    id="share_goals"
                    checked={privacySettings.share_goals}
                    onCheckedChange={(checked) =>
                      setPrivacySettings({ ...privacySettings, share_goals: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share_achievements">Achievements</Label>
                    <p className="text-sm text-muted-foreground">
                      Share milestones and achievements
                    </p>
                  </div>
                  <Switch
                    id="share_achievements"
                    checked={privacySettings.share_achievements}
                    onCheckedChange={(checked) =>
                      setPrivacySettings({ ...privacySettings, share_achievements: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share_job_applications">Job Applications</Label>
                    <p className="text-sm text-muted-foreground">
                      Share application activity
                    </p>
                  </div>
                  <Switch
                    id="share_job_applications"
                    checked={privacySettings.share_job_applications}
                    onCheckedChange={(checked) =>
                      setPrivacySettings({ ...privacySettings, share_job_applications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share_interviews">Interviews</Label>
                    <p className="text-sm text-muted-foreground">
                      Share interview schedule and outcomes
                    </p>
                  </div>
                  <Switch
                    id="share_interviews"
                    checked={privacySettings.share_interviews}
                    onCheckedChange={(checked) =>
                      setPrivacySettings({ ...privacySettings, share_interviews: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share_resume_updates">Resume Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Share when you update materials
                    </p>
                  </div>
                  <Switch
                    id="share_resume_updates"
                    checked={privacySettings.share_resume_updates}
                    onCheckedChange={(checked) =>
                      setPrivacySettings({ ...privacySettings, share_resume_updates: checked })
                    }
                  />
                </div>
              </div>

              <Button 
                onClick={() => savePrivacySettings.mutate()}
                disabled={savePrivacySettings.isPending}
                className="w-full"
              >
                Save Privacy Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
