import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Calendar, Trash2, CheckCircle, Edit, Briefcase, Plus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { UpdateProgressDialog } from "./UpdateProgressDialog";
import { LinkGoalToJobDialog } from "./LinkGoalToJobDialog";

interface Goal {
  id: string;
  goal_title: string;
  goal_description: string;
  goal_type: string;
  category: string;
  target_date: string;
  specific_metric: string;
  priority: string;
  status: string;
  progress_percentage: number;
  created_at: string;
}

interface GoalsListProps {
  goals: Goal[];
  isLoading: boolean;
  onCreateGoal?: () => void;
}

export function GoalsList({ goals, isLoading, onCreateGoal }: GoalsListProps) {
  const queryClient = useQueryClient();
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [linkJobDialogOpen, setLinkJobDialogOpen] = useState(false);
  const [goalToLink, setGoalToLink] = useState<string | null>(null);

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('career_goals')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-goals'] });
      toast.success("Goal deleted successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete goal");
    }
  });

  const completeGoal = useMutation({
    mutationFn: async (goal: Goal) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update goal to completed
      const { error: goalError } = await supabase
        .from('career_goals')
        .update({ status: 'completed', progress_percentage: 100, completed_at: new Date().toISOString() })
        .eq('id', goal.id);
      if (goalError) throw goalError;

      // Create achievement
      const { error: achievementError } = await supabase
        .from('goal_achievements')
        .insert([{
          goal_id: goal.id,
          user_id: user.id,
          achievement_title: `Completed: ${goal.goal_title}`,
          achievement_description: goal.goal_description || `Successfully achieved the goal: ${goal.goal_title}`,
          celebration_notes: 'Congratulations on completing this goal! 🎉',
          impact_on_career: null
        }]);
      if (achievementError) throw achievementError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal-achievements'] });
      toast.success("Congratulations on achieving your goal! 🎉");
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-yellow-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-purple-500';
      case 'active': return 'bg-blue-500';
      case 'on_hold': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!goals || goals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No career goals yet. Create your first goal to get started!</p>
          {onCreateGoal && (
            <Button onClick={onCreateGoal} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Goal
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {goals.map((goal) => (
          <Card key={goal.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5" />
                    {goal.goal_title}
                  </CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={getStatusColor(goal.status)}>
                      {goal.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={getPriorityColor(goal.priority)}>
                      {goal.priority}
                    </Badge>
                    <Badge variant="outline">{goal.category.replace('_', ' ')}</Badge>
                    <Badge variant="outline">{goal.goal_type.replace('_', ' ')}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedGoal(goal);
                      setProgressDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Update
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setGoalToLink(goal.id);
                      setLinkJobDialogOpen(true);
                    }}
                  >
                    <Briefcase className="h-4 w-4 mr-1" />
                    Link Job
                  </Button>
                  {goal.status !== 'completed' && (
                    <Button
                      size="sm"
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => completeGoal.mutate(goal)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteGoal.mutate(goal.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {goal.goal_description && (
                <p className="text-sm text-muted-foreground">{goal.goal_description}</p>
              )}

              {goal.specific_metric && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Metric:</span>
                  <span className="text-muted-foreground">{goal.specific_metric}</span>
                </div>
              )}

              {goal.target_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>Target: {new Date(goal.target_date).toLocaleDateString()}</span>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{goal.progress_percentage}%</span>
                </div>
                <Progress value={goal.progress_percentage} className="h-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedGoal && (
        <UpdateProgressDialog
          goal={selectedGoal}
          open={progressDialogOpen}
          onOpenChange={setProgressDialogOpen}
        />
      )}

      {goalToLink && (
        <LinkGoalToJobDialog
          goalId={goalToLink}
          open={linkJobDialogOpen}
          onOpenChange={setLinkJobDialogOpen}
        />
      )}
    </>
  );
}