import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Heart, Battery, TrendingDown, TrendingUp } from "lucide-react";

interface BurnoutMonitoringProps {
  entries: any[];
  metrics: any[];
}

export function BurnoutMonitoring({ entries, metrics }: BurnoutMonitoringProps) {
  // Calculate burnout risk factors
  const recentMetrics = metrics.slice(-7); // Last 7 days
  const avgWorkloadHours = recentMetrics.reduce((sum, m) => sum + (m.total_time_minutes || 0), 0) / (recentMetrics.length || 1) / 60;
  const avgEnergy = recentMetrics.reduce((sum, m) => sum + (m.average_energy_level || 0), 0) / (recentMetrics.length || 1);
  const avgCompletionRate = recentMetrics.reduce((sum, m) => sum + (m.completion_rate || 0), 0) / (recentMetrics.length || 1) * 100;

  // Burnout risk score (0-100)
  const burnoutScore = Math.min(100, Math.max(0,
    (avgWorkloadHours > 6 ? 30 : 0) + // Overwork
    (avgEnergy < 2.5 ? 30 : 0) + // Low energy
    (avgCompletionRate < 50 ? 40 : 0) // Poor completion
  ));

  // Work-life balance score (0-100)
  const workLifeBalance = Math.max(0, 100 - burnoutScore);

  const getBurnoutLevel = (score: number) => {
    if (score < 30) return { level: "Low Risk", color: "text-green-600", icon: Heart };
    if (score < 60) return { level: "Moderate", color: "text-yellow-600", icon: Battery };
    return { level: "High Risk", color: "text-red-600", icon: AlertTriangle };
  };

  const burnoutLevel = getBurnoutLevel(burnoutScore);
  const BurnoutIcon = burnoutLevel.icon;

  // Energy trend
  const energyTrend = recentMetrics.length >= 2 
    ? recentMetrics[recentMetrics.length - 1].average_energy_level - recentMetrics[0].average_energy_level
    : 0;

  return (
    <div className="space-y-6">
      {/* Burnout Risk Alert */}
      {burnoutScore >= 60 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>High Burnout Risk Detected</AlertTitle>
          <AlertDescription>
            Your recent activity patterns suggest you may be at risk of burnout. Consider taking breaks, reducing workload, or adjusting your schedule.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BurnoutIcon className={`h-5 w-5 ${burnoutLevel.color}`} />
              Burnout Risk
            </CardTitle>
            <CardDescription>Based on workload and energy patterns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className={`text-sm font-medium ${burnoutLevel.color}`}>
                  {burnoutLevel.level}
                </span>
                <span className="text-sm text-muted-foreground">
                  {burnoutScore.toFixed(0)}/100
                </span>
              </div>
              <Progress value={burnoutScore} className="h-2" />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Average workload: {avgWorkloadHours.toFixed(1)}h/day</p>
              <p>• Energy level: {avgEnergy.toFixed(1)}/5</p>
              <p>• Task completion: {avgCompletionRate.toFixed(0)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-green-600" />
              Work-Life Balance
            </CardTitle>
            <CardDescription>Overall well-being score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-green-600">
                  {workLifeBalance >= 70 ? "Excellent" : workLifeBalance >= 50 ? "Good" : "Needs Improvement"}
                </span>
                <span className="text-sm text-muted-foreground">
                  {workLifeBalance.toFixed(0)}/100
                </span>
              </div>
              <Progress value={workLifeBalance} className="h-2" />
            </div>
            <div className="flex items-center gap-2 text-sm">
              {energyTrend > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Energy trending up</span>
                </>
              ) : energyTrend < 0 ? (
                <>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">Energy trending down</span>
                </>
              ) : (
                <span className="text-muted-foreground">Energy stable</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Well-being Recommendations</CardTitle>
          <CardDescription>Tips to maintain healthy job search habits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {avgWorkloadHours > 6 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium">Reduce Daily Workload</p>
                  <p className="text-sm text-muted-foreground">
                    You're averaging {avgWorkloadHours.toFixed(1)} hours/day. Consider limiting to 4-5 hours for sustainability.
                  </p>
                </div>
              </div>
            )}

            {avgEnergy < 2.5 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <Battery className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium">Boost Your Energy</p>
                  <p className="text-sm text-muted-foreground">
                    Low energy detected. Take regular breaks, exercise, and ensure adequate sleep.
                  </p>
                </div>
              </div>
            )}

            {avgCompletionRate < 50 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <TrendingDown className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium">Improve Task Completion</p>
                  <p className="text-sm text-muted-foreground">
                    Only {avgCompletionRate.toFixed(0)}% tasks completed. Break down tasks into smaller, manageable chunks.
                  </p>
                </div>
              </div>
            )}

            {burnoutScore < 30 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
                <Heart className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">Great Balance!</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Keep up the excellent work-life balance. Your sustainable pace will lead to better long-term results.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
