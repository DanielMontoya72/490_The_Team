import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PeerComparisonProps {
  data: any;
}

export function PeerComparison({ data }: PeerComparisonProps) {
  if (!data) return null;

  const getComparisonIcon = (comparison: string) => {
    if (comparison?.includes('above')) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (comparison?.includes('below')) return <TrendingDown className="w-4 h-4 text-orange-600" />;
    return <Minus className="w-4 h-4 text-blue-600" />;
  };

  const getComparisonBadge = (comparison: string) => {
    if (comparison?.includes('above')) return 'default';
    if (comparison?.includes('below')) return 'destructive';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comparison vs. Average Applicant</CardTitle>
          <CardDescription>How you compare to typical job seekers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(data.vs_average_applicant || {}).map(([key, value]: [string, any]) => (
            <div key={key} className="border-b last:border-0 pb-4 last:pb-0">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium capitalize">{key.replace('_', ' ')}</span>
                <div className="flex items-center gap-2">
                  {getComparisonIcon(value)}
                  <Badge variant={getComparisonBadge(value) as any}>
                    {value?.split(' - ')[0]}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{value?.split(' - ')[1]}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comparison vs. Top Performers</CardTitle>
          <CardDescription>Gaps to close to reach top-tier status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(data.vs_top_performers || {}).map(([key, value]: [string, any]) => (
            <div key={key} className="space-y-2">
              <h4 className="font-semibold capitalize">{key.replace('_', ' ')}</h4>
              <p className="text-sm text-muted-foreground">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
