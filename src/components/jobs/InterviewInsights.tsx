import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Lightbulb, Users, Calendar, CheckCircle2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface InterviewInsightsProps {
  jobId: string;
}

interface ChecklistItem {
  item: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface InterviewStage {
  stage: string;
  description: string;
  duration?: string;
}

interface CommonQuestion {
  question: string;
  category: 'behavioral' | 'technical' | 'situational';
  tips: string;
}

interface InterviewerInfo {
  role: string;
  background: string;
  focus_areas?: string[];
}

interface InterviewFormat {
  type: string;
  description: string;
  preparation_tips: string;
}

interface PreparationRecommendation {
  area: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

interface SuccessTip {
  tip: string;
  category: 'preparation' | 'during' | 'follow-up';
}

interface InterviewInsightsData {
  id: string;
  job_id: string;
  user_id: string;
  interview_process: InterviewStage[];
  common_questions: CommonQuestion[];
  interviewer_info: InterviewerInfo[];
  interview_formats: InterviewFormat[];
  preparation_recommendations: PreparationRecommendation[];
  timeline_expectations: string;
  success_tips: SuccessTip[];
  preparation_checklist: ChecklistItem[];
  created_at: string;
  updated_at: string;
}

export function InterviewInsights({ jobId }: InterviewInsightsProps) {
  const queryClient = useQueryClient();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  const { data: insights, isLoading } = useQuery({
    queryKey: ['interview-insights', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_insights')
        .select('*')
        .eq('job_id', jobId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as InterviewInsightsData | null;
    }
  });

  useEffect(() => {
    if (insights?.preparation_checklist) {
      setChecklist(insights.preparation_checklist);
    }
  }, [insights]);

  const generateInsights = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-interview-insights', {
        body: { jobId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-insights', jobId] });
      toast.success('Interview insights generated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate insights: ${error.message}`);
    }
  });

  const toggleChecklistItem = (index: number) => {
    const newChecklist = [...checklist];
    newChecklist[index] = { ...newChecklist[index], completed: !newChecklist[index].completed };
    setChecklist(newChecklist);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Users className="h-12 w-12 text-muted-foreground" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">No Interview Insights Yet</h3>
          <p className="text-sm text-muted-foreground">
            Generate comprehensive interview preparation insights for this position
          </p>
        </div>
        <Button
          onClick={() => generateInsights.mutate()}
          disabled={generateInsights.isPending}
        >
          {generateInsights.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Insights...
            </>
          ) : (
            'Generate Interview Insights'
          )}
        </Button>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="process" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="process">Process</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="preparation">Preparation</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="process" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Interview Process
              </CardTitle>
              <CardDescription>Typical stages and timeline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.timeline_expectations && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Timeline Expectations</p>
                  <p className="text-sm text-muted-foreground">{insights.timeline_expectations}</p>
                </div>
              )}
              
              <div className="space-y-3">
                {insights.interview_process?.map((stage, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold">{stage.stage}</h4>
                      {stage.duration && (
                        <Badge variant="outline">{stage.duration}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{stage.description}</p>
                  </div>
                ))}
              </div>

              {insights.interview_formats && insights.interview_formats.length > 0 && (
                <div className="space-y-3 mt-6">
                  <h4 className="font-semibold">Interview Formats</h4>
                  {insights.interview_formats.map((format, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <h5 className="font-medium">{format.type}</h5>
                      <p className="text-sm text-muted-foreground">{format.description}</p>
                      <p className="text-sm text-primary">{format.preparation_tips}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {insights.interviewer_info && insights.interviewer_info.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Interviewer Information
                </CardTitle>
                <CardDescription>Know who you'll be speaking with</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.interviewer_info.map((interviewer, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold">{interviewer.role}</h4>
                    <p className="text-sm text-muted-foreground">{interviewer.background}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {interviewer.focus_areas?.map((area, i) => (
                        <Badge key={i} variant="secondary">{area}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Common Interview Questions
              </CardTitle>
              <CardDescription>Questions you might encounter</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.common_questions?.map((q, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-medium flex-1">{q.question}</p>
                    <Badge variant={q.category === 'technical' ? 'default' : 'secondary'}>
                      {q.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{q.tips}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preparation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Preparation Recommendations
              </CardTitle>
              <CardDescription>Focus areas for your preparation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.preparation_recommendations?.map((rec, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="font-semibold flex-1">{rec.area}</h4>
                    <Badge variant={getPriorityColor(rec.priority) as any}>
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.recommendation}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {insights.success_tips && insights.success_tips.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Success Tips</CardTitle>
                <CardDescription>Tips from other candidates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.success_tips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm">{tip.tip}</p>
                      <Badge variant="outline" className="mt-2">{tip.category}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="checklist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Interview Preparation Checklist
              </CardTitle>
              <CardDescription>Track your preparation progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {checklist.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => toggleChecklistItem(index)}
                  />
                  <div className="flex-1">
                    <p className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {item.item}
                    </p>
                  </div>
                  <Badge variant={getPriorityColor(item.priority) as any}>
                    {item.priority}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}