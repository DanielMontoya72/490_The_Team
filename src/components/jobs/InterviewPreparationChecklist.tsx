import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface PreparationTask {
  category: string;
  task: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  estimated_time_minutes?: number;
}

interface InterviewPreparationChecklistProps {
  interviewId: string;
}

export function InterviewPreparationChecklist({ interviewId }: InterviewPreparationChecklistProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<PreparationTask[]>([]);

  const { data: interview, isLoading } = useQuery({
    queryKey: ['interview-preparation', interviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interviews')
        .select('preparation_tasks')
        .eq('id', interviewId)
        .single();

      if (error) throw error;
      
      if (data.preparation_tasks) {
        setTasks(data.preparation_tasks as unknown as PreparationTask[]);
      }
      
      return data;
    },
  });

  const generatePreparationMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-interview-preparation', {
        body: { interviewId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setTasks(data.preparation_tasks);
      queryClient.invalidateQueries({ queryKey: ['interview-preparation', interviewId] });
      toast({
        title: "Preparation Checklist Generated",
        description: "Your personalized interview preparation checklist is ready!",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTasks: PreparationTask[]) => {
      const { error } = await supabase
        .from('interviews')
        .update({ preparation_tasks: updatedTasks as any })
        .eq('id', interviewId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-preparation', interviewId] });
    },
  });

  const toggleTask = (index: number) => {
    const updatedTasks = [...tasks];
    updatedTasks[index].completed = !updatedTasks[index].completed;
    setTasks(updatedTasks);
    updateTaskMutation.mutate(updatedTasks);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, PreparationTask[]>);

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!interview?.preparation_tasks || tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Interview Preparation Checklist</CardTitle>
          <CardDescription>
            Generate a customized preparation checklist tailored to this interview
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Get a comprehensive checklist covering company research, logistics, confidence building, materials preparation, and post-interview follow-up tasks.
          </p>
          <Button 
            onClick={() => generatePreparationMutation.mutate()}
            disabled={generatePreparationMutation.isPending}
          >
            {generatePreparationMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Preparation Checklist
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Interview Preparation Checklist</CardTitle>
              <CardDescription>
                {completedCount} of {totalCount} tasks completed ({completionPercentage}%)
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => generatePreparationMutation.mutate()}
              disabled={generatePreparationMutation.isPending}
            >
              {generatePreparationMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Sparkles className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {Object.entries(groupedTasks).map(([category, categoryTasks]) => {
              const categoryCompleted = categoryTasks.filter(t => t.completed).length;
              const categoryTotal = categoryTasks.length;
              
              return (
                <AccordionItem key={category} value={category}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-medium">{category}</span>
                      <Badge variant="outline">
                        {categoryCompleted}/{categoryTotal}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {categoryTasks.map((task, taskIndex) => {
                        const globalIndex = tasks.findIndex(t => 
                          t.category === category && t.task === task.task
                        );
                        
                        return (
                          <div key={taskIndex} className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
                            <Checkbox
                              checked={task.completed}
                              onCheckedChange={() => toggleTask(globalIndex)}
                              className="mt-1"
                            />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                                  {task.task}
                                </span>
                                <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                                  {task.priority}
                                </Badge>
                                {task.estimated_time_minutes && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {task.estimated_time_minutes} min
                                  </Badge>
                                )}
                                {task.completed && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {task.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
