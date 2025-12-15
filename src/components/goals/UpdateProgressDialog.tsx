import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface UpdateProgressDialogProps {
  goal: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateProgressDialog({ goal, open, onOpenChange }: UpdateProgressDialogProps) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(goal.progress_percentage || 0);
  const [notes, setNotes] = useState("");
  const [reflection, setReflection] = useState("");

  const updateProgress = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update goal progress
      const { error: goalError } = await supabase
        .from('career_goals')
        .update({ 
          progress_percentage: progress,
          status: progress === 100 ? 'completed' : 'in_progress',
          completed_at: progress === 100 ? new Date().toISOString() : null
        })
        .eq('id', goal.id);

      if (goalError) throw goalError;

      // Create progress tracking entry
      const { error: trackingError } = await supabase
        .from('goal_progress_tracking')
        .insert([{
          goal_id: goal.id,
          user_id: user.id,
          progress_percentage: progress,
          notes,
          reflection
        }]);

      if (trackingError) throw trackingError;

      // If goal is completed, create an achievement
      if (progress === 100 && goal.status !== 'completed') {
        const { error: achievementError } = await supabase
          .from('goal_achievements')
          .insert([{
            goal_id: goal.id,
            user_id: user.id,
            achievement_title: `Completed: ${goal.goal_title}`,
            achievement_description: goal.goal_description || `Successfully achieved the goal: ${goal.goal_title}`,
            celebration_notes: notes || 'Congratulations on completing this goal!',
            impact_on_career: reflection || null
          }]);

        if (achievementError) throw achievementError;
      }

      // Generate insights after progress update
      try {
        await supabase.functions.invoke('generate-goal-insights');
      } catch (error) {
        console.error("Failed to generate insights:", error);
        // Don't fail the whole operation if insights generation fails
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal-progress'] });
      queryClient.invalidateQueries({ queryKey: ['goal-insights'] });
      queryClient.invalidateQueries({ queryKey: ['goal-achievements'] });
      if (progress === 100 && goal.status !== 'completed') {
        toast.success("🎉 Congratulations on achieving your goal!");
      } else {
        toast.success("Progress updated successfully!");
      }
      onOpenChange(false);
      setNotes("");
      setReflection("");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update progress");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Update Progress: {goal.goal_title}</DialogTitle>
          <DialogDescription>
            Track your progress and reflect on your journey
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Progress</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[progress]}
                onValueChange={(value) => setProgress(value[0])}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-lg font-medium w-16">{progress}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Progress Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What steps did you take? What milestones did you achieve?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reflection">Reflection</Label>
            <Textarea
              id="reflection"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="What challenges did you face? What did you learn?"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => updateProgress.mutate()} disabled={updateProgress.isPending}>
            {updateProgress.isPending ? "Updating..." : "Save Progress"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}