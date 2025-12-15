import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, TrendingUp, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InterviewSuccessPredictionProps {
  interviewId: string;
  jobId: string;
}

export function InterviewSuccessPrediction({ interviewId, jobId }: InterviewSuccessPredictionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  const { data: prediction, isLoading } = useQuery({
    queryKey: ['interview-success-prediction', interviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_success_predictions')
        .select('*')
        .eq('interview_id', interviewId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Monitor changes to job match, company research, mock sessions, and questions
  useEffect(() => {
    if (!prediction) return;

    const channel = supabase
      .channel(`prediction-updates-${interviewId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_match_analyses',
          filter: `job_id=eq.${jobId}`
        },
        async () => {
          // Job match updated, recalculate prediction
          await autoRecalculate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_research',
          filter: `job_id=eq.${jobId}`
        },
        async () => {
          // Company research updated, recalculate prediction
          await autoRecalculate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mock_interview_sessions',
          filter: `interview_id=eq.${interviewId}`
        },
        async () => {
          // Mock session added/updated, recalculate prediction
          await autoRecalculate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interview_question_responses',
          filter: `interview_id=eq.${interviewId}`
        },
        async () => {
          // Question responses updated, recalculate prediction
          await autoRecalculate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interviews',
          filter: `id=eq.${interviewId}`
        },
        async () => {
          // Interview preparation tasks updated, recalculate prediction
          await autoRecalculate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [interviewId, jobId, prediction]);

  const autoRecalculate = async () => {
    if (isAutoRefreshing) return;
    
    setIsAutoRefreshing(true);
    try {
      await calculateMutation.mutateAsync();
    } catch (error) {
      console.error('Auto-recalculation failed:', error);
    } finally {
      setIsAutoRefreshing(false);
    }
  };

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('calculate-interview-success', {
        body: { interviewId, jobId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-success-prediction', interviewId] });
      if (!isAutoRefreshing) {
        toast({
          title: "Success Probability Calculated",
          description: "Your interview success prediction is ready.",
        });
      }
    },
    onError: (error: any) => {
      if (!isAutoRefreshing) {
        toast({
          title: "Calculation Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const getConfidenceBadge = (level: string) => {
    const colors = {
      low: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      medium: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      high: 'bg-green-500/10 text-green-500 border-green-500/20'
    };
    return colors[level as keyof typeof colors] || colors.medium;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Interview Success Prediction
          {isAutoRefreshing && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
          )}
        </CardTitle>
        <CardDescription>
          AI-powered analysis of your preparation and success probability
          {prediction && (
            <span className="text-xs block mt-1">
              • Auto-updates when you complete tasks, practice, or research
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!prediction ? (
          <div className="text-center space-y-4 py-8">
            <Sparkles className="h-12 w-12 mx-auto text-primary" />
            <p className="text-muted-foreground">
              Generate your interview success prediction based on your preparation level, role match, and practice hours.
            </p>
            <Button
              onClick={() => calculateMutation.mutate()}
              disabled={calculateMutation.isPending}
            >
              {calculateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Calculate Success Probability
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{prediction.overall_probability}%</h3>
                    <p className="text-sm text-muted-foreground">Success Probability</p>
                  </div>
                  <Badge variant="outline" className={getConfidenceBadge(prediction.confidence_level)}>
                    {prediction.confidence_level} confidence
                  </Badge>
                </div>
                <Progress value={prediction.overall_probability} className="h-3" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Role Match</span>
                    <span className={getScoreColor(prediction.role_match_score || 0)}>
                      {prediction.role_match_score || 0}%
                    </span>
                  </div>
                  <Progress value={prediction.role_match_score || 0} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Preparation Level</span>
                    <span className={getScoreColor(prediction.preparation_score || 0)}>
                      {prediction.preparation_score || 0}%
                    </span>
                  </div>
                  <Progress value={prediction.preparation_score || 0} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Company Research</span>
                    <span className={getScoreColor(prediction.company_research_score || 0)}>
                      {prediction.company_research_score || 0}%
                    </span>
                  </div>
                  <Progress value={prediction.company_research_score || 0} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Practice Hours</span>
                    <span className={getScoreColor(prediction.practice_hours_score || 0)}>
                      {prediction.practice_hours_score || 0}%
                    </span>
                  </div>
                  <Progress value={prediction.practice_hours_score || 0} />
                </div>
              </div>

              {(prediction as any).historical_success_rate !== null && (prediction as any).historical_success_rate !== undefined && (
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-semibold mb-3">Historical Performance</h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                      <p className="text-2xl font-bold">{(prediction as any).historical_success_rate}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Performance Trend</p>
                      <div className="flex items-center gap-2 mt-1">
                        {(prediction as any).performance_trend === 'improving' && (
                          <>
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            <span className="text-sm font-semibold text-green-600">Improving</span>
                          </>
                        )}
                        {(prediction as any).performance_trend === 'declining' && (
                          <>
                            <TrendingUp className="h-5 w-5 text-red-600 rotate-180" />
                            <span className="text-sm font-semibold text-red-600">Declining</span>
                          </>
                        )}
                        {(prediction as any).performance_trend === 'stable' && (
                          <>
                            <span className="text-sm font-semibold text-muted-foreground">Stable</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Based on your past interview outcomes. Your current preparation is factored against this baseline.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Strength Areas
                </h4>
                <ul className="space-y-2">
                  {(prediction.strength_areas as string[] || []).map((strength: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Prioritized Actions
                </h4>
                <div className="space-y-3">
                  {(prediction.prioritized_actions as string[] || []).map((action: string, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg border bg-primary/5 border-primary/20">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5">{idx + 1}</Badge>
                        <span className="text-sm flex-1">{action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Areas for Improvement
                </h4>
                <ul className="space-y-2">
                  {(prediction.weakness_areas as string[] || []).map((weakness: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold">All Recommendations</h4>
                <ul className="space-y-2">
                  {(prediction.improvement_recommendations as string[] || []).map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-muted">
                <h4 className="font-semibold mb-2">Predicted Outcome</h4>
                <p className="text-sm capitalize">{prediction.predicted_outcome}</p>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {prediction && (
          <Button
            onClick={() => calculateMutation.mutate()}
            disabled={calculateMutation.isPending}
            variant="outline"
            className="w-full"
          >
            {calculateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Recalculate Prediction
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
