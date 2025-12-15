import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Brain, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ResponseCoaching } from './ResponseCoaching';
import { MockInterviewSession } from './MockInterviewSession';

interface InterviewQuestionBankProps {
  jobId: string;
  interviewId?: string;
}

export const InterviewQuestionBank = ({ jobId, interviewId }: InterviewQuestionBankProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [difficultyLevel, setDifficultyLevel] = useState<'entry' | 'intermediate' | 'senior'>('intermediate');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});

  // Fetch questions
  const { data: questions, isLoading } = useQuery({
    queryKey: ['interview-questions', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_question_responses')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Generate questions mutation
  const generateQuestions = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const { data, error } = await supabase.functions.invoke('generate-interview-questions', {
        body: { jobId, interviewId, difficultyLevel }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      // Refetch to ensure we get the latest data
      await queryClient.refetchQueries({ queryKey: ['interview-questions', jobId] });
      toast({
        title: "Questions Generated",
        description: "Interview questions have been successfully generated.",
      });
      setIsGenerating(false);
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });

  // Update question response
  const updateResponse = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('interview_question_responses')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-questions', jobId] });
      toast({
        title: "Response Saved",
        description: "Your response has been saved successfully.",
      });
    },
  });

  // Delete question
  const deleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('interview_question_responses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-questions', jobId] });
      toast({
        title: "Question Deleted",
        description: "Question has been removed from your bank.",
      });
    },
  });

  const handleSaveResponse = (questionId: string) => {
    const response = responses[questionId];
    if (!response) return;

    updateResponse.mutate({
      id: questionId,
      updates: {
        response_text: response.response_text,
        star_method: response.star_method,
        is_practiced: true
      }
    });
  };

  const handleResponseChange = (questionId: string, field: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value
      }
    }));
  };

  const handleStarChange = (questionId: string, starField: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        star_method: {
          ...prev[questionId]?.star_method,
          [starField]: value
        }
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const categorizedQuestions = {
    behavioral: questions?.filter(q => q.question_category === 'behavioral') || [],
    technical: questions?.filter(q => q.question_category === 'technical') || [],
    situational: questions?.filter(q => q.question_category === 'situational') || []
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'behavioral': return 'bg-blue-500/10 text-blue-500';
      case 'technical': return 'bg-purple-500/10 text-purple-500';
      case 'situational': return 'bg-green-500/10 text-green-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'entry': return 'bg-green-500/10 text-green-500';
      case 'intermediate': return 'bg-yellow-500/10 text-yellow-500';
      case 'senior': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h3 className="text-lg font-semibold">Interview Question Bank</h3>
        <div className="flex gap-3 items-center flex-wrap">
          <Select value={difficultyLevel} onValueChange={(v: any) => setDifficultyLevel(v)}>
            <SelectTrigger className="w-auto min-w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entry">Entry</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="senior">Senior</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => generateQuestions.mutate()}
            disabled={isGenerating}
            className="whitespace-nowrap"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Generate Questions
              </>
            )}
          </Button>
        </div>
      </div>

      {!questions || questions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No questions yet. Click "Generate Questions" to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="behavioral" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="behavioral">
              Behavioral ({categorizedQuestions.behavioral.length})
            </TabsTrigger>
            <TabsTrigger value="technical">
              Technical ({categorizedQuestions.technical.length})
            </TabsTrigger>
            <TabsTrigger value="situational">
              Situational ({categorizedQuestions.situational.length})
            </TabsTrigger>
          </TabsList>

          {Object.entries(categorizedQuestions).map(([category, categoryQuestions]) => (
            <TabsContent key={category} value={category} className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                {categoryQuestions.map((question) => (
                  <AccordionItem key={question.id} value={question.id}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2 text-left">
                        {question.is_practiced && (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        )}
                        <span className="flex-1">{question.question_text}</span>
                        <Badge className={getDifficultyColor(question.difficulty_level)}>
                          {question.difficulty_level}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-4">
                        <ResponseCoaching
                          questionId={question.id}
                          questionText={question.question_text}
                          questionCategory={question.question_category}
                          currentResponse={question.response_text || ''}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {categoryQuestions.length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      No {category} questions yet.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};