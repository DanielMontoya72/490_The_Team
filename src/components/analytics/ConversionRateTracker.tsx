import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ConversionRateTrackerProps {
  data: any;
}

export function ConversionRateTracker({ data }: ConversionRateTrackerProps) {
  const interviews = data?.interviews || [];
  
  const totalInterviews = interviews.length;

  // Normalize outcomes - database uses 'passed', 'pending', 'failed', not 'offer'/'rejected'
  // An interview that 'passed' may lead to an offer
  const passedInterviews = interviews.filter((i: any) => {
    const outcome = (i.outcome || "").toString().toLowerCase();
    return outcome === "passed" || outcome.includes("offer") || outcome.includes("accept");
  }).length;

  const rejections = interviews.filter((i: any) => {
    const outcome = (i.outcome || "").toString().toLowerCase();
    return outcome === "failed" || outcome.includes("reject");
  }).length;

  const pending = interviews.filter((i: any) => {
    const outcome = (i.outcome || "").toString().toLowerCase();
    return outcome === "pending" || !outcome;
  }).length;
  
  const conversionRate = totalInterviews > 0 ? (passedInterviews / totalInterviews) * 100 : 0;
  
  // Calculate trend (last 30 days vs previous 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  const recentInterviews = interviews.filter((i: any) => new Date(i.interview_date) >= thirtyDaysAgo);
  const previousInterviews = interviews.filter((i: any) => 
    new Date(i.interview_date) >= sixtyDaysAgo && new Date(i.interview_date) < thirtyDaysAgo
  );
  
  const recentConversion = recentInterviews.length > 0 
    ? (recentInterviews.filter((i: any) => {
        const outcome = (i.outcome || "").toString().toLowerCase();
        return outcome === "passed" || outcome.includes("offer") || outcome.includes("accept");
      }).length / recentInterviews.length) * 100 
    : 0;
  const previousConversion = previousInterviews.length > 0 
    ? (previousInterviews.filter((i: any) => {
        const outcome = (i.outcome || "").toString().toLowerCase();
        return outcome === "passed" || outcome.includes("offer") || outcome.includes("accept");
      }).length / previousInterviews.length) * 100 
    : 0;
  
  const trend = recentConversion - previousConversion;
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Interview Success Rate
          <div className={`flex items-center gap-1 text-sm font-normal ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            {Math.abs(trend).toFixed(1)}%
          </div>
        </CardTitle>
        <CardDescription>
          Your success rate in passing interviews
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold">{conversionRate.toFixed(1)}%</span>
            <span className="text-sm text-muted-foreground">
              {passedInterviews} of {totalInterviews} interviews
            </span>
          </div>
          <Progress value={conversionRate} className="h-2" />
        </div>
        
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <div className="text-2xl font-semibold text-green-500">{passedInterviews}</div>
            <div className="text-xs text-muted-foreground">Passed</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-semibold text-orange-500">{pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-semibold text-red-500">{rejections}</div>
            <div className="text-xs text-muted-foreground">Rejected</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
