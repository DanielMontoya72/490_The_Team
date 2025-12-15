import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, CheckCircle2, Clock, Zap, Star } from "lucide-react";
import { toast } from "sonner";

interface Insight {
  id: string;
  insight_type: string;
  industry: string;
  insight_title: string;
  insight_description: string;
  recommendations: any;
  priority_level: string;
  action_items: any;
  impact_assessment: string;
  timeframe: string;
  acknowledged: boolean;
  is_favorited: boolean;
}

interface CareerInsightsProps {
  insights: Insight[];
}

export function CareerInsights({ insights }: CareerInsightsProps) {
  const queryClient = useQueryClient();

  const acknowledgeInsight = useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from('market_insights')
        .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
        .eq('id', insightId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-insights'] });
      toast.success("Insight acknowledged!");
    }
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, isFavorited }: { id: string; isFavorited: boolean }) => {
      const { error } = await supabase
        .from('market_insights')
        .update({ 
          is_favorited: !isFavorited,
          favorited_at: !isFavorited ? new Date().toISOString() : null
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-insights'] });
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getTimeframeIcon = (timeframe: string) => {
    switch (timeframe) {
      case 'immediate': return <Zap className="h-4 w-4" />;
      case 'short_term': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (!insights || insights.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Generate market intelligence to receive personalized career insights
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight) => (
        <Card key={insight.id} className={insight.priority_level === 'critical' ? 'border-red-500' : ''}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  {insight.insight_title}
                </CardTitle>
                <CardDescription className="mt-2">
                  {insight.industry} • {insight.insight_type.replace('_', ' ')}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge className={getPriorityColor(insight.priority_level)}>
                  {insight.priority_level}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  {getTimeframeIcon(insight.timeframe)}
                  {insight.timeframe?.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{insight.insight_description}</p>

            {insight.impact_assessment && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm font-medium mb-1">💡 Expected Impact</p>
                <p className="text-sm text-muted-foreground">{insight.impact_assessment}</p>
              </div>
            )}

            {insight.action_items && Array.isArray(insight.action_items) && insight.action_items.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">📋 Recommended Actions</p>
                <ul className="space-y-2">
                  {insight.action_items.map((action: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFavorite.mutate({ id: insight.id, isFavorited: insight.is_favorited })}
                disabled={toggleFavorite.isPending}
              >
                <Star className={`h-4 w-4 mr-2 ${insight.is_favorited ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                {insight.is_favorited ? "Favorited" : "Add to Favorites"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => acknowledgeInsight.mutate(insight.id)}
                disabled={acknowledgeInsight.isPending}
              >
                {acknowledgeInsight.isPending ? "Acknowledging..." : "Acknowledge & Dismiss"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
