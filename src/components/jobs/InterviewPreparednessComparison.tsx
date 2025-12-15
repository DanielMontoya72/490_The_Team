import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { format } from "date-fns";

export function InterviewPreparednessComparison() {
  const { data, isLoading } = useQuery({
    queryKey: ['interview-preparedness-comparison'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch all interviews with their jobs
      const { data: interviews, error: interviewsError } = await supabase
        .from('interviews')
        .select(`
          *,
          jobs (
            job_title,
            company_name
          )
        `)
        .eq('user_id', user.id)
        .order('interview_date', { ascending: false });

      if (interviewsError) throw interviewsError;

      // Fetch predictions for all interviews
      const interviewIds = interviews?.map(i => i.id) || [];
      const { data: predictions, error: predictionsError } = await supabase
        .from('interview_success_predictions')
        .select('*')
        .in('interview_id', interviewIds)
        .order('created_at', { ascending: false });

      if (predictionsError) throw predictionsError;

      // Map predictions to interviews (get latest prediction per interview)
      const predictionMap: Record<string, any> = {};
      predictions?.forEach(pred => {
        if (!predictionMap[pred.interview_id]) {
          predictionMap[pred.interview_id] = pred;
        }
      });

      // Combine data
      const combinedData = interviews?.map(interview => {
        const prediction = predictionMap[interview.id];
        const prepTasks = Array.isArray(interview.preparation_tasks) ? interview.preparation_tasks : [];
        const completedTasks = prepTasks.filter((t: any) => t.completed).length;
        const totalTasks = prepTasks.length;
        const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        return {
          interview,
          prediction,
          taskCompletionRate,
          completedTasks,
          totalTasks
        };
      }) || [];

      // Calculate averages
      const withPredictions = combinedData.filter(d => d.prediction);
      const averages = withPredictions.length > 0 ? {
        overallProbability: Math.round(
          withPredictions.reduce((sum, d) => sum + (d.prediction.overall_probability || 0), 0) / withPredictions.length
        ),
        preparationScore: Math.round(
          withPredictions.reduce((sum, d) => sum + (d.prediction.preparation_score || 0), 0) / withPredictions.length
        ),
        roleMatchScore: Math.round(
          withPredictions.reduce((sum, d) => sum + (d.prediction.role_match_score || 0), 0) / withPredictions.length
        ),
        companyResearchScore: Math.round(
          withPredictions.reduce((sum, d) => sum + (d.prediction.company_research_score || 0), 0) / withPredictions.length
        ),
        practiceHoursScore: Math.round(
          withPredictions.reduce((sum, d) => sum + (d.prediction.practice_hours_score || 0), 0) / withPredictions.length
        ),
        taskCompletion: Math.round(
          combinedData.reduce((sum, d) => sum + d.taskCompletionRate, 0) / combinedData.length
        )
      } : null;

      return { combinedData, averages };
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/10 text-green-700 border-green-500/20';
    if (score >= 60) return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    if (score >= 40) return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
    return 'bg-red-500/10 text-red-700 border-red-500/20';
  };

  const getTrendIcon = (score: number, average: number) => {
    const diff = score - average;
    if (Math.abs(diff) < 5) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (diff > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data?.combinedData || data.combinedData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Interview Preparedness Comparison
          </CardTitle>
          <CardDescription>Compare your preparation levels across all interviews</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No interviews found. Schedule interviews to see preparedness comparisons.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { combinedData, averages } = data;

  return (
    <div className="space-y-6">
      {/* Averages Overview */}
      {averages && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Overall Preparedness Averages
            </CardTitle>
            <CardDescription>Your average scores across all interviews with predictions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Success Rate</div>
                <div className={`text-2xl font-bold ${getScoreColor(averages.overallProbability)}`}>
                  {averages.overallProbability}%
                </div>
                <Progress value={averages.overallProbability} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Preparation</div>
                <div className={`text-2xl font-bold ${getScoreColor(averages.preparationScore)}`}>
                  {averages.preparationScore}%
                </div>
                <Progress value={averages.preparationScore} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Role Match</div>
                <div className={`text-2xl font-bold ${getScoreColor(averages.roleMatchScore)}`}>
                  {averages.roleMatchScore}%
                </div>
                <Progress value={averages.roleMatchScore} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Research</div>
                <div className={`text-2xl font-bold ${getScoreColor(averages.companyResearchScore)}`}>
                  {averages.companyResearchScore}%
                </div>
                <Progress value={averages.companyResearchScore} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Practice</div>
                <div className={`text-2xl font-bold ${getScoreColor(averages.practiceHoursScore)}`}>
                  {averages.practiceHoursScore}%
                </div>
                <Progress value={averages.practiceHoursScore} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Task Completion</div>
                <div className={`text-2xl font-bold ${getScoreColor(averages.taskCompletion)}`}>
                  {averages.taskCompletion}%
                </div>
                <Progress value={averages.taskCompletion} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Interview-by-Interview Comparison</CardTitle>
          <CardDescription>
            Compare preparedness metrics across all your interviews
            {averages && <span className="block mt-1 text-xs">Trends show comparison to your average</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Interview</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Success %</TableHead>
                  <TableHead className="text-right">Prep Score</TableHead>
                  <TableHead className="text-right">Role Match</TableHead>
                  <TableHead className="text-right">Research</TableHead>
                  <TableHead className="text-right">Practice</TableHead>
                  <TableHead className="text-right">Tasks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinedData.map(({ interview, prediction, taskCompletionRate, completedTasks, totalTasks }) => (
                  <TableRow key={interview.id}>
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <div className="font-semibold">{interview.jobs.job_title}</div>
                        <div className="text-xs text-muted-foreground">{interview.jobs.company_name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(interview.interview_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={interview.status === 'completed' ? 'secondary' : 'default'}>
                        {interview.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {prediction ? (
                        <div className="flex items-center justify-end gap-2">
                          <Badge variant="outline" className={getScoreBadgeColor(prediction.overall_probability)}>
                            {prediction.overall_probability}%
                          </Badge>
                          {averages && getTrendIcon(prediction.overall_probability, averages.overallProbability)}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not calculated</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {prediction ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className={`font-medium ${getScoreColor(prediction.preparation_score || 0)}`}>
                            {prediction.preparation_score}%
                          </span>
                          {averages && getTrendIcon(prediction.preparation_score || 0, averages.preparationScore)}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {prediction ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className={`font-medium ${getScoreColor(prediction.role_match_score || 0)}`}>
                            {prediction.role_match_score}%
                          </span>
                          {averages && getTrendIcon(prediction.role_match_score || 0, averages.roleMatchScore)}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {prediction ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className={`font-medium ${getScoreColor(prediction.company_research_score || 0)}`}>
                            {prediction.company_research_score}%
                          </span>
                          {averages && getTrendIcon(prediction.company_research_score || 0, averages.companyResearchScore)}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {prediction ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className={`font-medium ${getScoreColor(prediction.practice_hours_score || 0)}`}>
                            {prediction.practice_hours_score}%
                          </span>
                          {averages && getTrendIcon(prediction.practice_hours_score || 0, averages.practiceHoursScore)}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`font-medium ${getScoreColor(taskCompletionRate)}`}>
                          {completedTasks}/{totalTasks}
                        </span>
                        {averages && getTrendIcon(taskCompletionRate, averages.taskCompletion)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
