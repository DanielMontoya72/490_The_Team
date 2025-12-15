import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle } from "lucide-react";

interface CompetitivePositioningProps {
  data: any;
}

export function CompetitivePositioning({ data }: CompetitivePositioningProps) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Overall Competitive Position</CardTitle>
          <CardDescription>Your current standing in the job market</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Score</span>
              <span className="text-2xl font-bold">{data.overall_score}/100</span>
            </div>
            <Progress value={data.overall_score} className="h-3" />
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Market Position</div>
            <Badge variant="outline" className="text-lg py-1 px-3">
              {data.market_position?.toUpperCase()}
            </Badge>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400">Key Strengths</h4>
            <div className="space-y-2">
              {data.strengths?.map((strength: string, index: number) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{strength}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-orange-600 dark:text-orange-400">Areas for Improvement</h4>
            <div className="space-y-2">
              {data.weaknesses?.map((weakness: string, index: number) => (
                <div key={index} className="flex items-start gap-2">
                  <XCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{weakness}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Unique Value Proposition</h4>
            <p className="text-sm text-muted-foreground">{data.unique_value_proposition}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
