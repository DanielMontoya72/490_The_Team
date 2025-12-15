import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Clock } from "lucide-react";

interface DifferentiationStrategiesProps {
  data: any[];
}

export function DifferentiationStrategies({ data }: DifferentiationStrategiesProps) {
  if (!data || data.length === 0) return null;

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getTimeframeColor = (timeframe: string) => {
    switch (timeframe) {
      case 'immediate': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'short-term': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {data.map((strategy, index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  {strategy.strategy}
                </CardTitle>
                <CardDescription className="mt-2">{strategy.description}</CardDescription>
              </div>
              <div className="flex flex-col gap-2">
                <Badge className={getImpactColor(strategy.expected_impact)}>
                  {strategy.expected_impact} impact
                </Badge>
                <Badge className={getTimeframeColor(strategy.timeframe)}>
                  <Clock className="w-3 h-3 mr-1" />
                  {strategy.timeframe}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <h4 className="font-semibold mb-3">Implementation Steps</h4>
            <ol className="space-y-2">
              {strategy.implementation_steps?.map((step: string, stepIndex: number) => (
                <li key={stepIndex} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                    {stepIndex + 1}
                  </span>
                  <span className="text-sm pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
