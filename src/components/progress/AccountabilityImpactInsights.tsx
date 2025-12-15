import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Target, Calendar, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

export function AccountabilityImpactInsights() {
  const { data: insights, isLoading } = useQuery({
    queryKey: ["accountability-impact"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get accountability partners
      const { data: partners } = await supabase
        .from("accountability_partners")
        .select("*, accountability_engagement(*)")
        .eq("user_id", user.id)
        .eq("status", "active");

      // Get goal progress data
      const { data: goalProgress } = await supabase
        .from("goal_progress_tracking")
        .select("*")
        .eq("user_id", user.id)
        .order("update_date", { ascending: true });

      // Get job application data
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      // Get progress shares
      const { data: shares } = await supabase
        .from("progress_shares")
        .select("created_at, reaction_count")
        .eq("user_id", user.id);

      // Calculate metrics
      const totalEngagements = partners?.reduce((acc, p) => {
        return acc + (p.accountability_engagement?.length || 0);
      }, 0) || 0;

      const avgEngagement = partners?.reduce((acc, p) => {
        return acc + (p.engagement_score || 0);
      }, 0) / (partners?.length || 1) || 0;

      const jobsAfterPartnership = jobs?.filter(j => {
        const firstPartnerDate = partners?.[0]?.created_at;
        return firstPartnerDate && new Date(j.created_at) > new Date(firstPartnerDate);
      }).length || 0;

      const successRate = jobs && jobs.length > 0
        ? (jobs.filter(j => {
            const status = (j.status || '').toLowerCase();
            return status === "offer" || status === "accepted" || status === "offer received";
          }).length / jobs.length) * 100
        : 0;

      return {
        totalEngagements,
        avgEngagement,
        activePartners: partners?.length || 0,
        jobsAfterPartnership,
        successRate,
        totalShares: shares?.length || 0,
        totalReactions: shares?.reduce((acc, s) => acc + (s.reaction_count || 0), 0) || 0,
        progressData: goalProgress?.map(p => ({
          date: new Date(p.update_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          progress: p.progress_percentage,
        })) || [],
      };
    },
  });

  if (isLoading || !insights) {
    return <div>Loading insights...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Accountability Impact
          </CardTitle>
          <CardDescription>
            How accountability partnerships are boosting your job search success
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Partners</p>
                    <p className="text-3xl font-bold">{insights.activePartners}</p>
                  </div>
                  <Target className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Engagements</p>
                    <p className="text-3xl font-bold">{insights.totalEngagements}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Engagement</p>
                    <p className="text-3xl font-bold">{insights.avgEngagement.toFixed(0)}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-3xl font-bold">{insights.successRate.toFixed(0)}%</p>
                  </div>
                  <Award className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Progress Momentum</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={insights.progressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="progress" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Engagement Impact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Jobs Applied (with partners)</span>
                  <span className="text-2xl font-bold">{insights.jobsAfterPartnership}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Progress Shares</span>
                  <span className="text-2xl font-bold">{insights.totalShares}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Celebrations Received</span>
                  <span className="text-2xl font-bold">{insights.totalReactions}</span>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Partners increase success rate by helping maintain consistency and motivation
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
