import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  TrendingUp, 
  Clock, 
  Target, 
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface Metrics {
  responseRate: number;
  interviewRate: number;
  avgResponseTime: number;
  total: number;
}

interface TestComparisonMetricsProps {
  metricsA: Metrics;
  metricsB: Metrics;
  variantAName: string;
  variantBName: string;
  isSignificant: boolean;
  winner: string | null;
}

export function TestComparisonMetrics({ 
  metricsA, 
  metricsB, 
  variantAName, 
  variantBName,
  isSignificant,
  winner
}: TestComparisonMetricsProps) {
  const getDifference = (a: number, b: number) => {
    const diff = a - b;
    if (Math.abs(diff) < 0.1) return null;
    return diff;
  };

  const responseRateDiff = getDifference(metricsA.responseRate, metricsB.responseRate);
  const interviewRateDiff = getDifference(metricsA.interviewRate, metricsB.interviewRate);
  const timeDiff = metricsA.avgResponseTime > 0 && metricsB.avgResponseTime > 0 
    ? getDifference(metricsB.avgResponseTime, metricsA.avgResponseTime) // Lower is better for time
    : null;

  const getWinnerLabel = () => {
    if (!isSignificant) return null;
    if (winner === 'A') return 'Variant A Wins';
    if (winner === 'B') return 'Variant B Wins';
    return 'Too Close to Call';
  };

  const winnerLabel = getWinnerLabel();

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Comparison Metrics
          </span>
          {winnerLabel && (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
              <Trophy className="h-3 w-3 mr-1" />
              {winnerLabel}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Response Rate Comparison */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 font-medium">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Response Rate
            </span>
            {responseRateDiff && (
              <Badge variant={responseRateDiff > 0 ? 'default' : 'secondary'} className="text-xs">
                A is {Math.abs(responseRateDiff).toFixed(1)}% {responseRateDiff > 0 ? 'better' : 'worse'}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-2 rounded ${winner === 'A' ? 'bg-green-500/10' : 'bg-muted/30'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Variant A</span>
                <span className="text-sm font-bold">{metricsA.responseRate.toFixed(1)}%</span>
              </div>
              <Progress value={metricsA.responseRate} className="h-2" />
            </div>
            <div className={`p-2 rounded ${winner === 'B' ? 'bg-green-500/10' : 'bg-muted/30'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Variant B</span>
                <span className="text-sm font-bold">{metricsB.responseRate.toFixed(1)}%</span>
              </div>
              <Progress value={metricsB.responseRate} className="h-2" />
            </div>
          </div>
        </div>

        {/* Interview Conversion Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Interview Conversion
            </span>
            {interviewRateDiff && (
              <Badge variant={interviewRateDiff > 0 ? 'default' : 'secondary'} className="text-xs">
                A is {Math.abs(interviewRateDiff).toFixed(1)}% {interviewRateDiff > 0 ? 'better' : 'worse'}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-2 rounded bg-muted/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Variant A</span>
                <span className="text-sm font-bold">{metricsA.interviewRate.toFixed(1)}%</span>
              </div>
              <Progress value={metricsA.interviewRate} className="h-2 [&>div]:bg-green-500" />
            </div>
            <div className="p-2 rounded bg-muted/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Variant B</span>
                <span className="text-sm font-bold">{metricsB.interviewRate.toFixed(1)}%</span>
              </div>
              <Progress value={metricsB.interviewRate} className="h-2 [&>div]:bg-green-500" />
            </div>
          </div>
        </div>

        {/* Average Response Time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 font-medium">
              <Clock className="h-4 w-4 text-amber-500" />
              Avg Time to Response
            </span>
            {timeDiff && (
              <Badge variant={timeDiff > 0 ? 'default' : 'secondary'} className="text-xs">
                A is {Math.abs(timeDiff).toFixed(0)}h {timeDiff > 0 ? 'faster' : 'slower'}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-2 rounded bg-muted/30 text-center">
              <span className="text-xs text-muted-foreground block">Variant A</span>
              <span className="text-lg font-bold">
                {metricsA.avgResponseTime > 0 ? `${Math.round(metricsA.avgResponseTime)}h` : '-'}
              </span>
            </div>
            <div className="p-2 rounded bg-muted/30 text-center">
              <span className="text-xs text-muted-foreground block">Variant B</span>
              <span className="text-lg font-bold">
                {metricsB.avgResponseTime > 0 ? `${Math.round(metricsB.avgResponseTime)}h` : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Sample Size */}
        <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
          <span className="text-muted-foreground">Sample Size</span>
          <div className="flex gap-4">
            <span>A: <strong>{metricsA.total}</strong> apps</span>
            <span>B: <strong>{metricsB.total}</strong> apps</span>
          </div>
        </div>

        {/* Minimum sample size warning */}
        {(metricsA.total < 10 || metricsB.total < 10) && (
          <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 text-amber-600 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Need at least 10 applications per variant for statistical significance</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
