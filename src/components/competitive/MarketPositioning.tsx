import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, CheckCircle2, AlertCircle } from "lucide-react";

interface MarketPositioningProps {
  data: any;
}

export function MarketPositioning({ data }: MarketPositioningProps) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Career Tier Progression
          </CardTitle>
          <CardDescription>Your current and target market positioning</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Current Tier</div>
              <Badge variant="outline" className="text-lg py-1 px-4">
                {data.current_tier?.toUpperCase()}
              </Badge>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Target Tier</div>
              <Badge variant="default" className="text-lg py-1 px-4">
                {data.target_tier?.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Positioning Strategy</h4>
            <p className="text-sm text-muted-foreground">{data.positioning_strategy}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            Competitive Advantages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.competitive_advantages?.map((advantage: string, index: number) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{advantage}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <AlertCircle className="w-5 h-5" />
            Areas for Improvement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.areas_for_improvement?.map((area: string, index: number) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{area}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
