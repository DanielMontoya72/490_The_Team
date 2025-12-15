import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, CheckCircle, Star, Calendar, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AdvisorImpactProps {
  advisors: any[];
}

export function AdvisorImpact({ advisors }: AdvisorImpactProps) {
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    totalRecommendations: 0,
    completedRecommendations: 0,
    avgRating: 0,
    totalMessages: 0,
    highImpactRecommendations: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImpactStats();
  }, []);

  const fetchImpactStats = async () => {
    try {
      const [sessionsRes, recsRes, evalsRes, msgsRes] = await Promise.all([
        supabase.from("advisor_sessions").select("status"),
        supabase.from("advisor_recommendations").select("status, impact_rating"),
        supabase.from("advisor_evaluations").select("overall_rating"),
        supabase.from("advisor_messages").select("id"),
      ]);

      const sessions = sessionsRes.data || [];
      const recommendations = recsRes.data || [];
      const evaluations = evalsRes.data || [];
      const messages = msgsRes.data || [];

      const avgRating = evaluations.length > 0
        ? evaluations.reduce((sum, e) => sum + e.overall_rating, 0) / evaluations.length
        : 0;

      setStats({
        totalSessions: sessions.length,
        completedSessions: sessions.filter(s => s.status === 'completed').length,
        totalRecommendations: recommendations.length,
        completedRecommendations: recommendations.filter(r => r.status === 'completed').length,
        avgRating,
        totalMessages: messages.length,
        highImpactRecommendations: recommendations.filter(r => r.impact_rating && r.impact_rating >= 4).length,
      });
    } catch (error) {
      console.error("Error fetching impact stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const recommendationCompletionRate = stats.totalRecommendations > 0
    ? (stats.completedRecommendations / stats.totalRecommendations) * 100
    : 0;

  const sessionCompletionRate = stats.totalSessions > 0
    ? (stats.completedSessions / stats.totalSessions) * 100
    : 0;

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading impact data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Advisor Impact Analysis</h3>
        <p className="text-sm text-muted-foreground">
          Track how advisors have contributed to your career advancement
        </p>
      </div>

      {/* Impact Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completedSessions}</p>
                <p className="text-sm text-muted-foreground">Sessions Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completedRecommendations}</p>
                <p className="text-sm text-muted-foreground">Tasks Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Star className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Avg. Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.highImpactRecommendations}</p>
                <p className="text-sm text-muted-foreground">High Impact Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session Completion Rate</CardTitle>
            <CardDescription>Track your session attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{stats.completedSessions} of {stats.totalSessions} sessions</span>
                <span className="font-medium">{sessionCompletionRate.toFixed(0)}%</span>
              </div>
              <Progress value={sessionCompletionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommendation Implementation</CardTitle>
            <CardDescription>Track your follow-through on advice</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{stats.completedRecommendations} of {stats.totalRecommendations} tasks</span>
                <span className="font-medium">{recommendationCompletionRate.toFixed(0)}%</span>
              </div>
              <Progress value={recommendationCompletionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advisor Performance by Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Advisor Engagement Summary</CardTitle>
          <CardDescription>Overall engagement with your advisory team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{advisors.filter(a => a.status === 'active').length}</p>
              <p className="text-sm text-muted-foreground">Active Advisors</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{stats.totalMessages}</p>
              <p className="text-sm text-muted-foreground">Messages Exchanged</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{stats.totalRecommendations}</p>
              <p className="text-sm text-muted-foreground">Recommendations Received</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{stats.highImpactRecommendations}</p>
              <p className="text-sm text-muted-foreground">High Impact Actions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
