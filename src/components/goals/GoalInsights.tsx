import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Insight {
  id: string;
  insight_type: string;
  insight_title: string;
  insight_description: string;
  action_items: any;
  generated_at: string;
}

interface GoalInsightsProps {
  insights: Insight[];
  goals: any[];
}

export function GoalInsights({ insights, goals }: GoalInsightsProps) {
  const queryClient = useQueryClient();

  const acknowledgeInsight = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('goal_insights')
        .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-insights'] });
      toast.success("Insight acknowledged");
    }
  });

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success_pattern':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'adjustment_recommendation':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'motivation':
        return <Lightbulb className="h-5 w-5 text-purple-500" />;
      case 'accountability':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <Lightbulb className="h-5 w-5" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success_pattern':
        return 'bg-green-100 dark:bg-green-950/20 border-green-200 dark:border-green-800';
      case 'adjustment_recommendation':
        return 'bg-yellow-100 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800';
      case 'motivation':
        return 'bg-purple-100 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800';
      case 'accountability':
        return 'bg-blue-100 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800';
      default:
        return '';
    }
  };

  if (!insights || insights.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No new insights yet. Continue tracking your goals to receive personalized recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight) => (
        <Card key={insight.id} className={getInsightColor(insight.insight_type)}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {getInsightIcon(insight.insight_type)}
                <div className="space-y-2 flex-1">
                  <CardTitle className="text-lg leading-relaxed">{insight.insight_title}</CardTitle>
                  <Badge variant="secondary">
                    {insight.insight_type.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => acknowledgeInsight.mutate(insight.id)}
                className="flex-shrink-0"
              >
                Acknowledge
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">{insight.insight_description}</p>
            
            {insight.action_items && Array.isArray(insight.action_items) && insight.action_items.length > 0 && (
              <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
                <p className="text-sm font-medium mb-3">Recommended Actions:</p>
                <ul className="list-disc list-inside space-y-2">
                  {insight.action_items.map((item: string, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground leading-relaxed ml-1">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground pt-2">
              Generated {new Date(insight.generated_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}