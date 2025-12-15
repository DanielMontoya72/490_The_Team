import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Trophy, Video, Star } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function PeerNetworkingMetrics() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["peer-networking-metrics"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("peer_networking_metrics")
        .select("*")
        .eq("user_id", user.id)
        .order("metric_date", { ascending: true })
        .limit(30);

      if (error) throw error;
      return data;
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["peer-networking-summary"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const [groupsResult, discussionsResult, challengesResult, sessionsResult] = await Promise.all([
        supabase
          .from("peer_support_group_members")
          .select("count")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("peer_support_discussions")
          .select("count")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("peer_challenge_participants")
          .select("count")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("peer_session_registrations")
          .select("count")
          .eq("user_id", user.id)
          .single(),
      ]);

      return {
        totalGroups: groupsResult.data?.count || 0,
        totalDiscussions: discussionsResult.data?.count || 0,
        totalChallenges: challengesResult.data?.count || 0,
        totalSessions: sessionsResult.data?.count || 0,
      };
    },
  });

  const chartData = metrics?.map(m => ({
    date: new Date(m.metric_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    discussions: m.discussions_posted + m.comments_made,
    challenges: m.challenges_completed,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">Networking Impact</h3>
        <p className="text-sm text-muted-foreground">
          Track your peer networking activity and engagement
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Groups Joined</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalGroups || 0}</div>
            <p className="text-xs text-muted-foreground">Active memberships</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Discussions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalDiscussions || 0}</div>
            <p className="text-xs text-muted-foreground">Posts created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Challenges</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalChallenges || 0}</div>
            <p className="text-xs text-muted-foreground">Participated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalSessions || 0}</div>
            <p className="text-xs text-muted-foreground">Attended</p>
          </CardContent>
        </Card>
      </div>

      {chartData && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Over Time</CardTitle>
            <CardDescription>Your peer networking engagement trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="discussions"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Discussions"
                />
                <Line
                  type="monotone"
                  dataKey="challenges"
                  stroke="hsl(var(--secondary))"
                  strokeWidth={2}
                  name="Challenges"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
          <CardDescription>Control your peer networking visibility</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Show profile in groups</p>
              <p className="text-sm text-muted-foreground">Allow group members to see your profile</p>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-sm">Visible</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Activity visibility</p>
              <p className="text-sm text-muted-foreground">Control who can see your posts and comments</p>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm">Members only</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}