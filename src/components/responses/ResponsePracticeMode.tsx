import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Play, RotateCcw, Lightbulb, Target, Clock, Award } from "lucide-react";

export function ResponsePracticeMode() {
  const [selectedResponseId, setSelectedResponseId] = useState<string>("");
  const [practiceResponse, setPracticeResponse] = useState("");
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [feedback, setFeedback] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: responses } = useQuery({
    queryKey: ['response-library'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('interview_response_library')
        .select('*')
        .eq('user_id', user.id)
        .order('question_type', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const selectedResponse = responses?.find(r => r.id === selectedResponseId);

  const practiceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedResponse) throw new Error('No response selected');

      const { data, error } = await supabase.functions.invoke('analyze-practice-response', {
        body: {
          question: selectedResponse.question,
          questionType: selectedResponse.question_type,
          practiceResponse,
          bestResponse: selectedResponse.current_response,
          timeSpentSeconds: timeElapsed,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      setFeedback(data);
      
      // Save practice session
      const { data: { user } } = await supabase.auth.getUser();
      if (user && selectedResponse) {
        await supabase.from('response_practice_sessions').insert({
          user_id: user.id,
          response_id: selectedResponse.id,
          question: selectedResponse.question,
          question_type: selectedResponse.question_type,
          practice_response: practiceResponse,
          ai_feedback: data.feedback,
          scores: data.scores,
          time_spent_seconds: timeElapsed,
        });
      }
      
      toast.success('Practice session analyzed');
    },
    onError: () => toast.error('Failed to analyze response'),
  });

  const startPractice = () => {
    setPracticeResponse("");
    setFeedback(null);
    setTimeElapsed(0);
    setIsTimerRunning(true);
    
    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    // Store interval ID to clear later
    (window as any).practiceInterval = interval;
  };

  const stopPractice = () => {
    setIsTimerRunning(false);
    clearInterval((window as any).practiceInterval);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Practice Mode
          </CardTitle>
          <CardDescription>
            Practice your responses and get AI feedback on quality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select a question to practice</label>
            <Select value={selectedResponseId} onValueChange={setSelectedResponseId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a question..." />
              </SelectTrigger>
              <SelectContent>
                {responses?.map(response => (
                  <SelectItem key={response.id} value={response.id}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {response.question_type}
                      </Badge>
                      <span className="truncate max-w-md">{response.question}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedResponse && (
            <>
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium mb-2">Question:</p>
                <p className="text-muted-foreground">{selectedResponse.question}</p>
              </div>

              {!isTimerRunning && !feedback && (
                <Button onClick={startPractice} className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  Start Practice Session
                </Button>
              )}

              {isTimerRunning && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-lg font-mono">
                      <Clock className="h-5 w-5" />
                      {formatTime(timeElapsed)}
                    </div>
                    <Badge variant={timeElapsed > 120 ? "destructive" : "secondary"}>
                      {timeElapsed > 120 ? "Over 2 min" : "On track"}
                    </Badge>
                  </div>
                  
                  <Textarea
                    value={practiceResponse}
                    onChange={(e) => setPracticeResponse(e.target.value)}
                    placeholder="Type your response here... Use the STAR method (Situation, Task, Action, Result)"
                    rows={8}
                    autoFocus
                  />

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        stopPractice();
                        practiceMutation.mutate();
                      }}
                      disabled={!practiceResponse || practiceMutation.isPending}
                      className="flex-1"
                    >
                      {practiceMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Award className="h-4 w-4 mr-2" />
                      )}
                      Get Feedback
                    </Button>
                    <Button variant="outline" onClick={stopPractice}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {feedback && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(feedback.scores || {}).map(([key, value]) => (
                      <Card key={key}>
                        <CardContent className="pt-4 text-center">
                          <p className="text-xs text-muted-foreground uppercase mb-1">
                            {key.replace(/_/g, ' ')}
                          </p>
                          <p className={`text-2xl font-bold ${getScoreColor(value as number)}`}>
                            {Math.round((value as number) * 100)}%
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        AI Feedback
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{feedback.feedback}</p>
                    </CardContent>
                  </Card>

                  {feedback.improvements && feedback.improvements.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Suggested Improvements</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside space-y-1">
                          {feedback.improvements.map((improvement: string, idx: number) => (
                            <li key={idx} className="text-sm text-muted-foreground">
                              {improvement}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  <Button onClick={startPractice} variant="outline" className="w-full">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Practice Again
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
