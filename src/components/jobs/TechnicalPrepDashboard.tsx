import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, TrendingUp, Clock, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const TechnicalPrepDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["technical-prep-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch user's technical prep attempts
      const { data: attempts } = await supabase
        .from("technical_prep_attempts")
        .select("*")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });

      // Fetch writing practice feedback
      const { data: writingPractice } = await supabase
        .from("response_coaching_feedback")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Calculate statistics
      const total = attempts?.length || 0;
      const completed = total;
      const easy = attempts?.filter((a: any) => a.difficulty_level === "easy").length || 0;
      const medium = attempts?.filter((a: any) => a.difficulty_level === "medium").length || 0;
      const hard = attempts?.filter((a: any) => a.difficulty_level === "hard").length || 0;

      const totalTime = attempts?.reduce((sum: number, a: any) => sum + (a.time_spent_seconds || 0), 0) || 0;
      const avgTime = completed > 0 ? Math.round(totalTime / completed / 60) : 0;

      // Writing practice statistics
      const writingPracticeCount = writingPractice?.length || 0;
      const avgWritingScore = writingPractice && writingPractice.length > 0
        ? Math.round(writingPractice.reduce((sum: number, wp: any) => {
            const scores = wp.scores as Record<string, any>;
            return sum + (scores?.overall_score || 0);
          }, 0) / writingPractice.length)
        : 0;

      // Calculate streak
      let streak = 0;
      if (attempts && attempts.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let currentDate = new Date(today);
        
        for (let i = 0; i < 30; i++) {
          const hasAttempt = attempts.some((a: any) => {
            const attemptDate = new Date(a.completed_at);
            attemptDate.setHours(0, 0, 0, 0);
            return attemptDate.getTime() === currentDate.getTime();
          });
          
          if (hasAttempt) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else if (i > 0) {
            break;
          } else {
            currentDate.setDate(currentDate.getDate() - 1);
          }
        }
      }

      return {
        total,
        completed,
        completionRate: 100,
        byDifficulty: { easy, medium, hard },
        totalTime: Math.round(totalTime / 3600), // Convert to hours
        avgTime,
        streak,
        recentChallenges: attempts?.slice(0, 5) || [],
        writingPracticeCount,
        avgWritingScore,
        recentWritingPractice: writingPractice?.slice(0, 5) || [],
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Total Completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats?.completed || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Technical challenges
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Writing Practice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats?.writingPracticeCount || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Sessions completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Avg Writing Score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats?.avgWritingScore || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Out of 100
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Current Streak
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats?.streak || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">Days in a row</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Practice Time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats?.totalTime || 0}h</div>
            <p className="text-sm text-muted-foreground mt-1">Total time invested</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Progress by Difficulty</CardTitle>
            <CardDescription>Technical challenges completed by difficulty</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Easy</span>
                <span className="text-sm text-muted-foreground">{stats?.byDifficulty.easy || 0}</span>
              </div>
              <Progress value={((stats?.byDifficulty.easy || 0) / (stats?.completed || 1)) * 100} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Medium</span>
                <span className="text-sm text-muted-foreground">{stats?.byDifficulty.medium || 0}</span>
              </div>
              <Progress value={((stats?.byDifficulty.medium || 0) / (stats?.completed || 1)) * 100} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Hard</span>
                <span className="text-sm text-muted-foreground">{stats?.byDifficulty.hard || 0}</span>
              </div>
              <Progress value={((stats?.byDifficulty.hard || 0) / (stats?.completed || 1)) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Writing Practice</CardTitle>
            <CardDescription>Recent response writing sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.recentWritingPractice && stats.recentWritingPractice.length > 0 ? (
                stats.recentWritingPractice.map((session: any) => {
                  const scores = session.scores as Record<string, any>;
                  const feedback = session.feedback as Record<string, any>;
                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-md"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm line-clamp-1">
                          {feedback?.question || 'Practice Session'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(session.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            (scores?.overall_score || 0) >= 80
                              ? "default"
                              : (scores?.overall_score || 0) >= 60
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {scores?.overall_score || 0}/100
                        </Badge>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No writing practice sessions yet. Start practicing!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Writing Practice Score Breakdown</CardTitle>
          <CardDescription>Average scores across all writing practice sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recentWritingPractice && stats.recentWritingPractice.length > 0 ? (
            <div className="space-y-4">
              {(() => {
                const allScores = stats.recentWritingPractice.map((s: any) => s.scores as Record<string, any>);
                const avgClarity = Math.round(allScores.reduce((sum: number, s: any) => sum + (s?.clarity_score || 0), 0) / allScores.length);
                const avgProfessionalism = Math.round(allScores.reduce((sum: number, s: any) => sum + (s?.professionalism_score || 0), 0) / allScores.length);
                const avgStructure = Math.round(allScores.reduce((sum: number, s: any) => sum + (s?.structure_score || 0), 0) / allScores.length);
                const avgStorytelling = Math.round(allScores.reduce((sum: number, s: any) => sum + (s?.storytelling_score || 0), 0) / allScores.length);

                return (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Clarity</span>
                        <span className="text-sm text-muted-foreground">{avgClarity}/100</span>
                      </div>
                      <Progress value={avgClarity} className="h-2" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Professionalism</span>
                        <span className="text-sm text-muted-foreground">{avgProfessionalism}/100</span>
                      </div>
                      <Progress value={avgProfessionalism} className="h-2" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Structure</span>
                        <span className="text-sm text-muted-foreground">{avgStructure}/100</span>
                      </div>
                      <Progress value={avgStructure} className="h-2" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Storytelling</span>
                        <span className="text-sm text-muted-foreground">{avgStorytelling}/100</span>
                      </div>
                      <Progress value={avgStorytelling} className="h-2" />
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Complete writing practice sessions to see your score breakdown
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Technical Challenges</CardTitle>
          <CardDescription>Recent technical prep activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats?.recentChallenges.length > 0 ? (
              stats.recentChallenges.map((challenge: any) => (
                <div
                  key={challenge.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-md"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{challenge.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(challenge.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        challenge.difficulty === "easy"
                          ? "secondary"
                          : challenge.difficulty === "medium"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {challenge.difficulty}
                    </Badge>
                    {challenge.status === "completed" && (
                      <Award className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No challenges completed yet. Start practicing!
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skill Development Recommendations</CardTitle>
          <CardDescription>Areas to focus on based on your performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats?.avgWritingScore && stats.avgWritingScore < 70 && (
              <div className="p-4 bg-primary/5 rounded-md border border-primary/20">
                <h4 className="font-semibold text-sm mb-2">Improve Writing Responses</h4>
                <p className="text-sm text-muted-foreground">
                  Your average writing score is {stats.avgWritingScore}/100. Practice more to improve clarity and structure.
                </p>
              </div>
            )}

            {stats?.byDifficulty.hard < 5 && (
              <div className="p-4 bg-primary/5 rounded-md border border-primary/20">
                <h4 className="font-semibold text-sm mb-2">Practice More Hard Problems</h4>
                <p className="text-sm text-muted-foreground">
                  Challenge yourself with more difficult problems to improve problem-solving skills.
                </p>
              </div>
            )}

            <div className="p-4 bg-primary/5 rounded-md border border-primary/20">
              <h4 className="font-semibold text-sm mb-2">Maintain Consistency</h4>
              <p className="text-sm text-muted-foreground">
                Keep your {stats?.streak || 0}-day streak going! Regular practice leads to better results.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
