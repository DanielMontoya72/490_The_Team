import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, Clock, TrendingUp, CheckCircle2, AlertCircle, Lightbulb, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WritingPracticeSessionProps {
  jobId?: string;
  interviewId?: string;
}

const PRACTICE_QUESTIONS = [
  // Self-Introduction & Background
  "Tell me about yourself and your background.",
  "Walk me through your resume and highlight key experiences.",
  "What's your professional story in 2 minutes?",
  
  // Motivation & Interest
  "Why are you interested in this position?",
  "What attracted you to our company?",
  "Why are you looking to leave your current role?",
  "What motivates you in your career?",
  
  // Experience & Projects
  "Describe a challenging project you worked on and how you overcame obstacles.",
  "Tell me about your most significant professional achievement.",
  "Describe a time when you had to learn something new quickly.",
  "Share an example of a project that didn't go as planned and how you handled it.",
  
  // Teamwork & Collaboration
  "How do you handle conflict in a team environment?",
  "Describe your experience working in cross-functional teams.",
  "Tell me about a time you had to influence others without authority.",
  "Give an example of how you've built strong working relationships.",
  
  // Strengths & Weaknesses
  "What are your greatest strengths and how have you applied them?",
  "What areas are you currently working to improve?",
  "How would your colleagues describe you?",
  
  // Problem-Solving & Decision Making
  "Tell me about a time you failed and what you learned from it.",
  "Describe a difficult decision you had to make and your process.",
  "How do you approach solving complex problems?",
  "Give an example of when you had to make a quick decision with limited information.",
  
  // Leadership & Initiative
  "Describe a time when you took initiative on a project.",
  "Tell me about your leadership style and philosophy.",
  "How do you handle giving and receiving feedback?",
  
  // Future Goals & Fit
  "Where do you see yourself in five years?",
  "Why should we hire you over other candidates?",
  "What questions do you have for us?",
  "How does this role align with your career goals?"
];

export function WritingPracticeSession({ jobId, interviewId }: WritingPracticeSessionProps) {
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Fetch all previous feedback for progress tracking
  const { data: previousSessions } = useQuery({
    queryKey: ['response-coaching-history', jobId || interviewId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('response_coaching_feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      return data || [];
    },
    enabled: sessionStarted
  });

  const startSession = (question?: string) => {
    const selectedQuestion = question || PRACTICE_QUESTIONS[Math.floor(Math.random() * PRACTICE_QUESTIONS.length)];
    setCurrentQuestion(selectedQuestion);
    setResponse("");
    setTimeElapsed(0);
    setIsTimerRunning(true);
    setFeedback(null);
    setSessionStarted(true);
  };

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call AI function to analyze response
      const { data, error } = await supabase.functions.invoke('analyze-written-response', {
        body: {
          question: currentQuestion,
          response: response,
          timeSpentSeconds: timeElapsed,
          previousSessions: previousSessions || []
        }
      });

      if (error) throw error;

      // Save feedback to database
      await supabase.from('response_coaching_feedback').insert({
        user_id: user.id,
        mock_session_id: interviewId || null,
        question_response_id: null,
        response_text: response,
        feedback: {
          question: currentQuestion,
          time_spent: timeElapsed,
          ...data
        },
        scores: {
          overall_score: data.overall_score,
          clarity_score: data.clarity_score,
          professionalism_score: data.professionalism_score,
          structure_score: data.structure_score,
          storytelling_score: data.storytelling_score
        }
      });

      return data;
    },
    onSuccess: (data) => {
      setFeedback(data);
      setIsTimerRunning(false);
      toast({
        title: "Analysis Complete",
        description: `Overall Score: ${data.overall_score}/100`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (!sessionStarted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Interview Response Writing Practice
          </CardTitle>
          <CardDescription>
            Practice writing responses with timed exercises and receive detailed AI feedback
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-3">Choose a Practice Question</h3>
            <div className="grid gap-2">
              {PRACTICE_QUESTIONS.slice(0, 4).map((question, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="justify-start text-left h-auto py-3"
                  onClick={() => startSession(question)}
                >
                  <span className="text-sm">{question}</span>
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={() => startSession()} className="w-full">
            Start Random Practice Question
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!feedback) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Writing Practice Session
            </CardTitle>
            <Badge variant={isTimerRunning ? "default" : "secondary"}>
              {formatTime(timeElapsed)}
            </Badge>
          </div>
          <CardDescription>{currentQuestion}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="response">Your Response</Label>
            <Textarea
              id="response"
              placeholder="Type your response here..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={12}
              className="resize-none"
            />
            <div className="text-sm text-muted-foreground">
              {response.split(/\s+/).filter(w => w).length} words
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending || !response.trim()}
              className="flex-1"
            >
              {analyzeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Get Feedback
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsTimerRunning(false);
                setSessionStarted(false);
                setResponse("");
                setTimeElapsed(0);
              }}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Your Feedback
        </CardTitle>
        <CardDescription>Analysis of your response</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="scores" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scores">Scores</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="tips">Tips</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="scores" className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Score</span>
                  <span className={`text-2xl font-bold ${getScoreColor(feedback.overall_score)}`}>
                    {feedback.overall_score}/100
                  </span>
                </div>
                <Progress value={feedback.overall_score} className="h-2" />
              </div>

              <Separator />

              {[
                { label: 'Clarity', score: feedback.clarity_score },
                { label: 'Professionalism', score: feedback.professionalism_score },
                { label: 'Structure', score: feedback.structure_score },
                { label: 'Storytelling', score: feedback.storytelling_score }
              ].map(({ label, score }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{label}</span>
                    <span className={`font-semibold ${getScoreColor(score)}`}>
                      {score}/100
                    </span>
                  </div>
                  <Progress value={score} className="h-1.5" />
                </div>
              ))}
            </div>

            {feedback.progress_analysis && (
              <div className="mt-4 p-4 rounded-lg bg-muted">
                <h4 className="font-semibold mb-2 text-sm">Progress Comparison</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {feedback.progress_analysis}
                </p>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Completed in {formatTime(timeElapsed)} • {response.split(/\s+/).filter(w => w).length} words
            </div>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Strengths
              </h3>
              <ul className="space-y-1.5">
                {(feedback.strengths || []).map((strength: string, idx: number) => (
                  <li key={idx} className="text-sm text-muted-foreground pl-6">
                    • {strength}
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                Areas for Improvement
              </h3>
              <ul className="space-y-1.5">
                {(feedback.improvements || []).map((improvement: string, idx: number) => (
                  <li key={idx} className="text-sm text-muted-foreground pl-6">
                    • {improvement}
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Rewritten Example</h3>
              <div className="p-4 rounded-lg bg-muted text-sm whitespace-pre-line">
                {feedback.rewritten_example}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tips" className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Communication Tips
              </h3>
              <ul className="space-y-2">
                {(feedback.communication_tips || []).map((tip: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">{idx + 1}</Badge>
                    <span className="text-sm">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Managing Interview Nerves</h3>
              <ul className="space-y-2">
                {(feedback.nerve_management_tips || []).map((tip: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            {previousSessions && previousSessions.length > 0 ? (
              <>
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Your Improvement Journey
                  </h3>
                  <div className="space-y-3">
                    {previousSessions.slice(0, 5).map((session: any, idx: number) => {
                      const sessionScores = session.scores || {};
                      const sessionDate = new Date(session.created_at).toLocaleDateString();
                      
                      return (
                        <div key={session.id} className="p-4 rounded-lg border bg-card">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Session {previousSessions.length - idx}</span>
                            <span className="text-xs text-muted-foreground">{sessionDate}</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Overall</span>
                              <span className={`font-semibold ${getScoreColor(sessionScores.overall_score || 0)}`}>
                                {sessionScores.overall_score || 0}/100
                              </span>
                            </div>
                            <Progress value={sessionScores.overall_score || 0} className="h-1.5" />
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div>Clarity: {sessionScores.clarity_score || 0}</div>
                              <div>Structure: {sessionScores.structure_score || 0}</div>
                              <div>Professional: {sessionScores.professionalism_score || 0}</div>
                              <div>Story: {sessionScores.storytelling_score || 0}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {feedback.comparison_analysis && (
                  <div className="p-4 rounded-lg bg-muted">
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Session Comparison Analysis
                    </h4>
                    <div className="text-sm space-y-2">
                      {feedback.comparison_analysis.improvement_areas && (
                        <div>
                          <span className="font-medium text-green-600">✓ Improvements:</span>
                          <p className="text-muted-foreground mt-1">
                            {feedback.comparison_analysis.improvement_areas}
                          </p>
                        </div>
                      )}
                      {feedback.comparison_analysis.areas_needing_work && (
                        <div>
                          <span className="font-medium text-yellow-600">⚡ Focus Areas:</span>
                          <p className="text-muted-foreground mt-1">
                            {feedback.comparison_analysis.areas_needing_work}
                          </p>
                        </div>
                      )}
                      {feedback.comparison_analysis.trend_summary && (
                        <div>
                          <span className="font-medium">📈 Trend:</span>
                          <p className="text-muted-foreground mt-1">
                            {feedback.comparison_analysis.trend_summary}
                          </p>
                        </div>
                      )}
                      {feedback.comparison_analysis.recommendations && (
                        <div>
                          <span className="font-medium text-primary">💡 Recommendations:</span>
                          <ul className="mt-1 space-y-1">
                            {feedback.comparison_analysis.recommendations.map((rec: string, i: number) => (
                              <li key={i} className="text-muted-foreground pl-4">• {rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Complete more practice sessions to see your progress over time.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Button
          onClick={() => {
            setFeedback(null);
            setSessionStarted(false);
            setResponse("");
            setTimeElapsed(0);
          }}
          variant="outline"
          className="w-full"
        >
          Start New Practice Session
        </Button>
      </CardContent>
    </Card>
  );
}
