import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BenchmarkData {
  metric: string;
  userValue: number;
  benchmarkMin: number;
  benchmarkMax: number;
  unit: string;
  description: string;
}

interface IndustryBenchmarkComparisonProps {
  metrics: {
    responseRate: number;
    interviewConversionRate: number;
    offerConversionRate: number;
    avgApplicationResponseDays: number;
    avgInterviewSchedulingDays: number;
  };
}

export function IndustryBenchmarkComparison({ metrics }: IndustryBenchmarkComparisonProps) {
  // Industry benchmarks based on job search statistics from career resources and HR studies
  const benchmarks: BenchmarkData[] = [
    {
      metric: "Response Rate",
      userValue: metrics.responseRate,
      benchmarkMin: 20,
      benchmarkMax: 30,
      unit: "%",
      description: "Percentage of applications that receive a response and progress beyond initial application",
    },
    {
      metric: "Interview Conversion",
      userValue: metrics.interviewConversionRate,
      benchmarkMin: 10,
      benchmarkMax: 15,
      unit: "%",
      description: "Percentage of applications that lead to interview opportunities",
    },
    {
      metric: "Offer Success Rate",
      userValue: metrics.offerConversionRate,
      benchmarkMin: 20,
      benchmarkMax: 30,
      unit: "%",
      description: "Percentage of interviews that result in job offers",
    },
    {
      metric: "Application Response Time",
      userValue: metrics.avgApplicationResponseDays,
      benchmarkMin: 14,
      benchmarkMax: 21,
      unit: " days",
      description: "Average time from application submission to first response",
    },
    {
      metric: "Interview Scheduling Time",
      userValue: metrics.avgInterviewSchedulingDays,
      benchmarkMin: 7,
      benchmarkMax: 10,
      unit: " days",
      description: "Average time from interview scheduling to actual interview date",
    },
  ];

  const getPerformanceStatus = (userValue: number, min: number, max: number, isLowerBetter: boolean = false) => {
    if (userValue === 0) return { status: "neutral", icon: Minus, color: "text-muted-foreground" };
    
    if (isLowerBetter) {
      // For metrics where lower is better (like response time)
      if (userValue <= max) return { status: "above", icon: TrendingUp, color: "text-green-600" };
      if (userValue > max * 1.5) return { status: "below", icon: TrendingDown, color: "text-orange-600" };
      return { status: "near", icon: Minus, color: "text-blue-600" };
    } else {
      // For metrics where higher is better (like conversion rates)
      if (userValue >= min) return { status: "above", icon: TrendingUp, color: "text-green-600" };
      if (userValue < min * 0.5) return { status: "below", icon: TrendingDown, color: "text-orange-600" };
      return { status: "near", icon: Minus, color: "text-blue-600" };
    }
  };

  const getPerformanceBadge = (status: string) => {
    switch (status) {
      case "above":
        return { variant: "default" as const, text: "Above Average" };
      case "below":
        return { variant: "destructive" as const, text: "Below Average" };
      case "near":
        return { variant: "secondary" as const, text: "Near Average" };
      default:
        return { variant: "outline" as const, text: "No Data" };
    }
  };

  const calculatePerformancePercentage = (userValue: number, min: number, max: number, isLowerBetter: boolean = false) => {
    if (userValue === 0) return 0;
    
    const average = (min + max) / 2;
    
    if (isLowerBetter) {
      // For time metrics, lower is better
      // If user value is at or below max (good), calculate as percentage better
      if (userValue <= max) {
        return Math.min(100, (max / userValue) * 100);
      }
      // If above max (not good), calculate how much over
      return Math.max(0, 100 - ((userValue - max) / max * 100));
    } else {
      // For conversion rates, higher is better
      return Math.min(100, (userValue / average) * 100);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Industry Benchmark Comparison</CardTitle>
            <CardDescription>See how your performance compares to industry averages</CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Benchmarks are derived from aggregated job search statistics, HR industry studies, 
                  and career resource data. These represent typical ranges across various industries 
                  and experience levels.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {benchmarks.map((benchmark, index) => {
          const isTimeBased = benchmark.metric.includes("Time");
          const performance = getPerformanceStatus(
            benchmark.userValue,
            benchmark.benchmarkMin,
            benchmark.benchmarkMax,
            isTimeBased
          );
          const badge = getPerformanceBadge(performance.status);
          const percentage = calculatePerformancePercentage(
            benchmark.userValue,
            benchmark.benchmarkMin,
            benchmark.benchmarkMax,
            isTimeBased
          );
          const Icon = performance.icon;

          return (
            <div key={index} className="space-y-3 pb-6 border-b last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">{benchmark.metric}</h4>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">{benchmark.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${performance.color}`} />
                  <Badge variant={badge.variant}>{badge.text}</Badge>
                </div>
              </div>

              <div className="flex items-baseline gap-3">
                <div>
                  <span className="text-2xl font-bold">
                    {benchmark.userValue > 0 ? benchmark.userValue.toFixed(1) : "—"}
                  </span>
                  <span className="text-sm text-muted-foreground">{benchmark.unit}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  vs. Industry: {benchmark.benchmarkMin}–{benchmark.benchmarkMax}{benchmark.unit}
                </div>
              </div>

              {benchmark.userValue > 0 && (
                <div className="space-y-1">
                  <Progress value={percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {performance.status === "above" && !isTimeBased && "Performing above industry average"}
                    {performance.status === "above" && isTimeBased && "Faster than industry average"}
                    {performance.status === "below" && !isTimeBased && "Below industry average - consider optimizing your approach"}
                    {performance.status === "below" && isTimeBased && "Slower than industry average"}
                    {performance.status === "near" && "Within industry average range"}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> These benchmarks represent general industry averages and may vary by 
            role, experience level, industry sector, and market conditions. Use them as directional guidance 
            rather than absolute targets.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
