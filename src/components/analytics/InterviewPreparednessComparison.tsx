import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Target, AlertCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface InterviewPreparednessComparisonProps {
  data: any;
}

export function InterviewPreparednessComparison({ data }: InterviewPreparednessComparisonProps) {
  const queryClient = useQueryClient();
  const interviews = data?.interviews || [];
  const predictions = data?.predictions || [];
  
  const handleRefreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['interview-analytics'] });
    toast.success('Data refreshed. Regenerate predictions to see updated scores.');
  };

  // Map predictions to ALL interviews (not just upcoming)
  const interviewsWithPredictions = interviews
    .map((interview: any) => {
      const prediction = predictions.find((p: any) => p.interview_id === interview.id);
      return { interview, prediction };
    })
    .filter((item: any) => item.prediction) // Only include interviews with predictions
    .sort((a: any, b: any) => b.prediction.overall_probability - a.prediction.overall_probability);

  // Calculate overall averages across all interviews with predictions
  const calculateAverage = (field: string) => {
    if (interviewsWithPredictions.length === 0) return 0;
    const sum = interviewsWithPredictions.reduce((acc: number, item: any) => 
      acc + (item.prediction[field] || 0), 0);
    return Math.round(sum / interviewsWithPredictions.length);
  };

  const overallAverages = {
    successRate: calculateAverage('overall_probability'),
    preparation: calculateAverage('preparation_score'),
    roleMatch: calculateAverage('role_match_score'),
    research: calculateAverage('company_research_score'),
    practice: calculateAverage('practice_hours_score'),
    taskCompletion: interviewsWithPredictions.length > 0 
      ? Math.round(interviewsWithPredictions.reduce((acc: number, item: any) => {
          const tasks = item.interview.preparation_tasks || [];
          const completed = tasks.filter((t: any) => t.completed).length;
          const total = tasks.length;
          return acc + (total > 0 ? (completed / total) * 100 : 0);
        }, 0) / interviewsWithPredictions.length)
      : 0
  };

  if (interviewsWithPredictions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Interview Preparedness Comparison
          </CardTitle>
          <CardDescription>
            Compare success probability across all interviews with predictions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">
              Generate success predictions for your interviews to compare preparation levels.
            </p>
          </div>
          <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            💡 Go to Jobs → Select a job → Interviews tab → Click "Calculate Success Prediction"
          </p>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Overall Preparedness Averages
            </CardTitle>
            <CardDescription>
              Your average scores across all interviews with predictions
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshData}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Important Notice */}
        <div className="bg-muted/50 p-4 rounded-lg border border-border space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Scores not updating?</p>
              <p className="text-sm text-muted-foreground">
                Predictions are calculated at generation time. After completing research, practice sessions, or job matching, 
                you must <strong>regenerate predictions</strong> for each interview to see updated scores.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Go to: Jobs → Select Job → Interviews Tab → Click "Calculate Success Prediction" for each interview
              </p>
            </div>
          </div>
        </div>
        {/* Overall Averages Section */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Success Rate</div>
            <div className={`text-2xl font-bold ${getScoreColor(overallAverages.successRate)}`}>
              {overallAverages.successRate}%
            </div>
            <Progress value={overallAverages.successRate} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Preparation</div>
            <div className={`text-2xl font-bold ${getScoreColor(overallAverages.preparation)}`}>
              {overallAverages.preparation}%
            </div>
            <Progress value={overallAverages.preparation} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Role Match</div>
            <div className={`text-2xl font-bold ${getScoreColor(overallAverages.roleMatch)}`}>
              {overallAverages.roleMatch}%
            </div>
            <Progress value={overallAverages.roleMatch} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Research</div>
            <div className={`text-2xl font-bold ${getScoreColor(overallAverages.research)}`}>
              {overallAverages.research}%
            </div>
            <Progress value={overallAverages.research} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Practice</div>
            <div className={`text-2xl font-bold ${getScoreColor(overallAverages.practice)}`}>
              {overallAverages.practice}%
            </div>
            <Progress value={overallAverages.practice} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Task Completion</div>
            <div className={`text-2xl font-bold ${getScoreColor(overallAverages.taskCompletion)}`}>
              {overallAverages.taskCompletion}%
            </div>
            <Progress value={overallAverages.taskCompletion} className="h-2" />
          </div>
        </div>

        {/* Interview-by-Interview Comparison */}
        <div className="space-y-3 pt-6 border-t">
          <h3 className="text-xl font-bold">Interview-by-Interview Comparison</h3>
          <p className="text-sm text-muted-foreground">
            Compare preparedness metrics across all your interviews. Trends show comparison to your average
          </p>
        </div>

        {/* Table Header */}
        <div className="overflow-x-auto">
          <div className="min-w-[900px] space-y-2">
            <div className="grid grid-cols-[200px_120px_120px_100px_100px_100px_100px_100px_100px] gap-2 px-4 py-2 bg-muted/50 rounded-t-lg text-sm font-semibold">
              <div>Interview</div>
              <div>Date</div>
              <div>Status</div>
              <div className="text-center">Success %</div>
              <div className="text-center">Prep Score</div>
              <div className="text-center">Role Match</div>
              <div className="text-center">Research</div>
              <div className="text-center">Practice</div>
              <div className="text-center">Tasks</div>
            </div>

            {/* Interview Rows */}
            {interviewsWithPredictions.map(({ interview, prediction }: any) => {
              const tasks = interview.preparation_tasks || [];
              const completedTasks = tasks.filter((t: any) => t.completed).length;
              const totalTasks = tasks.length;
              
              return (
                <div key={interview.id} className="grid grid-cols-[200px_120px_120px_100px_100px_100px_100px_100px_100px] gap-2 px-4 py-3 border rounded-lg hover:bg-muted/30 transition-colors text-sm">
                  <div className="space-y-1">
                    <div className="font-semibold truncate">{interview.jobs?.job_title || 'Unknown Role'}</div>
                    <div className="text-xs text-muted-foreground truncate">{interview.jobs?.company_name || 'Unknown Company'}</div>
                  </div>
                  <div className="text-sm">
                    {format(new Date(interview.interview_date), 'MMM d, yyyy')}
                  </div>
                  <div>
                    <Badge variant="outline" className="capitalize">
                      {interview.status || 'scheduled'}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className={`font-bold ${getScoreColor(prediction.overall_probability || 0)}`}>
                      {prediction.overall_probability || 0}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {prediction.overall_probability > overallAverages.successRate ? '+' : ''}
                      {prediction.overall_probability - overallAverages.successRate}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`font-bold ${getScoreColor(prediction.preparation_score || 0)}`}>
                      {prediction.preparation_score || 0}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(prediction.preparation_score || 0) > overallAverages.preparation ? '+' : ''}
                      {(prediction.preparation_score || 0) - overallAverages.preparation}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`font-bold ${getScoreColor(prediction.role_match_score || 0)}`}>
                      {prediction.role_match_score || 0}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(prediction.role_match_score || 0) > overallAverages.roleMatch ? '+' : ''}
                      {(prediction.role_match_score || 0) - overallAverages.roleMatch}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`font-bold ${getScoreColor(prediction.company_research_score || 0)}`}>
                      {prediction.company_research_score || 0}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(prediction.company_research_score || 0) > overallAverages.research ? '+' : ''}
                      {(prediction.company_research_score || 0) - overallAverages.research}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`font-bold ${getScoreColor(prediction.practice_hours_score || 0)}`}>
                      {prediction.practice_hours_score || 0}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(prediction.practice_hours_score || 0) > overallAverages.practice ? '+' : ''}
                      {(prediction.practice_hours_score || 0) - overallAverages.practice}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">
                      {completedTasks}/{totalTasks}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {totalTasks > 0 ? `${Math.round((completedTasks/totalTasks)*100)}%` : '-'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
