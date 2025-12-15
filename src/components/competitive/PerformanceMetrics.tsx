import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PerformanceMetricsProps {
  data: any;
}

export function PerformanceMetrics({ data }: PerformanceMetricsProps) {
  if (!data) return null;

  const getSuccessIcon = (comparison: string) => {
    if (comparison?.includes('above')) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (comparison?.includes('below')) return <TrendingDown className="w-4 h-4 text-orange-600" />;
    return <Minus className="w-4 h-4 text-blue-600" />;
  };

  const getSuccessBadge = (comparison: string) => {
    if (comparison?.includes('above')) return 'default';
    if (comparison?.includes('below')) return 'destructive';
    return 'secondary';
  };

  const getPaceColor = (pace: string) => {
    switch (pace) {
      case 'fast': return 'text-green-600';
      case 'slow': return 'text-orange-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Application Volume</CardTitle>
            <CardDescription>Percentile rank vs. other applicants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{data.application_volume_percentile}th</span>
                <span className="text-sm text-muted-foreground">Percentile</span>
              </div>
              <Progress value={data.application_volume_percentile} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Network Strength</CardTitle>
            <CardDescription>Quality and size of professional network</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{data.network_strength_score}/100</span>
                <Badge variant="outline">Score</Badge>
              </div>
              <Progress value={data.network_strength_score} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Skill Relevance</CardTitle>
            <CardDescription>How well skills match market demand</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{data.skill_relevance_score}/100</span>
                <Badge variant="outline">Score</Badge>
              </div>
              <Progress value={data.skill_relevance_score} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Career Progression Pace</CardTitle>
            <CardDescription>Speed of career advancement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-full">
              <Badge variant="outline" className={`text-xl py-2 px-6 ${getPaceColor(data.career_progression_pace)}`}>
                {data.career_progression_pace?.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Success Rate vs. Industry</CardTitle>
          <CardDescription>How your outcomes compare to industry averages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <span className="font-medium">Overall Performance</span>
            <div className="flex items-center gap-2">
              {getSuccessIcon(data.success_rate_vs_industry)}
              <Badge variant={getSuccessBadge(data.success_rate_vs_industry) as any}>
                {data.success_rate_vs_industry}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
