import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface InterviewPredictionAccuracyProps {
  data: any;
}

export function InterviewPredictionAccuracy({ data }: InterviewPredictionAccuracyProps) {
  const predictions = data?.predictions || [];
  const interviews = data?.interviews || [];

  // Match predictions with interview outcomes
  const predictionsWithOutcomes = predictions
    .map((pred: any) => {
      const interview = interviews.find((i: any) => i.id === pred.interview_id);
      return {
        ...pred,
        actual_outcome: interview?.outcome
      };
    })
    .filter((p: any) => p.actual_outcome);

  // Calculate accuracy metrics
  const totalPredictions = predictionsWithOutcomes.length;
  
  const accuratePredictions = predictionsWithOutcomes.filter((p: any) => {
    const predictedPositive = p.overall_probability >= 60;
    const actualPositive = ['offer', 'accepted'].includes(p.actual_outcome);
    return predictedPositive === actualPositive;
  }).length;

  const accuracy = totalPredictions > 0 ? (accuratePredictions / totalPredictions) * 100 : 0;

  // Calculate historical success rate trend
  const historicalRates = predictions
    .filter((p: any) => p.historical_success_rate !== null && p.historical_success_rate !== undefined)
    .map((p: any) => ({
      rate: p.historical_success_rate,
      trend: p.performance_trend,
      date: new Date(p.created_at)
    }))
    .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());

  const latestHistoricalRate = historicalRates.length > 0 
    ? historicalRates[historicalRates.length - 1].rate 
    : null;

  const latestTrend = historicalRates.length > 0
    ? historicalRates[historicalRates.length - 1].trend
    : null;

  const TrendIcon = latestTrend === 'improving' ? TrendingUp 
    : latestTrend === 'declining' ? TrendingDown 
    : Minus;

  const trendColor = latestTrend === 'improving' ? 'text-green-600'
    : latestTrend === 'declining' ? 'text-red-600'
    : 'text-muted-foreground';

  if (totalPredictions === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Prediction Accuracy & Historical Performance
          </CardTitle>
          <CardDescription>
            Track prediction accuracy and historical interview success patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Complete interviews with predictions to see accuracy metrics and historical trends.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Prediction Accuracy & Historical Performance
        </CardTitle>
        <CardDescription>
          How well predictions match actual outcomes and historical success patterns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Prediction Accuracy</h4>
              <Badge variant={accuracy >= 70 ? "default" : accuracy >= 50 ? "secondary" : "destructive"}>
                {accuracy.toFixed(0)}%
              </Badge>
            </div>
            <Progress value={accuracy} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {accuratePredictions} out of {totalPredictions} predictions were accurate
            </p>
          </div>

          {latestHistoricalRate !== null && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Historical Success Rate</h4>
                <Badge variant="outline">
                  {latestHistoricalRate.toFixed(0)}%
                </Badge>
              </div>
              <Progress value={latestHistoricalRate} className="h-2" />
              <div className="flex items-center gap-2 text-xs">
                <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                <span className="text-muted-foreground capitalize">
                  {latestTrend || 'stable'} performance trend
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Recent Predictions vs Outcomes</h4>
          <div className="space-y-2">
            {predictionsWithOutcomes.slice(-5).reverse().map((pred: any) => {
              const predictedSuccess = pred.overall_probability >= 60;
              const actualSuccess = ['offer', 'accepted'].includes(pred.actual_outcome);
              const correct = predictedSuccess === actualSuccess;

              return (
                <div
                  key={pred.id}
                  className={`p-3 rounded-lg border ${
                    correct ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          Predicted: {pred.overall_probability}%
                        </span>
                        <Badge variant="outline">
                          {predictedSuccess ? 'Success' : 'Needs Work'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Actual: {pred.actual_outcome} • {correct ? 'Correct' : 'Incorrect'}
                      </div>
                    </div>
                    {correct ? (
                      <Badge variant="default" className="bg-green-600">Accurate</Badge>
                    ) : (
                      <Badge variant="destructive">Missed</Badge>
                    )}
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
