import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Code2, Layout, FileText, RefreshCw, Send, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type ChallengeType = 'coding' | 'system-design' | 'case-study';
type DifficultyLevel = 'easy' | 'medium' | 'hard';

export function JobBasedTechnicalPrep() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [challengeType, setChallengeType] = useState<ChallengeType>('coding');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [generatedChallenge, setGeneratedChallenge] = useState<any>(null);
  const [userSolution, setUserSolution] = useState<string>("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Timer countdown effect
  useEffect(() => {
    if (!isTimerRunning || timeRemaining <= 0) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          toast({
            title: "Time's Up!",
            description: "The allocated time for this challenge has ended.",
            variant: "destructive"
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, timeRemaining, toast]);

  const toggleTimer = () => {
    if (!generatedChallenge) return;
    
    if (!isTimerRunning && !startTime) {
      setStartTime(Date.now());
    }
    setIsTimerRunning(!isTimerRunning);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const { data: jobs, isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs-for-tech-prep'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_title, company_name, job_description, industry')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const generateChallenge = useMutation({
    mutationFn: async () => {
      if (!selectedJobId) throw new Error("Please select a job first");

      const selectedJob = jobs?.find(j => j.id === selectedJobId);
      if (!selectedJob) throw new Error("Job not found");

      const { data, error } = await supabase.functions.invoke('generate-technical-questions', {
        body: {
          jobTitle: selectedJob.job_title,
          jobDescription: selectedJob.job_description,
          techStack: selectedJob.industry,
          difficultyLevel: difficulty,
          challengeType: challengeType
        }
      });

      if (error) throw error;
      return data.challenge;
    },
    onSuccess: (data) => {
      setGeneratedChallenge(data);
      setUserSolution("");
      setEvaluation(null);
      setStartTime(null);
      setIsTimerRunning(false);
      
      // Set initial timer based on challenge type and difficulty
      let initialMinutes = 30; // default
      if (challengeType === 'coding') {
        initialMinutes = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 45 : 60;
      } else if (challengeType === 'system-design') {
        initialMinutes = difficulty === 'easy' ? 45 : difficulty === 'medium' ? 60 : 90;
      } else if (challengeType === 'case-study') {
        initialMinutes = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 45 : 60;
      }
      setTimeRemaining(initialMinutes * 60);
      
      toast({
        title: "Challenge Generated!",
        description: "Your AI-powered technical challenge is ready. Click the timer to start."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Generate Challenge",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const submitSolution = useMutation({
    mutationFn: async () => {
      if (!userSolution.trim()) throw new Error("Please enter your solution first");
      if (!generatedChallenge) throw new Error("No challenge to evaluate");
      
      setIsEvaluating(true);

      // Get evaluation from AI
      const { data: evalData, error: evalError } = await supabase.functions.invoke('evaluate-coding-solution', {
        body: {
          type: challengeType,
          ...(challengeType === 'coding' && {
            code: userSolution,
            language: 'javascript',
            testCases: generatedChallenge.testCases || []
          }),
          ...(challengeType === 'system-design' && {
            scenario: generatedChallenge,
            design: userSolution
          }),
          ...(challengeType === 'case-study' && {
            caseStudy: generatedChallenge,
            response: userSolution
          })
        }
      });

      if (evalError) throw evalError;

      const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

      // Save attempt to database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Ensure we have a score from the evaluation
      const score = evalData?.score || evalData?.overallScore || 0;

      const { error: saveError } = await supabase
        .from('technical_prep_attempts')
        .insert({
          user_id: user.id,
          job_id: selectedJobId || null,
          challenge_type: challengeType,
          difficulty_level: difficulty,
          question_title: generatedChallenge.title,
          question_data: generatedChallenge,
          user_solution: userSolution,
          ai_feedback: evalData,
          score: score,
          time_spent_seconds: timeSpent
        });

      if (saveError) throw saveError;

      return { ...evalData, score };
    },
    onSuccess: (feedback) => {
      setEvaluation(feedback);
      setIsEvaluating(false);
      setIsTimerRunning(false);
      queryClient.invalidateQueries({ queryKey: ['technical-prep-stats'] });
      toast({
        title: "Solution Evaluated!",
        description: `Score: ${feedback.score || 0}/100`
      });
    },
    onError: (error: any) => {
      setIsEvaluating(false);
      toast({
        title: "Evaluation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const selectedJob = jobs?.find(j => j.id === selectedJobId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Role-Specific Prep
          </CardTitle>
          <CardDescription>
            Select a job to generate customized technical challenges based on the role requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Job</label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a job..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingJobs ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">Loading jobs...</div>
                  ) : jobs && jobs.length > 0 ? (
                    jobs.map(job => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.job_title} at {job.company_name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      No jobs found. Add a job first!
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Challenge Type</label>
              <Select value={challengeType} onValueChange={(v) => setChallengeType(v as ChallengeType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="coding">
                    <div className="flex items-center gap-2">
                      <Code2 className="h-4 w-4" />
                      Coding Challenge
                    </div>
                  </SelectItem>
                  <SelectItem value="system-design">
                    <div className="flex items-center gap-2">
                      <Layout className="h-4 w-4" />
                      System Design
                    </div>
                  </SelectItem>
                  <SelectItem value="case-study">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Case Study
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Difficulty</label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as DifficultyLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedJob && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-1">Selected Position:</div>
              <div className="text-lg font-semibold">{selectedJob.job_title}</div>
              <div className="text-sm text-muted-foreground">{selectedJob.company_name}</div>
            </div>
          )}

          <Button
            onClick={() => generateChallenge.mutate()}
            disabled={!selectedJobId || generateChallenge.isPending}
            className="w-full"
            size="lg"
          >
            {generateChallenge.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Challenge...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate AI Challenge
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedChallenge && (
        <>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>{generatedChallenge.title}</CardTitle>
                  <Button
                    variant={isTimerRunning ? "destructive" : "outline"}
                    size="sm"
                    onClick={toggleTimer}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {formatTime(timeRemaining)}
                  </Button>
                </div>
                <CardDescription className="mt-2 flex gap-2 flex-wrap">
                  <Badge variant={
                    difficulty === 'easy' ? 'secondary' :
                    difficulty === 'hard' ? 'destructive' : 'default'
                  }>
                    {difficulty}
                  </Badge>
                  {generatedChallenge.tags?.map((tag: string) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateChallenge.mutate()}
                disabled={generateChallenge.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                New Challenge
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{generatedChallenge.description}</p>
                </div>

                {generatedChallenge.requirements && generatedChallenge.requirements.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Requirements</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {generatedChallenge.requirements.map((req: string, idx: number) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {generatedChallenge.examples && generatedChallenge.examples.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Examples</h3>
                    <div className="space-y-3">
                      {generatedChallenge.examples.map((example: any, idx: number) => (
                        <div key={idx} className="p-3 bg-muted rounded-lg">
                          <div className="font-mono text-sm">
                            <div><strong>Input:</strong> {example.input}</div>
                            <div><strong>Output:</strong> {example.output}</div>
                            {example.explanation && (
                              <div className="mt-1 text-muted-foreground">{example.explanation}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {generatedChallenge.constraints && generatedChallenge.constraints.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Constraints & Edge Cases</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {generatedChallenge.constraints.map((constraint: string, idx: number) => (
                        <li key={idx}>{constraint}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {generatedChallenge.hints && generatedChallenge.hints.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Hints</h3>
                    <div className="space-y-2">
                      {generatedChallenge.hints.map((hint: string, idx: number) => (
                        <div key={idx} className="p-3 bg-primary/10 rounded-lg">
                          <p className="text-sm">💡 {hint}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {generatedChallenge.expectedApproach && (
                  <div>
                    <h3 className="font-semibold mb-2">Suggested Approach</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{generatedChallenge.expectedApproach}</p>
                  </div>
                )}

                {generatedChallenge.timeComplexity && (
                  <div>
                    <h3 className="font-semibold mb-2">Expected Complexity</h3>
                    <p className="font-mono text-sm text-muted-foreground">{generatedChallenge.timeComplexity}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Solution</CardTitle>
            <CardDescription>
              {startTime && !evaluation && (
                <span className="flex items-center gap-1 text-primary">
                  <Clock className="h-4 w-4" />
                  Time: {Math.floor((Date.now() - startTime) / 1000 / 60)}m {Math.floor(((Date.now() - startTime) / 1000) % 60)}s
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={userSolution}
              onChange={(e) => setUserSolution(e.target.value)}
              placeholder={
                challengeType === 'coding' 
                  ? "Write your code solution here..."
                  : challengeType === 'system-design'
                  ? "Describe your system design approach, components, data flow, and scaling strategy..."
                  : "Present your analysis, recommendations, and reasoning..."
              }
              className="min-h-[300px] font-mono text-sm"
              disabled={isEvaluating || !!evaluation}
            />
            
            <Button
              onClick={() => submitSolution.mutate()}
              disabled={!userSolution.trim() || isEvaluating || !!evaluation}
              className="w-full"
              size="lg"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Evaluating Solution...
                </>
              ) : evaluation ? (
                "Solution Submitted"
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Solution
                </>
              )}
            </Button>

            {evaluation && (
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">AI Evaluation</h3>
                  <Badge
                    variant={(evaluation.score || 0) >= 80 ? "default" : (evaluation.score || 0) >= 60 ? "secondary" : "destructive"}
                    className="text-lg px-3 py-1"
                  >
                    {evaluation.score || 0}/100
                  </Badge>
                </div>

                {evaluation.summary && (
                  <div>
                    <h4 className="font-medium mb-1">Summary</h4>
                    <p className="text-sm text-muted-foreground">{evaluation.summary}</p>
                  </div>
                )}

                {evaluation.overallFeedback && (
                  <div>
                    <h4 className="font-medium mb-1">Overall Feedback</h4>
                    <p className="text-sm text-muted-foreground">{evaluation.overallFeedback}</p>
                  </div>
                )}

                {challengeType === 'coding' && (
                  <div className="grid gap-3">
                    {evaluation.correctness && (
                      <div>
                        <h4 className="font-medium mb-1">✓ Correctness</h4>
                        <p className="text-sm text-muted-foreground">{evaluation.correctness}</p>
                      </div>
                    )}
                    {evaluation.codeQuality && (
                      <div>
                        <h4 className="font-medium mb-1">📝 Code Quality</h4>
                        <p className="text-sm text-muted-foreground">{evaluation.codeQuality}</p>
                      </div>
                    )}
                    {evaluation.efficiency && (
                      <div>
                        <h4 className="font-medium mb-1">⚡ Efficiency</h4>
                        <p className="text-sm text-muted-foreground">{evaluation.efficiency}</p>
                      </div>
                    )}
                    {evaluation.bestPractices && (
                      <div>
                        <h4 className="font-medium mb-1">🎯 Best Practices</h4>
                        <p className="text-sm text-muted-foreground">{evaluation.bestPractices}</p>
                      </div>
                    )}
                  </div>
                )}

                {Array.isArray(evaluation.strengths) && evaluation.strengths.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1">✅ Strengths</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {evaluation.strengths.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(evaluation.improvements) && evaluation.improvements.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1">📉 Areas for Improvement</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {evaluation.improvements.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {challengeType === 'system-design' && Array.isArray(evaluation.alternatives) && evaluation.alternatives.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1">🔄 Alternative Approaches</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {evaluation.alternatives.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {challengeType === 'case-study' && (
                  <div className="grid gap-3">
                    {evaluation.scores && (
                      <div className="text-sm text-muted-foreground space-y-1">
                        <h4 className="font-medium mb-1">Score Breakdown</h4>
                        {Object.entries(evaluation.scores).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key.replace(/_/g, " ")}</span>
                            <span>{String(value)}/10</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {evaluation.feedback && Array.isArray(evaluation.feedback.strengths) && evaluation.feedback.strengths.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-1">✅ Strengths</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {evaluation.feedback.strengths.map((item: string, idx: number) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {evaluation.feedback && Array.isArray(evaluation.feedback.improvements) && evaluation.feedback.improvements.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-1">📉 Areas for Improvement</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {evaluation.feedback.improvements.map((item: string, idx: number) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        </>
      )}
    </div>
  );
}
