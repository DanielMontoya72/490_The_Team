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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useEffect } from "react";

interface CreateGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledData?: any;
}

export function CreateGoalDialog({ open, onOpenChange, prefilledData }: CreateGoalDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    goal_title: "",
    goal_description: "",
    goal_type: "short_term",
    category: "job_search",
    target_date: "",
    specific_metric: "",
    priority: "medium",
  });

  // Update form data when prefilled data changes
  useEffect(() => {
    if (prefilledData) {
      setFormData({
        goal_title: prefilledData.goal_title || "",
        goal_description: prefilledData.goal_description || "",
        goal_type: prefilledData.goal_type || "short_term",
        category: prefilledData.category || "job_search",
        target_date: prefilledData.target_date || "",
        specific_metric: prefilledData.specific_metric || "",
        priority: prefilledData.priority || "medium",
      });
    }
  }, [prefilledData]);

  const createGoal = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: goal, error } = await supabase
        .from('career_goals')
        .insert([{ ...data, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-goals'] });
      toast.success("Goal created successfully!");
      onOpenChange(false);
      setFormData({
        goal_title: "",
        goal_description: "",
        goal_type: "short_term",
        category: "job_search",
        target_date: "",
        specific_metric: "",
        priority: "medium",
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create goal");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.goal_title.trim()) {
      toast.error("Please enter a goal title");
      return;
    }
    createGoal.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Goal</DialogTitle>
          <DialogDescription>
            Set a SMART goal to track your career progress
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal_title">Goal Title *</Label>
            <Input
              id="goal_title"
              value={formData.goal_title}
              onChange={(e) => setFormData({ ...formData, goal_title: e.target.value })}
              placeholder="e.g., Land a Senior Software Engineer position"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal_description">Description</Label>
            <Textarea
              id="goal_description"
              value={formData.goal_description}
              onChange={(e) => setFormData({ ...formData, goal_description: e.target.value })}
              placeholder="Describe your goal in detail..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal_type">Goal Type</Label>
              <Select value={formData.goal_type} onValueChange={(value) => setFormData({ ...formData, goal_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short_term">Short-term (0-6 months)</SelectItem>
                  <SelectItem value="long_term">Long-term (6+ months)</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="job_search">Job Search</SelectItem>
                  <SelectItem value="skill_development">Skill Development</SelectItem>
                  <SelectItem value="networking">Networking</SelectItem>
                  <SelectItem value="career_advancement">Career Advancement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_date">Target Date</Label>
              <Input
                id="target_date"
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specific_metric">Specific Metric (SMART)</Label>
            <Input
              id="specific_metric"
              value={formData.specific_metric}
              onChange={(e) => setFormData({ ...formData, specific_metric: e.target.value })}
              placeholder="e.g., Apply to 50 jobs, Complete 3 certifications"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createGoal.isPending}>
              {createGoal.isPending ? "Creating..." : "Create Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}