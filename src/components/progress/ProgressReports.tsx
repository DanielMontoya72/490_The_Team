import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Calendar, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export function ProgressReports() {
  const { data: goals } = useQuery({
    queryKey: ["career-goals"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("career_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      return data || [];
    },
  });

  const { data: achievements } = useQuery({
    queryKey: ["goal-achievements"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("goal_achievements")
        .select("*")
        .eq("user_id", user.id)
        .order("achievement_date", { ascending: false })
        .limit(5);

      return data || [];
    },
  });

  const activeGoals = goals?.filter(g => g.status === "active" || g.status === "in_progress") || [];
  const completedGoals = goals?.filter(g => g.status === "completed") || [];

  const generateReport = () => {
    const report = `
🎯 Career Progress Report - ${format(new Date(), "MMMM d, yyyy")}

📊 Goals Summary:
• Active Goals: ${activeGoals.length}
• Completed Goals: ${completedGoals.length}
• Total Achievements: ${achievements?.length || 0}
• Success Rate: ${goals && goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0}%

${activeGoals.length > 0 ? `🔥 In Progress:
${activeGoals.slice(0, 5).map((g, i) => `${i + 1}. ${g.goal_title} (${g.progress_percentage}% complete)`).join('\n')}` : ''}

${achievements && achievements.length > 0 ? `✨ Recent Achievements:
${achievements.slice(0, 3).map((a, i) => `${i + 1}. ${a.achievement_title} (${format(new Date(a.achievement_date), "MMM d")})`).join('\n')}` : ''}

Keep up the momentum! 💪
    `.trim();

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `progress-report-${format(new Date(), "yyyy-MM-dd")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Progress Reports
              </CardTitle>
              <CardDescription>
                Weekly summaries of your job search journey
              </CardDescription>
            </div>
            <Button onClick={generateReport}>
              <Download className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Goals</p>
                    <p className="text-3xl font-bold">{activeGoals.length}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-3xl font-bold">{completedGoals.length}</p>
                  </div>
                  <Badge className="text-lg">✓</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-3xl font-bold">
                      {goals && goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0}%
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {achievements && achievements.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Recent Achievements</h3>
              <div className="space-y-3">
                {achievements.map((achievement) => (
                  <Card key={achievement.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{achievement.achievement_title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {achievement.achievement_description}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {format(new Date(achievement.achievement_date), "MMM d")}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
