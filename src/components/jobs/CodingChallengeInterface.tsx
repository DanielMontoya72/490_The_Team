import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Clock, Award, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Editor from "@monaco-editor/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  timeLimit: number;
  testCases: any[];
  starterCode: string;
  solution: string;
  hints: string[];
}

export const CodingChallengeInterface = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("medium");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("javascript");
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const { data: challenges, isLoading: loadingChallenges } = useQuery({
    queryKey: ["technical-challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technical_challenges")
        .select("*")
        .order("difficulty");
      if (error) throw error;
      return data;
    },
  });

  const generateChallenge = useMutation({
    mutationFn: async ({ difficulty, category }: { difficulty: string; category: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-technical-challenge", {
        body: { difficulty, category, language: selectedLanguage },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setCurrentChallenge(data);
      setCode(data.starterCode || "");
      setTimeRemaining(data.timeLimit * 60);
      setTestResults(null);
      toast({ title: "Challenge loaded!", description: "Start coding when you're ready." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate challenge", variant: "destructive" });
    },
  });

  const evaluateSolution = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("evaluate-coding-solution", {
        body: {
          challengeId: currentChallenge?.id,
          code,
          language: selectedLanguage,
          testCases: currentChallenge?.testCases,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setTestResults(data);
      setTimerActive(false);
      if (data.allPassed) {
        toast({
          title: "All tests passed! 🎉",
          description: "Great job solving this challenge!",
        });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to evaluate solution", variant: "destructive" });
    },
  });

  const startChallenge = () => {
    setTimerActive(true);
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const runCode = () => {
    setIsRunning(true);
    evaluateSolution.mutate();
    setTimeout(() => setIsRunning(false), 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Coding Challenge Setup</CardTitle>
          <CardDescription>Choose difficulty and generate a challenge</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Difficulty</label>
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
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

            <div>
              <label className="text-sm font-medium mb-2 block">Language</label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => generateChallenge.mutate({ difficulty: selectedDifficulty, category: "general" })}
                disabled={generateChallenge.isPending}
                className="w-full"
              >
                {generateChallenge.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Challenge
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentChallenge && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{currentChallenge.title}</CardTitle>
                <Badge variant={currentChallenge.difficulty === "easy" ? "secondary" : currentChallenge.difficulty === "medium" ? "default" : "destructive"}>
                  {currentChallenge.difficulty}
                </Badge>
              </div>
              <CardDescription>{currentChallenge.category}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="description">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="description">Description</TabsTrigger>
                  <TabsTrigger value="hints">Hints</TabsTrigger>
                  <TabsTrigger value="solution">Solution</TabsTrigger>
                </TabsList>

                <TabsContent value="description" className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <p>{currentChallenge.description}</p>
                  </div>

                  {currentChallenge.testCases && (
                    <div>
                      <h4 className="font-semibold mb-2">Test Cases:</h4>
                      <div className="space-y-2">
                        {currentChallenge.testCases.slice(0, 2).map((test: any, idx: number) => (
                          <div key={idx} className="bg-muted p-3 rounded-md text-sm">
                            <div><strong>Input:</strong> {JSON.stringify(test.input)}</div>
                            <div><strong>Expected Output:</strong> {JSON.stringify(test.output)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="hints" className="space-y-2">
                  {currentChallenge.hints?.map((hint: string, idx: number) => (
                    <Alert key={idx}>
                      <AlertDescription>💡 {hint}</AlertDescription>
                    </Alert>
                  ))}
                </TabsContent>

                <TabsContent value="solution">
                  <div className="bg-muted p-4 rounded-md">
                    <pre className="text-sm overflow-auto">
                      <code>{currentChallenge.solution}</code>
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Code Editor</CardTitle>
                <div className="flex items-center gap-4">
                  {timeRemaining !== null && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className={`font-mono ${timeRemaining < 60 ? "text-destructive" : ""}`}>
                        {formatTime(timeRemaining)}
                      </span>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={startChallenge}
                    disabled={timerActive}
                  >
                    Start Timer
                  </Button>
                  <Button
                    size="sm"
                    onClick={runCode}
                    disabled={isRunning || evaluateSolution.isPending}
                  >
                    {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Run Code
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-md overflow-hidden" style={{ height: "400px" }}>
                <Editor
                  height="100%"
                  language={selectedLanguage}
                  value={code}
                  onChange={(value) => setCode(value || "")}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>

              {testResults && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Test Results:</h4>
                  {testResults.results?.map((result: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-md border ${result.passed ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900" : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900"}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {result.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Award className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium">Test Case {idx + 1}</span>
                      </div>
                      <div className="text-sm space-y-1">
                        <div><strong>Input:</strong> {JSON.stringify(result.input)}</div>
                        <div><strong>Expected:</strong> {JSON.stringify(result.expected)}</div>
                        <div><strong>Got:</strong> {JSON.stringify(result.actual)}</div>
                      </div>
                    </div>
                  ))}

                  {testResults.performance && (
                    <div className="p-3 bg-muted rounded-md">
                      <div className="text-sm">
                        <strong>Performance:</strong> {testResults.performance.timeComplexity} | {testResults.performance.spaceComplexity}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
