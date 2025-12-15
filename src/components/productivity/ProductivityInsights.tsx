import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Lightbulb, Clock, TrendingUp, AlertTriangle, Target, Check, Loader2, Sparkles } from "lucide-react";

interface ProductivityInsightsProps {
  insights: any[];
  entries: any[];
  metrics: any[];
}

export function ProductivityInsights({ insights, entries, metrics }: ProductivityInsightsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const generateInsights = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('analyze-productivity', {
        body: { periodDays: 30 }
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productivity-insights'] });
      toast.success("Productivity insights generated!");
    },
    onError: (error) => {
      toast.error("Failed to generate insights");
      console.error(error);
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from('productivity_insights')
        .update({ 
          acknowledged: true, 
          acknowledged_at: new Date().toISOString() 
        })
        .eq('id', insightId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productivity-insights'] });
      toast.success("Insight acknowledged");
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'time_allocation': return Clock;
      case 'productivity_pattern': return TrendingUp;
      case 'burnout_warning': return AlertTriangle;
      case 'efficiency_tip': return Lightbulb;
      case 'schedule_optimization': return Target;
      default: return Sparkles;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateInsights.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Productivity Coach</CardTitle>
              <CardDescription>
                Get personalized recommendations to optimize your job search
              </CardDescription>
            </div>
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || entries.length < 5}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {entries.length < 5 && (
        <Card className="border-2 border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-background dark:from-orange-950/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
                  <Target className="h-8 w-8 text-orange-500" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-2">
                  Track at least 5 activities to unlock AI-powered productivity insights
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Current progress: {entries.length}/5 activities tracked
                </p>
              </div>
              <Button
                onClick={() => {
                  // Simply navigate with URL parameters - the Stats page will handle opening the right tabs
                  navigate('/stats?tab=productivity&subtab=tracking');
                }}
                variant="default"
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
              >
                <Clock className="h-4 w-4 mr-2" />
                Start Tracking Activities
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {insights.length === 0 && entries.length >= 5 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No insights yet. Click "Generate Insights" to get personalized recommendations!
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {insights
          .filter((insight) => !insight.acknowledged)
          .map((insight) => {
            const Icon = getIcon(insight.insight_type);
            return (
              <Card key={insight.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{insight.insight_title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getPriorityColor(insight.priority)}>
                            {insight.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(insight.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => acknowledgeMutation.mutate(insight.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {insight.insight_description}
                  </p>
                  {insight.recommendations && insight.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Recommended Actions:</p>
                      <ul className="space-y-2">
                        {insight.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
      </div>

      {insights.some((i) => i.acknowledged) && (
        <Card>
          <CardHeader>
            <CardTitle>Acknowledged Insights</CardTitle>
            <CardDescription>Previously reviewed recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights
                .filter((insight) => insight.acknowledged)
                .map((insight) => (
                  <div key={insight.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{insight.insight_title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(insight.acknowledged_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
