import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PartyPopper, Plus, Trash2, Loader2, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const milestoneTypes = [
  { value: 'interview_scheduled', label: '📅 Interview Scheduled', emoji: '🎯' },
  { value: 'offer_received', label: '🎉 Offer Received', emoji: '💰' },
  { value: 'application_sent', label: '📨 Application Milestone', emoji: '📬' },
  { value: 'goal_achieved', label: '🏆 Goal Achieved', emoji: '🌟' },
  { value: 'first_response', label: '📧 First Response', emoji: '✉️' },
  { value: 'skill_learned', label: '📚 New Skill Learned', emoji: '💡' },
  { value: 'networking_win', label: '🤝 Networking Win', emoji: '🎊' },
];

export function MilestoneSharing() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    milestone_type: 'goal_achieved',
    milestone_title: '',
    milestone_description: '',
    celebration_message: '',
    is_public_to_supporters: true,
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: milestones, isLoading } = useQuery({
    queryKey: ['family-milestones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_milestones')
        .select('*')
        .eq('user_id', user?.id)
        .order('achieved_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('family_milestones')
        .insert({
          user_id: user?.id,
          ...newMilestone,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-milestones'] });
      toast.success("Milestone shared! 🎉", {
        description: "Your supporters will be notified of this achievement.",
      });
      setShowForm(false);
      setNewMilestone({
        milestone_type: 'goal_achieved',
        milestone_title: '',
        milestone_description: '',
        celebration_message: '',
        is_public_to_supporters: true,
      });
    },
    onError: () => {
      toast.error("Failed to share milestone");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('family_milestones')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-milestones'] });
      toast.success("Milestone removed");
    },
  });

  const getMilestoneEmoji = (type: string) => {
    return milestoneTypes.find(m => m.value === type)?.emoji || '🎯';
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PartyPopper className="h-5 w-5 text-primary" />
                Milestone Celebrations
              </CardTitle>
              <CardDescription>
                Share your achievements with your support network
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </div>
        </CardHeader>

        {showForm && (
          <CardContent className="border-b pb-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Milestone Type</Label>
                <Select
                  value={newMilestone.milestone_type}
                  onValueChange={(v) => setNewMilestone(s => ({ ...s, milestone_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {milestoneTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  placeholder="e.g., Got my first interview!"
                  value={newMilestone.milestone_title}
                  onChange={(e) => setNewMilestone(s => ({ ...s, milestone_title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="Tell your supporters what this means to you..."
                  value={newMilestone.milestone_description}
                  onChange={(e) => setNewMilestone(s => ({ ...s, milestone_description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Celebration Message (optional)</Label>
                <Input
                  placeholder="e.g., One step closer to my dream job! 🚀"
                  value={newMilestone.celebration_message}
                  onChange={(e) => setNewMilestone(s => ({ ...s, celebration_message: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="public" className="flex flex-col">
                  <span>Share with Supporters</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Visible to your family and friends
                  </span>
                </Label>
                <Switch
                  id="public"
                  checked={newMilestone.is_public_to_supporters}
                  onCheckedChange={(checked) => setNewMilestone(s => ({ ...s, is_public_to_supporters: checked }))}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!newMilestone.milestone_title || createMutation.isPending}
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Share Milestone
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        )}

        <CardContent className="pt-6">
          {!milestones || milestones.length === 0 ? (
            <div className="text-center py-8">
              <PartyPopper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Milestones Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Celebrate your wins! Share milestones with your supporters to keep them engaged in your journey.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="flex items-start justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex gap-4">
                    <div className="text-4xl">{getMilestoneEmoji(milestone.milestone_type)}</div>
                    <div>
                      <h4 className="font-semibold">{milestone.milestone_title}</h4>
                      {milestone.milestone_description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {milestone.milestone_description}
                        </p>
                      )}
                      {milestone.celebration_message && (
                        <p className="text-sm italic mt-2">"{milestone.celebration_message}"</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {milestoneTypes.find(t => t.value === milestone.milestone_type)?.label || milestone.milestone_type}
                        </Badge>
                        {milestone.is_public_to_supporters ? (
                          <Badge variant="secondary" className="text-xs">
                            <Share2 className="h-3 w-3 mr-1" />
                            Shared
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Private</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(milestone.achieved_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(milestone.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
