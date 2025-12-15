import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckSquare } from "lucide-react";

interface SkillGapsComparisonProps {
  data: any[];
}

export function SkillGapsComparison({ data }: SkillGapsComparisonProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckSquare className="w-12 h-12 mx-auto mb-4 text-green-600" />
          <p className="text-muted-foreground">No significant skill gaps identified</p>
        </CardContent>
      </Card>
    );
  }

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {data.map((gap, index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg">{gap.skill}</CardTitle>
              <Badge variant={getImportanceBadge(gap.importance) as any}>
                {gap.importance}
              </Badge>
            </div>
            <CardDescription>{gap.market_demand}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">Estimated Learning Time</div>
              <div className="flex items-center gap-2">
                <Progress value={(gap.estimated_time_weeks / 52) * 100} className="flex-1" />
                <span className="text-sm font-semibold">{gap.estimated_time_weeks}w</span>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Learning Path</div>
              <ol className="space-y-1.5">
                {gap.learning_path?.map((step: string, stepIndex: number) => (
                  <li key={stepIndex} className="text-sm text-muted-foreground flex gap-2">
                    <span className="font-medium">{stepIndex + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
