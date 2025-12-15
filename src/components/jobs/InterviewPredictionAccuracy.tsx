import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target, CheckCircle2, XCircle, AlertCircle, Loader2, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

function GeneratePredictionButton({ interviewId, jobId }: { interviewId: string; jobId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('calculate-interview-success', {
        body: { interviewId, jobId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-prediction-accuracy'] });
      toast({
        title: "Prediction Generated",
        description: "Interview success prediction has been calculated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Generate Prediction",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => generateMutation.mutate()}
      disabled={generateMutation.isPending}
    >
      {generateMutation.isPending ? (
        <>
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Generating...
        </>
      ) : (
        "Generate Prediction"
      )}
    </Button>
  );
}

export function InterviewPredictionAccuracy() {
  const { data, isLoading } = useQuery({
    queryKey: ['interview-prediction-accuracy'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch completed interviews with outcomes
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
        .eq('status', 'completed')
        .not('outcome', 'is', null)
        .order('interview_date', { ascending: false });

      if (interviewsError) throw interviewsError;

      if (!interviews || interviews.length === 0) {
        return { interviews: [], predictions: [], accuracyStats: null };
      }

      // Fetch predictions for completed interviews
      const interviewIds = interviews.map(i => i.id);
      const { data: predictions, error: predictionsError } = await supabase
        .from('interview_success_predictions')
        .select('*')
        .in('interview_id', interviewIds)
        .order('created_at', { ascending: false });

      if (predictionsError) throw predictionsError;

      // Map predictions to interviews
      const predictionMap: Record<string, any> = {};
      predictions?.forEach(pred => {
        if (!predictionMap[pred.interview_id]) {
          predictionMap[pred.interview_id] = pred;
        }
      });

      // Combine and analyze data
      const combinedData = interviews.map(interview => {
        const prediction = predictionMap[interview.id];
        
        // Determine actual outcome (positive = passed/offer/accepted/hired, negative = rejected/failed)
        const actualOutcome = ['passed', 'offer', 'accepted', 'hired'].includes(interview.outcome?.toLowerCase() || '') 
          ? 'positive' 
          : 'negative';

        // Determine predicted outcome based on probability
        const predictedOutcome = prediction?.overall_probability >= 50 ? 'positive' : 'negative';

        // Check if prediction was accurate
        const isAccurate = prediction ? (predictedOutcome === actualOutcome) : null;

        return {
          interview,
          prediction,
          actualOutcome,
          predictedOutcome,
          isAccurate
        };
      });

      // Calculate accuracy statistics
      const withPredictions = combinedData.filter(d => d.prediction);
      const accurate = withPredictions.filter(d => d.isAccurate === true).length;
      const total = withPredictions.length;
      const accuracyRate = total > 0 ? Math.round((accurate / total) * 100) : 0;

      // Calculate positive/negative prediction accuracy
      const positivePredictions = withPredictions.filter(d => d.predictedOutcome === 'positive');
      const negativePredictions = withPredictions.filter(d => d.predictedOutcome === 'negative');
      
      const positiveAccurate = positivePredictions.filter(d => d.isAccurate === true).length;
      const negativeAccurate = negativePredictions.filter(d => d.isAccurate === true).length;

      const positiveAccuracyRate = positivePredictions.length > 0 
        ? Math.round((positiveAccurate / positivePredictions.length) * 100) 
        : 0;
      const negativeAccuracyRate = negativePredictions.length > 0 
        ? Math.round((negativeAccurate / negativePredictions.length) * 100) 
        : 0;

      // Calculate average confidence when correct vs incorrect
      const correctPredictions = withPredictions.filter(d => d.isAccurate === true);
      const incorrectPredictions = withPredictions.filter(d => d.isAccurate === false);

      const avgConfidenceWhenCorrect = correctPredictions.length > 0
        ? Math.round(correctPredictions.reduce((sum, d) => sum + (d.prediction.overall_probability || 0), 0) / correctPredictions.length)
        : 0;

      const avgConfidenceWhenIncorrect = incorrectPredictions.length > 0
        ? Math.round(incorrectPredictions.reduce((sum, d) => sum + (d.prediction.overall_probability || 0), 0) / incorrectPredictions.length)
        : 0;

      const accuracyStats = {
        accuracyRate,
        accurate,
        total,
        positiveAccuracyRate,
        positivePredictions: positivePredictions.length,
        negativeAccuracyRate,
        negativePredictions: negativePredictions.length,
        avgConfidenceWhenCorrect,
        avgConfidenceWhenIncorrect
      };

      return { interviews: combinedData, accuracyStats };
    },
  });

  const getOutcomeBadge = (outcome: string) => {
    const lower = outcome.toLowerCase();
    if (['passed', 'offer', 'accepted', 'hired'].includes(lower)) {
      return <Badge className="bg-green-500">Success</Badge>;
    }
    return <Badge variant="destructive">Not Selected</Badge>;
  };

  const getAccuracyIcon = (isAccurate: boolean | null) => {
    if (isAccurate === null) return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    if (isAccurate) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    return <XCircle className="h-5 w-5 text-red-600" />;
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

  if (!data?.interviews || data.interviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Prediction Accuracy Tracking
          </CardTitle>
          <CardDescription>Compare AI predictions with actual interview outcomes</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No completed interviews with outcomes yet. Complete interviews and record outcomes to track prediction accuracy.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { interviews, accuracyStats } = data;

  return (
    <div className="space-y-6">
      {/* Accuracy Statistics */}
      {accuracyStats && accuracyStats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              AI Prediction Accuracy
            </CardTitle>
            <CardDescription>
              How accurately the AI predicts interview outcomes based on {accuracyStats.total} completed interviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Overall Accuracy */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-muted-foreground">Overall Accuracy</div>
                  <TrendingUp className={`h-4 w-4 ${accuracyStats.accuracyRate >= 70 ? 'text-green-600' : 'text-yellow-600'}`} />
                </div>
                <div className="text-3xl font-bold text-primary">
                  {accuracyStats.accuracyRate}%
                </div>
                <Progress value={accuracyStats.accuracyRate} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {accuracyStats.accurate} of {accuracyStats.total} predictions correct
                </p>
              </div>

              {/* Positive Predictions */}
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground">When Predicting Success</div>
                <div className="text-3xl font-bold text-green-600">
                  {accuracyStats.positiveAccuracyRate}%
                </div>
                <Progress value={accuracyStats.positiveAccuracyRate} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Accuracy on {accuracyStats.positivePredictions} positive predictions
                </p>
              </div>

              {/* Negative Predictions */}
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground">When Predicting Rejection</div>
                <div className="text-3xl font-bold text-red-600">
                  {accuracyStats.negativeAccuracyRate}%
                </div>
                <Progress value={accuracyStats.negativeAccuracyRate} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Accuracy on {accuracyStats.negativePredictions} negative predictions
                </p>
              </div>

              {/* Confidence Analysis */}
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground">Confidence Analysis</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">When Correct:</span>
                    <span className="font-bold text-green-600">{accuracyStats.avgConfidenceWhenCorrect}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">When Wrong:</span>
                    <span className="font-bold text-red-600">{accuracyStats.avgConfidenceWhenIncorrect}%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Average prediction confidence
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Predictions vs Outcomes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Prediction vs Outcome Analysis</CardTitle>
          <CardDescription>Detailed comparison of AI predictions and actual results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Interview</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">AI Predicted</TableHead>
                  <TableHead className="text-center">Actual Outcome</TableHead>
                  <TableHead className="text-center">Accuracy</TableHead>
                  <TableHead className="text-right">Confidence</TableHead>
                  <TableHead className="text-right">Preparation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviews.map(({ interview, prediction, actualOutcome, predictedOutcome, isAccurate }) => (
                  <TableRow key={interview.id} className={isAccurate === false ? 'bg-red-50/50 dark:bg-red-950/20' : isAccurate === true ? 'bg-green-50/50 dark:bg-green-950/20' : ''}>
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <div className="font-semibold">{interview.jobs.job_title}</div>
                        <div className="text-xs text-muted-foreground">{interview.jobs.company_name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(interview.interview_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-center">
                      {prediction ? (
                        <div className="space-y-1">
                          <Badge variant={predictedOutcome === 'positive' ? 'default' : 'secondary'}>
                            {predictedOutcome === 'positive' ? 'Success' : 'Rejection'}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {prediction.overall_probability}% probability
                          </div>
                        </div>
                      ) : (
                        <GeneratePredictionButton interviewId={interview.id} jobId={interview.job_id} />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {getOutcomeBadge(interview.outcome)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {getAccuracyIcon(isAccurate)}
                        {isAccurate !== null && (
                          <span className={`text-sm font-medium ${isAccurate ? 'text-green-600' : 'text-red-600'}`}>
                            {isAccurate ? 'Correct' : 'Incorrect'}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {prediction ? (
                        <span className="font-medium">{prediction.overall_probability}%</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {prediction ? (
                        <span className="font-medium">{prediction.preparation_score}%</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {accuracyStats && accuracyStats.total >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {accuracyStats.accuracyRate >= 70 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-green-900 dark:text-green-100">High Prediction Accuracy</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    The AI predictions are {accuracyStats.accuracyRate}% accurate. You can trust these predictions to guide your preparation strategy.
                  </p>
                </div>
              </div>
            )}
            
            {accuracyStats.accuracyRate < 50 && accuracyStats.total >= 5 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">Improving Prediction Accuracy</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Predictions will become more accurate as you complete more preparation tasks and provide more detailed information for each interview.
                  </p>
                </div>
              </div>
            )}

            {accuracyStats.avgConfidenceWhenCorrect > accuracyStats.avgConfidenceWhenIncorrect + 10 && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-blue-900 dark:text-blue-100">Confidence Correlates with Accuracy</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Higher confidence predictions ({accuracyStats.avgConfidenceWhenCorrect}%) are more accurate than lower confidence ones ({accuracyStats.avgConfidenceWhenIncorrect}%). Pay attention to the confidence level.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
