import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lightbulb, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const SystemDesignBoard = () => {
  const { toast } = useToast();
  const [scenarioType, setScenarioType] = useState<string>("web-app");
  const [currentScenario, setCurrentScenario] = useState<any>(null);
  const [userDesign, setUserDesign] = useState<string>("");
  const [feedback, setFeedback] = useState<any>(null);

  const generateScenario = useMutation({
    mutationFn: async (type: string) => {
      const { data, error } = await supabase.functions.invoke("generate-technical-challenge", {
        body: { difficulty: "medium", category: "system-design", scenarioType: type },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setCurrentScenario(data);
      setUserDesign("");
      setFeedback(null);
      toast({ title: "Scenario loaded!", description: "Start designing your system." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate scenario", variant: "destructive" });
    },
  });

  const evaluateDesign = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("evaluate-coding-solution", {
        body: {
          type: "system-design",
          scenario: currentScenario,
          design: userDesign,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setFeedback(data);
      toast({ title: "Design evaluated!", description: "Check the feedback below." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to evaluate design", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Design Practice</CardTitle>
          <CardDescription>Practice designing scalable systems and architectures</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={scenarioType} onValueChange={setScenarioType}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="web-app">Web Application</SelectItem>
                <SelectItem value="distributed-system">Distributed System</SelectItem>
                <SelectItem value="microservices">Microservices Architecture</SelectItem>
                <SelectItem value="real-time">Real-time System</SelectItem>
                <SelectItem value="data-intensive">Data-Intensive Application</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => generateScenario.mutate(scenarioType)}
              disabled={generateScenario.isPending}
            >
              {generateScenario.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Scenario
            </Button>
          </div>
        </CardContent>
      </Card>

      {currentScenario && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{currentScenario.title}</CardTitle>
              <CardDescription>{currentScenario.category}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="requirements">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="requirements">Requirements</TabsTrigger>
                  <TabsTrigger value="constraints">Constraints</TabsTrigger>
                  <TabsTrigger value="framework">Framework</TabsTrigger>
                </TabsList>

                <TabsContent value="requirements" className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <p>{currentScenario.description}</p>
                  </div>

                  {currentScenario.functionalRequirements && (
                    <div>
                      <h4 className="font-semibold mb-2">Functional Requirements:</h4>
                      <ul className="space-y-1 text-sm">
                        {currentScenario.functionalRequirements.map((req: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {currentScenario.nonFunctionalRequirements && (
                    <div>
                      <h4 className="font-semibold mb-2">Non-Functional Requirements:</h4>
                      <ul className="space-y-1 text-sm">
                        {currentScenario.nonFunctionalRequirements.map((req: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="constraints" className="space-y-2">
                  {currentScenario.constraints?.map((constraint: string, idx: number) => (
                    <div key={idx} className="bg-muted p-3 rounded-md text-sm">
                      {constraint}
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="framework">
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold mb-2">Design Approach:</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Clarify requirements and constraints</li>
                        <li>Define high-level architecture</li>
                        <li>Design core components</li>
                        <li>Identify data models and flows</li>
                        <li>Address scalability and reliability</li>
                        <li>Consider trade-offs</li>
                      </ol>
                    </div>

                    {currentScenario.hints && (
                      <div>
                        <h4 className="font-semibold mb-2">Key Considerations:</h4>
                        <div className="space-y-2">
                          {currentScenario.hints.map((hint: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 bg-primary/5 p-3 rounded-md">
                              <Lightbulb className="h-4 w-4 mt-0.5 text-primary" />
                              {hint}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your Design</CardTitle>
                <Button
                  size="sm"
                  onClick={() => evaluateDesign.mutate()}
                  disabled={evaluateDesign.isPending || !userDesign}
                >
                  {evaluateDesign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Get Feedback
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe your system design here. Include:
- High-level architecture
- Key components and their responsibilities
- Data flow and storage strategy
- Scalability approach
- Trade-offs and alternatives considered"
                value={userDesign}
                onChange={(e) => setUserDesign(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
              />

              {feedback && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Feedback:</h4>
                    <div className="space-y-3">
                      {feedback.strengths && (
                        <div className="bg-green-50 dark:bg-green-950 p-4 rounded-md border border-green-200 dark:border-green-900">
                          <h5 className="font-medium text-sm mb-2 text-green-900 dark:text-green-100">Strengths:</h5>
                          <ul className="space-y-1 text-sm">
                            {feedback.strengths.map((strength: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {feedback.improvements && (
                        <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-md border border-yellow-200 dark:border-yellow-900">
                          <h5 className="font-medium text-sm mb-2 text-yellow-900 dark:text-yellow-100">Areas for Improvement:</h5>
                          <ul className="space-y-1 text-sm">
                            {feedback.improvements.map((improvement: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <Lightbulb className="h-4 w-4 mt-0.5 text-yellow-600" />
                                {improvement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {feedback.alternatives && (
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md border border-blue-200 dark:border-blue-900">
                          <h5 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">Alternative Approaches:</h5>
                          <ul className="space-y-1 text-sm">
                            {feedback.alternatives.map((alt: string, idx: number) => (
                              <li key={idx}>{alt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {feedback.score && (
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-md">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary">{feedback.score}</div>
                        <div className="text-sm text-muted-foreground">Overall Score</div>
                      </div>
                      <div className="flex-1 text-sm">
                        {feedback.summary}
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
