import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, TrendingUp, AlertCircle, Lightbulb, Clock, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ResponseCoachingProps {
  questionId: string;
  questionText: string;
  questionCategory: string;
  currentResponse?: string;
}

export const ResponseCoaching = ({ 
  questionId, 
  questionText, 
  questionCategory,
  currentResponse = ''
}: ResponseCoachingProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [response, setResponse] = useState(currentResponse);
  const [isCoaching, setIsCoaching] = useState(false);
  const [coachingData, setCoachingData] = useState<any>(null);

  // Fetch previous coaching feedback
  const { data: coachingHistory } = useQuery({
    queryKey: ['coaching-feedback', questionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('response_coaching_feedback')
        .select('*')
        .eq('question_response_id', questionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Get coaching feedback
  const getCoaching = useMutation({
    mutationFn: async (responseText: string) => {
      setIsCoaching(true);
      const { data, error } = await supabase.functions.invoke('coach-interview-response', {
        body: { 
          questionId, 
          responseText,
          questionText,
          questionCategory
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setCoachingData(data);
      queryClient.invalidateQueries({ queryKey: ['coaching-feedback', questionId] });
      toast({
        title: "Feedback Generated",
        description: "Your response has been analyzed. Review the coaching feedback below.",
      });
      setIsCoaching(false);
    },
    onError: (error: any) => {
      toast({
        title: "Coaching Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsCoaching(false);
    },
  });

  const latestFeedback = coachingHistory?.[0];
  const wordCount = response.trim().split(/\s+/).length;
  const estimatedSeconds = Math.round((wordCount / 150) * 60); // Average speaking rate

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Response Coaching
          </CardTitle>
          <CardDescription>
            Write your response and get AI-powered feedback to improve your answer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium">Your Response</p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{wordCount} words</span>
                <span>~{estimatedSeconds}s</span>
              </div>
            </div>
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Write your interview response here..."
              className="min-h-[200px]"
            />
          </div>

          <Button
            onClick={() => getCoaching.mutate(response)}
            disabled={!response.trim() || isCoaching}
            className="w-full"
          >
            {isCoaching ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                Analyzing Response...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Get AI Coaching Feedback
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {latestFeedback && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coaching Feedback</CardTitle>
            <CardDescription>
              Practice #{latestFeedback.practice_number} • {new Date(latestFeedback.created_at).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Scores */}
            <div>
              <h4 className="font-medium mb-4">Performance Scores</h4>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(latestFeedback.scores as any).map(([key, value]: [string, any]) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm capitalize">{key.replace('_', ' ')}</span>
                      <span className={`text-sm font-bold ${getScoreColor(value)}`}>{value}/100</span>
                    </div>
                    <Progress value={value} className="h-2" />
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback Tabs */}
            <Tabs defaultValue="feedback" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="feedback">Feedback</TabsTrigger>
                <TabsTrigger value="suggestions">Improve</TabsTrigger>
                <TabsTrigger value="language">Language</TabsTrigger>
                <TabsTrigger value="alternatives">Alternatives</TabsTrigger>
                <TabsTrigger value="star">STAR</TabsTrigger>
              </TabsList>

              <TabsContent value="feedback" className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h5 className="text-sm font-medium mb-1">Content</h5>
                    <p className="text-sm text-muted-foreground">{(latestFeedback.feedback as any)?.content}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium mb-1">Structure</h5>
                    <p className="text-sm text-muted-foreground">{(latestFeedback.feedback as any)?.structure}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium mb-1">Clarity</h5>
                    <p className="text-sm text-muted-foreground">{(latestFeedback.feedback as any)?.clarity}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium mb-1">Overall</h5>
                    <p className="text-sm text-muted-foreground">{(latestFeedback.feedback as any)?.overall}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="suggestions" className="space-y-3">
                {(latestFeedback.improvement_suggestions as string[])?.map((suggestion, idx) => (
                  <div key={idx} className="flex gap-3 p-3 rounded-lg bg-muted">
                    <Target className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{suggestion}</span>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="language" className="space-y-3">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">
                    Weak language patterns identified and stronger alternatives
                  </p>
                  {(coachingData?.weakPatterns || []).map((pattern: any, idx: number) => (
                    <Card key={idx}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                              <span className="text-sm font-medium">Weak Pattern</span>
                            </div>
                            <p className="text-sm text-muted-foreground pl-6">{pattern.pattern}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingUp className="h-4 w-4 text-green-500" />
                              <span className="text-sm font-medium">Stronger Alternative</span>
                            </div>
                            <p className="text-sm text-muted-foreground pl-6">{pattern.replacement}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!coachingData?.weakPatterns || coachingData.weakPatterns.length === 0) && (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No weak patterns identified. Great job!</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="alternatives" className="space-y-3">
                {(latestFeedback.alternative_approaches as any[])?.map((alt, idx) => (
                  <Card key={idx}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        {alt.approach}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{alt.example}</p>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="star" className="space-y-4">
                {latestFeedback.star_adherence && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(latestFeedback.star_adherence as any)
                        .filter(([key]) => key.endsWith('_score'))
                        .map(([key, value]: [string, any]) => (
                          <div key={key}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm capitalize">{key.replace('_score', '')}</span>
                              <span className={`text-sm font-bold ${getScoreColor(value)}`}>{value}/100</span>
                            </div>
                            <Progress value={value} className="h-2" />
                          </div>
                        ))}
                    </div>
                    <div>
                      <h5 className="text-sm font-medium mb-2">Analysis</h5>
                      <p className="text-sm text-muted-foreground">
                        {(latestFeedback.star_adherence as any)?.analysis}
                      </p>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Coaching History */}
      {coachingHistory && coachingHistory.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Practice History
            </CardTitle>
            <CardDescription>
              Track your improvement across {coachingHistory.length} practice sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {coachingHistory.slice(1).map((feedback, idx) => (
                <AccordionItem key={feedback.id} value={feedback.id}>
                  <AccordionTrigger>
                    <div className="flex items-center justify-between w-full pr-4">
                      <span>Practice #{feedback.practice_number}</span>
                      <Badge variant="outline">
                        Score: {(feedback.scores as any)?.overall || 0}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      <p className="text-sm text-muted-foreground">
                        {(feedback.feedback as any)?.overall}
                      </p>
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {Object.entries(feedback.scores as any).slice(0, 4).map(([key, value]: [string, any]) => (
                          <div key={key} className="text-center">
                            <div className="text-xs text-muted-foreground capitalize mb-1">
                              {key.replace('_', ' ')}
                            </div>
                            <div className={`font-bold ${getScoreColor(value)}`}>{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
};