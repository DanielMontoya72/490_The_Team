import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Target, Plus, CheckCircle, TrendingUp, ArrowRight } from "lucide-react";

export function NetworkingEventGoals({ eventId }: { eventId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [goalType, setGoalType] = useState("connections");
  const [goalDescription, setGoalDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['networking_event_goals', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('networking_event_goals')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createGoal = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate a default description if none provided
      const description = goalDescription.trim() || `${goalTypeLabels[goalType as keyof typeof goalTypeLabels]} goal`;

      // Create the event goal
      const { data: eventGoal, error: eventGoalError } = await supabase
        .from('networking_event_goals')
        .insert({
          user_id: user.id,
          event_id: eventId,
          goal_type: goalType,
          goal_description: description,
          target_value: parseInt(targetValue) || null,
          actual_value: 0,
        })
        .select()
        .single();

      if (eventGoalError) throw eventGoalError;

      // Also create a corresponding career goal
      const goalTypeMap: Record<string, string> = {
        connections: 'networking',
        job_leads: 'job_search',
        learning: 'skill_development',
        visibility: 'networking',
        partnerships: 'networking',
        mentorship: 'career_advancement',
      };

      const goalTitle = goalTypeLabels[goalType as keyof typeof goalTypeLabels];
      const metricText = targetValue ? `Target: ${targetValue} ${goalType.replace(/_/g, ' ')}` : 'Complete this event goal';

      const { error: careerGoalError } = await supabase
        .from('career_goals')
        .insert({
          user_id: user.id,
          goal_title: goalTitle,
          goal_description: description,
          goal_type: 'short_term',
          category: goalTypeMap[goalType] || 'networking',
          specific_metric: metricText,
          priority: 'medium',
          status: 'active',
          progress_percentage: 0,
        });

      if (careerGoalError) throw careerGoalError;

      return eventGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networking_event_goals'] });
      queryClient.invalidateQueries({ queryKey: ['career-goals'] });
      toast.success('Event goal and career goal created successfully!');
      setIsDialogOpen(false);
      setGoalDescription("");
      setTargetValue("");
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, actual_value }: { id: string; actual_value: number }) => {
      const { data, error } = await supabase
        .from('networking_event_goals')
        .update({ actual_value })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networking_event_goals'] });
      toast.success('Progress updated');
    },
  });

  const markAchieved = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('networking_event_goals')
        .update({ is_achieved: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networking_event_goals'] });
      toast.success('Goal marked as achieved!');
    },
  });

  const goalTypeLabels = {
    connections: 'New Connections',
    job_leads: 'Job Leads',
    learning: 'Learning Objectives',
    visibility: 'Increase Visibility',
    partnerships: 'Partnerships',
    mentorship: 'Mentorship Opportunities',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Event Goals
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Event Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Goal Type</Label>
                  <Select value={goalType} onValueChange={setGoalType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(goalTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={goalDescription}
                    onChange={(e) => setGoalDescription(e.target.value)}
                    placeholder="Add more details about your goal..."
                  />
                </div>

                <div>
                  <Label>Target Number (optional)</Label>
                  <Input
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="e.g., 10"
                  />
                </div>

                <Button
                  onClick={() => createGoal.mutate()}
                  disabled={createGoal.isPending}
                  className="w-full"
                >
                  Create Goal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : goals.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">
            No goals set yet. Add your first goal!
          </p>
        ) : (
           <div className="space-y-4">
            {goals.map((goal: any) => (
              <div key={goal.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {goalTypeLabels[goal.goal_type as keyof typeof goalTypeLabels]}
                      </Badge>
                      {goal.is_achieved ? (
                        <Badge variant="default" className="flex items-center gap-1 bg-green-500">
                          <CheckCircle className="h-3 w-3" />
                          Achieved
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          In Progress
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm mt-2">{goal.goal_description}</p>
                  </div>
                </div>

                {goal.target_value && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Progress</span>
                      <span className="font-semibold">
                        {goal.actual_value || 0} / {goal.target_value}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(((goal.actual_value || 0) / goal.target_value) * 100, 100)}
                      className="h-2"
                    />
                    {!goal.is_achieved && (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Update progress"
                          className="w-32"
                          id={`progress-${goal.id}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const value = parseInt((e.target as HTMLInputElement).value);
                              if (!isNaN(value)) {
                                updateGoal.mutate({ id: goal.id, actual_value: value });
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="px-2"
                          onClick={() => {
                            const input = document.getElementById(`progress-${goal.id}`) as HTMLInputElement;
                            const value = parseInt(input.value);
                            if (!isNaN(value)) {
                              updateGoal.mutate({ id: goal.id, actual_value: value });
                              input.value = '';
                            }
                          }}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        {goal.actual_value >= goal.target_value && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => markAchieved.mutate(goal.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Achieved
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!goal.target_value && !goal.is_achieved && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAchieved.mutate(goal.id)}
                    className="mt-2"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Mark as Achieved
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}