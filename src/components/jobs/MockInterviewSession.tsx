import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Play, ChevronRight, CheckCircle, Clock, Target, TrendingUp, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface MockInterviewSessionProps {
  jobId: string;
}

export const MockInterviewSession = ({ jobId }: MockInterviewSessionProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [interviewFormat, setInterviewFormat] = useState<'behavioral' | 'technical' | 'case_study' | 'mixed'>('mixed');
  const [questionCount, setQuestionCount] = useState<number>(8);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, string>>({});

  // Fetch existing sessions
  const { data: sessions } = useQuery({
    queryKey: ['mock-sessions', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_interview_sessions')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Generate new session
  const generateSession = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-mock-interview', {
        body: { jobId, interviewFormat, sessionName, questionCount }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mock-sessions', jobId] });
      setActiveSession(data.session);
      setSessionDialogOpen(false);
      setSessionName('');
      toast({
        title: "Mock Interview Ready",
        description: "Your interview session has been generated. Let's begin!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save session progress
  const saveProgress = useMutation({
    mutationFn: async () => {
      if (!activeSession) return;

      const questions = (activeSession.questions as any[]).map((q, idx) => ({
        ...q,
        response: responses[idx] || ''
      }));

      const { error } = await supabase
        .from('mock_interview_sessions')
        .update({ questions })
        .eq('id', activeSession.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Progress Saved",
        description: "Your responses have been saved.",
      });
    },
  });

  // Complete session
  const completeSession = useMutation({
    mutationFn: async () => {
      if (!activeSession) return;

      const questions = (activeSession.questions as any[]).map((q, idx) => ({
        ...q,
        response: responses[idx] || ''
      }));

      // Analyze response quality
      const totalQuestions = questions.length;
      const responseLengths = questions.map(q => q.response?.split(/\s+/).filter(Boolean).length || 0);
      const avgResponseLength = responseLengths.reduce((sum, len) => sum + len, 0) / totalQuestions;
      
      // Check for low-quality responses
      const lowQualityPhrases = ['idk', "i don't know", 'dont know', 'no idea', 'unsure', '?'];
      const qualityResponses = questions.filter(q => {
        const response = (q.response || '').toLowerCase().trim();
        const wordCount = response.split(/\s+/).filter(Boolean).length;
        const isLowQuality = lowQualityPhrases.some(phrase => response === phrase || response.includes(phrase));
        return wordCount >= 20 && !isLowQuality;
      });
      
      const answeredQuestions = questions.filter(q => q.response?.trim()).length;
      const qualityRate = (qualityResponses.length / totalQuestions) * 100;
      const completionRate = (answeredQuestions / totalQuestions) * 100;
      
      // Analyze by question category
      const categoryAnalysis: Record<string, { count: number; avgLength: number; quality: number }> = {};
      questions.forEach(q => {
        const category = q.category || 'general';
        if (!categoryAnalysis[category]) {
          categoryAnalysis[category] = { count: 0, avgLength: 0, quality: 0 };
        }
        const wordCount = (q.response || '').split(/\s+/).filter(Boolean).length;
        const isQuality = wordCount >= 20 && !lowQualityPhrases.some(phrase => 
          (q.response || '').toLowerCase().includes(phrase)
        );
        categoryAnalysis[category].count++;
        categoryAnalysis[category].avgLength += wordCount;
        categoryAnalysis[category].quality += isQuality ? 1 : 0;
      });
      
      Object.keys(categoryAnalysis).forEach(cat => {
        const data = categoryAnalysis[cat];
        data.avgLength = Math.round(data.avgLength / data.count);
        data.quality = Math.round((data.quality / data.count) * 100);
      });
      
      // Identify specific examples and patterns
      const specificFeedback: string[] = [];
      const strongResponses = questions.filter(q => {
        const wordCount = (q.response || '').split(/\s+/).filter(Boolean).length;
        return wordCount >= 60 && wordCount <= 120;
      });
      const shortResponses = questions.filter(q => {
        const wordCount = (q.response || '').split(/\s+/).filter(Boolean).length;
        return wordCount > 0 && wordCount < 30;
      });
      const longResponses = questions.filter(q => {
        const wordCount = (q.response || '').split(/\s+/).filter(Boolean).length;
        return wordCount > 150;
      });
      
      if (strongResponses.length > 0) {
        specificFeedback.push(`${strongResponses.length} response${strongResponses.length > 1 ? 's' : ''} hit the ideal word count range (60-120 words)`);
      }
      if (shortResponses.length > 0) {
        specificFeedback.push(`${shortResponses.length} response${shortResponses.length > 1 ? 's were' : ' was'} too brief - expand with specific examples and context`);
      }
      if (longResponses.length > 0) {
        specificFeedback.push(`${longResponses.length} response${longResponses.length > 1 ? 's were' : ' was'} overly detailed - practice conciseness while keeping impact`);
      }
      
      // STAR method analysis
      const starKeywords = {
        situation: ['when', 'during', 'time', 'situation', 'faced', 'encountered'],
        task: ['responsible', 'needed to', 'had to', 'goal', 'objective', 'task'],
        action: ['i', 'decided', 'implemented', 'created', 'led', 'developed', 'analyzed'],
        result: ['resulted', 'achieved', 'improved', 'increased', 'reduced', 'success']
      };
      
      const starScores = questions.map(q => {
        const response = (q.response || '').toLowerCase();
        const score: any = { s: 0, t: 0, a: 0, r: 0 };
        Object.entries(starKeywords).forEach(([key, keywords]) => {
          const shortKey = key[0];
          score[shortKey] = keywords.some(kw => response.includes(kw)) ? 1 : 0;
        });
        return score;
      });
      
      const avgStarScore = starScores.reduce((acc, score) => {
        acc.s += score.s;
        acc.t += score.t;
        acc.a += score.a;
        acc.r += score.r;
        return acc;
      }, { s: 0, t: 0, a: 0, r: 0 });
      
      Object.keys(avgStarScore).forEach(k => {
        avgStarScore[k as keyof typeof avgStarScore] = Math.round((avgStarScore[k as keyof typeof avgStarScore] / totalQuestions) * 100);
      });
      
      // Determine strengths and improvements
      const strengths: string[] = [];
      const improvements: string[] = [];
      
      if (completionRate === 100) {
        strengths.push("Completed all questions - shows commitment and preparation");
      } else if (completionRate >= 75) {
        strengths.push("Strong completion rate demonstrates engagement");
      } else {
        improvements.push("Complete all interview questions to maximize your opportunities");
      }
      
      if (avgResponseLength >= 80) {
        strengths.push("Responses are comprehensive with good detail and context");
      } else if (avgResponseLength >= 50) {
        strengths.push("Providing solid depth in your responses");
      } else if (avgResponseLength >= 20) {
        improvements.push("Add more specific examples and context to strengthen responses");
      } else {
        improvements.push("Expand responses significantly - aim for 60-100 words with concrete examples");
      }
      
      if (qualityRate >= 80) {
        strengths.push("Consistently providing substantive, well-thought-out answers");
      } else if (qualityRate >= 50) {
        improvements.push("Replace generic statements with specific, measurable achievements");
      } else {
        improvements.push("Focus on quality over brevity - showcase your actual experience with details");
      }
      
      // STAR feedback
      if (avgStarScore.s >= 70 && avgStarScore.t >= 70 && avgStarScore.a >= 70 && avgStarScore.r >= 70) {
        strengths.push("Excellent use of the STAR method structure in responses");
      } else {
        const missingElements: string[] = [];
        if (avgStarScore.s < 50) missingElements.push("Situation context");
        if (avgStarScore.t < 50) missingElements.push("Task/challenge clarity");
        if (avgStarScore.a < 50) missingElements.push("Action details");
        if (avgStarScore.r < 50) missingElements.push("Result/impact");
        if (missingElements.length > 0) {
          improvements.push(`Strengthen STAR structure by adding: ${missingElements.join(', ')}`);
        }
      }
      
      // Category-specific feedback
      Object.entries(categoryAnalysis).forEach(([cat, data]) => {
        if (data.quality >= 75) {
          strengths.push(`Strong performance on ${cat} questions`);
        } else if (data.quality < 40) {
          improvements.push(`Focus practice on ${cat}-type questions - only ${data.quality}% met quality threshold`);
        }
      });
      
      // Calculate realistic overall score
      const qualityScore = qualityRate * 0.5; // 50% weight on quality
      const completionScore = completionRate * 0.15; // 15% weight on completion
      const lengthScore = Math.min((avgResponseLength / 80) * 100, 100) * 0.15; // 15% weight on length
      const starScore = ((avgStarScore.s + avgStarScore.t + avgStarScore.a + avgStarScore.r) / 4) * 0.2; // 20% weight on STAR
      const overallScore = Math.round(qualityScore + completionScore + lengthScore + starScore);
      
      const performanceSummary = {
        completion_rate: Math.round(completionRate),
        avg_response_length: Math.round(avgResponseLength),
        quality_rate: Math.round(qualityRate),
        total_time_minutes: Math.round((new Date().getTime() - new Date(activeSession.started_at).getTime()) / 60000),
        strengths: strengths.length > 0 ? strengths : ["Participated in the session"],
        areas_for_improvement: improvements.length > 0 ? improvements : ["Continue practicing for improvement"],
        specific_feedback: specificFeedback,
        star_analysis: avgStarScore,
        category_breakdown: categoryAnalysis
      };

      const { error } = await supabase
        .from('mock_interview_sessions')
        .update({ 
          questions,
          status: 'completed',
          completed_at: new Date().toISOString(),
          performance_summary: performanceSummary,
          overall_score: overallScore,
          duration_minutes: performanceSummary.total_time_minutes
        })
        .eq('id', activeSession.id);

      if (error) throw error;
      
      return { performanceSummary, overallScore };
    },
    onSuccess: (data) => {
      if (data) {
        setActiveSession((prev: any) => ({
          ...prev,
          performance_summary: data.performanceSummary,
          overall_score: data.overallScore,
          status: 'completed'
        }));
      }
      queryClient.invalidateQueries({ queryKey: ['mock-sessions', jobId] });
      toast({
        title: "Interview Complete",
        description: "Review your responses and performance summary.",
      });
      // Remind user to regenerate predictions
      setTimeout(() => {
        toast({
          title: "📊 Update Your Interview Predictions",
          description: "Practice session completed! Regenerate interview success predictions to see your updated Practice Score.",
          duration: 7000,
        });
      }, 2000);
    },
  });

  const handleStartSession = (session: any, viewMode: 'summary' | 'review' | 'continue' = 'continue') => {
    let sessionToSet = { ...session };
    
    if (viewMode === 'summary' && session.status === 'completed') {
      // Generate performance summary if it doesn't exist
      if (!session.performance_summary) {
        const questions = session.questions as any[];
        const totalQuestions = questions.length;
        const responseLengths = questions.map((q: any) => q.response?.split(/\s+/).filter(Boolean).length || 0);
        const avgResponseLength = responseLengths.reduce((sum: number, len: number) => sum + len, 0) / totalQuestions;
        
        const lowQualityPhrases = ['idk', "i don't know", 'dont know', 'no idea', 'unsure', '?'];
        const qualityResponses = questions.filter((q: any) => {
          const response = (q.response || '').toLowerCase().trim();
          const wordCount = response.split(/\s+/).filter(Boolean).length;
          const isLowQuality = lowQualityPhrases.some(phrase => response === phrase || response.includes(phrase));
          return wordCount >= 20 && !isLowQuality;
        });
        
        const answeredQuestions = questions.filter((q: any) => q.response?.trim()).length;
        const qualityRate = (qualityResponses.length / totalQuestions) * 100;
        const completionRate = (answeredQuestions / totalQuestions) * 100;
        
        const strengths: string[] = [];
        const improvements: string[] = [];
        
        if (completionRate === 100) strengths.push("Completed all questions");
        else if (completionRate >= 75) strengths.push("Strong completion rate");
        else improvements.push("Complete all interview questions");
        
        if (avgResponseLength >= 80) strengths.push("Detailed, comprehensive responses");
        else if (avgResponseLength >= 50) strengths.push("Good response depth");
        else if (avgResponseLength >= 20) improvements.push("Provide more detailed responses");
        else improvements.push("Responses are too brief - aim for 50-100 words per answer");
        
        if (qualityRate >= 80) strengths.push("Strong, substantive answers");
        else if (qualityRate >= 50) improvements.push("Replace vague answers with specific examples");
        else improvements.push("Provide meaningful responses instead of brief acknowledgments");
        
        const qualityScore = qualityRate * 0.6;
        const completionScore = completionRate * 0.2;
        const lengthScore = Math.min((avgResponseLength / 80) * 100, 100) * 0.2;
        const overallScore = Math.round(qualityScore + completionScore + lengthScore);
        
        sessionToSet.performance_summary = {
          completion_rate: Math.round(completionRate),
          avg_response_length: Math.round(avgResponseLength),
          quality_rate: Math.round(qualityRate),
          total_time_minutes: session.duration_minutes || 0,
          strengths: strengths.length > 0 ? strengths : ["Participated in the session"],
          areas_for_improvement: improvements.length > 0 ? improvements : ["Continue practicing"]
        };
        
        sessionToSet.overall_score = overallScore;
      }
      sessionToSet.viewMode = 'summary';
    } else if (viewMode === 'review') {
      sessionToSet.viewMode = 'review';
    } else {
      sessionToSet.viewMode = 'continue';
    }
    
    setActiveSession(sessionToSet);
    setCurrentQuestionIndex(0);
    
    // Load existing responses
    const existingResponses: Record<number, string> = {};
    (session.questions as any[]).forEach((q: any, idx: number) => {
      if (q.response) {
        existingResponses[idx] = q.response;
      }
    });
    setResponses(existingResponses);
  };

  const handleNextQuestion = () => {
    if (activeSession && currentQuestionIndex < activeSession.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      saveProgress.mutate();
    } else {
      completeSession.mutate();
    }
  };

  const currentQuestion = activeSession?.questions[currentQuestionIndex];
  const totalQuestions = activeSession?.questions.length || 0;
  const answeredQuestions = Object.keys(responses).length;
  const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  if (activeSession) {
    // Show performance summary if in summary view mode
    if (activeSession.viewMode === 'summary' && activeSession.performance_summary) {
      const summary = activeSession.performance_summary as any;
      
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Interview Complete! 🎉</CardTitle>
                  <CardDescription>{activeSession.session_name}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">{activeSession.overall_score}%</div>
                  <div className="text-sm text-muted-foreground">Overall Score</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{summary.completion_rate.toFixed(0)}%</div>
                    <div className="text-sm text-muted-foreground">Completion Rate</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{summary.avg_response_length}</div>
                    <div className="text-sm text-muted-foreground">Avg Words/Response</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{summary.total_time_minutes}m</div>
                    <div className="text-sm text-muted-foreground">Total Time</div>
                  </CardContent>
                </Card>
              </div>

              {summary.strengths && summary.strengths.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Strengths
                  </h4>
                  <ul className="space-y-1">
                    {summary.strengths.map((strength: string, idx: number) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.areas_for_improvement && summary.areas_for_improvement.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    Areas for Improvement
                  </h4>
                  <ul className="space-y-1">
                    {summary.areas_for_improvement.map((area: string, idx: number) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-blue-500">•</span>
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.specific_feedback && summary.specific_feedback.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Response Quality Analysis</h4>
                  <ul className="space-y-1">
                    {summary.specific_feedback.map((feedback: string, idx: number) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-muted-foreground">→</span>
                        <span>{feedback}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.star_analysis && (
                <div>
                  <h4 className="font-semibold mb-3">STAR Method Usage</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Situation</span>
                        <span className="text-muted-foreground">{summary.star_analysis.s}%</span>
                      </div>
                      <Progress value={summary.star_analysis.s} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Task</span>
                        <span className="text-muted-foreground">{summary.star_analysis.t}%</span>
                      </div>
                      <Progress value={summary.star_analysis.t} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Action</span>
                        <span className="text-muted-foreground">{summary.star_analysis.a}%</span>
                      </div>
                      <Progress value={summary.star_analysis.a} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Result</span>
                        <span className="text-muted-foreground">{summary.star_analysis.r}%</span>
                      </div>
                      <Progress value={summary.star_analysis.r} className="h-2" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={() => setActiveSession(null)} className="flex-1">
                  Back to Sessions
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setActiveSession({ ...activeSession, viewMode: 'review' });
                    setCurrentQuestionIndex(0);
                  }}
                  className="flex-1"
                >
                  Review Responses
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Session Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{activeSession.session_name}</CardTitle>
                <CardDescription>
                  <Badge variant="outline" className="mt-2">
                    {activeSession.interview_format}
                  </Badge>
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveSession(null)}>
                Exit Interview
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{answeredQuestions} of {totalQuestions} questions</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>

        {/* Current Question */}
        {currentQuestion && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant="secondary" className="mb-2">
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                  </Badge>
                  <CardTitle className="text-xl">{currentQuestion.question_text}</CardTitle>
                  {currentQuestion.context && (
                    <CardDescription className="mt-2">{currentQuestion.context}</CardDescription>
                  )}
                </div>
                <Badge className={
                  currentQuestion.difficulty === 'entry' ? 'bg-green-500' :
                  currentQuestion.difficulty === 'intermediate' ? 'bg-yellow-500' :
                  'bg-red-500'
                }>
                  {currentQuestion.difficulty}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>~{currentQuestion.time_recommendation_seconds || 120}s recommended</span>
                </div>
                <Badge variant="outline">{currentQuestion.question_type}</Badge>
              </div>

              <div>
                <Label>Your Response</Label>
                <Textarea
                  value={responses[currentQuestionIndex] || ''}
                  onChange={(e) => setResponses({ ...responses, [currentQuestionIndex]: e.target.value })}
                  placeholder="Type your response here..."
                  className="min-h-[250px] mt-2 resize-none overflow-hidden"
                  style={{ height: 'auto', minHeight: '250px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.max(250, target.scrollHeight) + 'px';
                  }}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {(responses[currentQuestionIndex] || '').trim().split(/\s+/).filter(Boolean).length} words
                </p>
              </div>

              {currentQuestion.follow_up_prompts && currentQuestion.follow_up_prompts.length > 0 && (
                <Card className="bg-muted">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Potential Follow-up Questions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {currentQuestion.follow_up_prompts.map((prompt: string, idx: number) => (
                        <li key={idx} className="text-sm flex gap-2">
                          <span className="text-primary">•</span>
                          <span>{prompt}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => saveProgress.mutate()}
                  disabled={saveProgress.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Progress
                </Button>
                <Button
                  onClick={handleNextQuestion}
                  disabled={!responses[currentQuestionIndex]?.trim()}
                >
                  {currentQuestionIndex === totalQuestions - 1 ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Interview
                    </>
                  ) : (
                    <>
                      Next Question
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Mock Interview Sessions</h3>
        <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Play className="h-4 w-4 mr-2" />
              Start New Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Mock Interview Session</DialogTitle>
              <DialogDescription>
                Generate a realistic interview session based on your target role
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Session Name</Label>
                <Input
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="e.g., Practice Session #1"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Interview Format</Label>
                <Select value={interviewFormat} onValueChange={(v: any) => setInterviewFormat(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Mixed (Recommended)</SelectItem>
                    <SelectItem value="behavioral">Behavioral Only</SelectItem>
                    <SelectItem value="technical">Technical Only</SelectItem>
                    <SelectItem value="case_study">Case Study</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Number of Questions</Label>
                <Select value={questionCount.toString()} onValueChange={(v) => setQuestionCount(parseInt(v))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Questions</SelectItem>
                    <SelectItem value="8">8 Questions (Recommended)</SelectItem>
                    <SelectItem value="10">10 Questions</SelectItem>
                    <SelectItem value="12">12 Questions</SelectItem>
                    <SelectItem value="15">15 Questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => generateSession.mutate()}
                disabled={generateSession.isPending}
                className="w-full"
              >
                {generateSession.isPending ? 'Generating...' : 'Generate Interview'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {sessions && sessions.length > 0 ? (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{session.session_name}</CardTitle>
                    <CardDescription>
                      {new Date(session.created_at).toLocaleDateString()} • {(session.questions as any[]).length} questions
                    </CardDescription>
                  </div>
                  <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                    {session.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Badge variant="outline">{session.interview_format}</Badge>
                    {session.overall_score && (
                      <Badge variant="outline">Score: {session.overall_score}%</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {session.status === 'completed' && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleStartSession(session, 'summary')}
                      >
                        Performance Summary
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartSession(session, session.status === 'completed' ? 'review' : 'continue')}
                    >
                      {session.status === 'completed' ? 'Review Responses' : 'Continue'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No mock interview sessions yet. Start your first practice session!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};