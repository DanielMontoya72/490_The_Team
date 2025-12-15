import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase } from "lucide-react";
import { toast } from "sonner";

interface LinkGoalToJobDialogProps {
  goalId: string;
  currentJobId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LinkGoalToJobDialog({ 
  goalId, 
  currentJobId,
  open, 
  onOpenChange 
}: LinkGoalToJobDialogProps) {
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string>(currentJobId || "");

  const { data: jobs } = useQuery({
    queryKey: ['jobs-for-linking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, company_name, job_title')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  const linkGoalToJob = useMutation({
    mutationFn: async () => {
      if (!selectedJobId) {
        throw new Error("Please select a job");
      }

      // Check if linking already exists in goal_achievements
      const { data: existingAchievements } = await supabase
        .from('goal_achievements')
        .select('id')
        .eq('goal_id', goalId)
        .eq('related_job_id', selectedJobId)
        .maybeSingle();

      if (!existingAchievements) {
        // Create a tracking entry linking the goal to the job
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { error } = await supabase
          .from('goal_achievements')
          .insert([{
            goal_id: goalId,
            user_id: user.id,
            achievement_title: "Goal linked to job opportunity",
            achievement_description: "Tracking impact of this goal on job search success",
            related_job_id: selectedJobId
          }]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-achievements'] });
      queryClient.invalidateQueries({ queryKey: ['career-goals'] });
      toast.success("Goal successfully linked to job!");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to link goal to job");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Link Goal to Job
          </DialogTitle>
          <DialogDescription>
            Track how this goal impacts your job search and career advancement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="job-select">Select Job Application</Label>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger id="job-select">
                <SelectValue placeholder="Choose a job..." />
              </SelectTrigger>
              <SelectContent>
                {jobs?.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.job_title} at {job.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            💡 Linking goals to jobs helps you track which goals lead to successful applications and career progression.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => linkGoalToJob.mutate()} 
            disabled={linkGoalToJob.isPending || !selectedJobId}
          >
            {linkGoalToJob.isPending ? "Linking..." : "Link Goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
