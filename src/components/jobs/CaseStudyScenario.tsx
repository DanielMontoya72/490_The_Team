import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const CaseStudyScenario = () => {
  const { toast } = useToast();
  const [industry, setIndustry] = useState<string>("technology");
  const [currentCase, setCurrentCase] = useState<any>(null);
  const [userResponse, setUserResponse] = useState<string>("");
  const [evaluation, setEvaluation] = useState<any>(null);

  const generateCase = useMutation({
    mutationFn: async (industry: string) => {
      const { data, error } = await supabase.functions.invoke("generate-technical-challenge", {
        body: { difficulty: "medium", category: "case-study", industry },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setCurrentCase(data);
      setUserResponse("");
      setEvaluation(null);
      toast({ title: "Case study loaded!", description: "Analyze the scenario and provide your recommendations." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate case study", variant: "destructive" });
    },
  });

  const evaluateResponse = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("evaluate-coding-solution", {
        body: {
          type: "case-study",
          caseStudy: currentCase,
          response: userResponse,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setEvaluation(data);
      toast({ title: "Response evaluated!", description: "Review your performance below." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to evaluate response", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Case Study Practice</CardTitle>
          <CardDescription>Practice business case analysis and problem-solving</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="consulting">Consulting</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="healthcare">Healthcare</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => generateCase.mutate(industry)}
              disabled={generateCase.isPending}
            >
              {generateCase.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Case Study
            </Button>
          </div>
        </CardContent>
      </Card>

      {currentCase && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{currentCase.title}</CardTitle>
                <Badge>{currentCase.industry}</Badge>
              </div>
              <CardDescription>{currentCase.duration} minutes</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="scenario">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="scenario">Scenario</TabsTrigger>
                  <TabsTrigger value="data">Data</TabsTrigger>
                  <TabsTrigger value="framework">Framework</TabsTrigger>
                </TabsList>

                <TabsContent value="scenario" className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <h4 className="font-semibold">Situation:</h4>
                    <p>{currentCase.situation}</p>

                    <h4 className="font-semibold mt-4">Challenge:</h4>
                    <p>{currentCase.challenge}</p>

                    <h4 className="font-semibold mt-4">Your Task:</h4>
                    <p>{currentCase.task}</p>
                  </div>

                  {currentCase.questions && (
                    <div>
                      <h4 className="font-semibold mb-2">Questions to Address:</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        {currentCase.questions.map((q: string, idx: number) => (
                          <li key={idx}>{q}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="data" className="space-y-4">
                  {currentCase.data && (
                    <div className="space-y-3">
                      <h4 className="font-semibold">Available Data:</h4>
                      {Object.entries(currentCase.data).map(([key, value]: [string, any]) => (
                        <div key={key} className="bg-muted p-3 rounded-md">
                          <div className="font-medium text-sm mb-1 capitalize">{key.replace(/_/g, " ")}:</div>
                          <div className="text-sm">{typeof value === "object" ? JSON.stringify(value, null, 2) : value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="framework">
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold mb-2">Analysis Framework:</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Define the problem clearly</li>
                        <li>Identify key stakeholders and constraints</li>
                        <li>Analyze available data and trends</li>
                        <li>Generate potential solutions</li>
                        <li>Evaluate options (pros/cons, risks)</li>
                        <li>Make a recommendation with rationale</li>
                        <li>Outline implementation steps</li>
                      </ol>
                    </div>

                    {currentCase.hints && (
                      <div>
                        <h4 className="font-semibold mb-2">Key Considerations:</h4>
                        <ul className="space-y-1">
                          {currentCase.hints.map((hint: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <FileText className="h-4 w-4 mt-0.5 text-primary" />
                              {hint}
                            </li>
                          ))}
                        </ul>
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
                <CardTitle>Your Analysis</CardTitle>
                <Button
                  size="sm"
                  onClick={() => evaluateResponse.mutate()}
                  disabled={evaluateResponse.isPending || !userResponse}
                >
                  {evaluateResponse.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit for Review
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Provide your analysis and recommendations:
1. Problem statement
2. Key findings from data
3. Potential solutions (with pros/cons)
4. Recommended approach
5. Implementation plan
6. Expected outcomes and metrics"
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                className="min-h-[400px] text-sm"
              />

              {evaluation && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Evaluation:</h4>
                    <div className="space-y-3">
                      {evaluation.scores && (
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(evaluation.scores).map(([category, score]: [string, any]) => (
                            <div key={category} className="bg-muted p-3 rounded-md">
                              <div className="text-sm text-muted-foreground capitalize">{category.replace(/_/g, " ")}</div>
                              <div className="text-2xl font-bold text-primary">{score}/10</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {evaluation.feedback && (
                        <div className="space-y-2">
                          {evaluation.feedback.strengths && (
                            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-md border border-green-200 dark:border-green-900">
                              <h5 className="font-medium text-sm mb-2 text-green-900 dark:text-green-100">Strengths:</h5>
                              <ul className="space-y-1 text-sm list-disc list-inside">
                                {evaluation.feedback.strengths.map((s: string, idx: number) => (
                                  <li key={idx}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {evaluation.feedback.improvements && (
                            <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-md border border-yellow-200 dark:border-yellow-900">
                              <h5 className="font-medium text-sm mb-2 text-yellow-900 dark:text-yellow-100">Improvements:</h5>
                              <ul className="space-y-1 text-sm list-disc list-inside">
                                {evaluation.feedback.improvements.map((i: string, idx: number) => (
                                  <li key={idx}>{i}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {evaluation.overallScore && (
                        <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-md border border-primary/20">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-primary">{evaluation.overallScore}/100</div>
                            <div className="text-sm text-muted-foreground">Overall</div>
                          </div>
                          <div className="flex-1 text-sm">
                            {evaluation.summary}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
