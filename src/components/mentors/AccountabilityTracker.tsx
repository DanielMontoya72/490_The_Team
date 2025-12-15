import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, CheckCircle2, Clock, Plus, Target } from "lucide-react";
import { format } from "date-fns";

interface Milestone {
  id: string;
  milestone_title: string;
  milestone_description: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'missed';
  completion_notes: string | null;
  completed_at: string | null;
  created_at: string;
}

export function AccountabilityTracker({ menteeId, relationshipId }: { menteeId: string; relationshipId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    dueDate: ''
  });

  // Fetch milestones
  const { data: milestones, isLoading } = useQuery({
    queryKey: ['accountability-milestones', relationshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mentor_accountability_milestones')
        .select('*')
        .eq('relationship_id', relationshipId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as Milestone[];
    }
  });

  // Create milestone
  const createMilestone = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('mentor_accountability_milestones')
        .insert({
          relationship_id: relationshipId,
          mentee_id: menteeId,
          mentor_id: user.id,
          milestone_title: newMilestone.title,
          milestone_description: newMilestone.description,
          due_date: newMilestone.dueDate,
          status: 'pending'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountability-milestones', relationshipId] });
      setIsAddingMilestone(false);
      setNewMilestone({ title: '', description: '', dueDate: '' });
      toast({
        title: "Milestone created",
        description: "The accountability milestone has been added."
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create milestone",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update milestone status
  const updateMilestoneStatus = useMutation({
    mutationFn: async ({ milestoneId, status, notes }: { milestoneId: string; status: string; notes?: string }) => {
      const updates: any = { status };
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
        if (notes) updates.completion_notes = notes;
      }

      const { error } = await supabase
        .from('mentor_accountability_milestones')
        .update(updates)
        .eq('id', milestoneId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountability-milestones', relationshipId] });
      toast({
        title: "Milestone updated",
        description: "The milestone status has been updated."
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update milestone",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'missed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Loading milestones...
        </CardContent>
      </Card>
    );
  }

  const pendingMilestones = milestones?.filter(m => m.status !== 'completed' && m.status !== 'missed') || [];
  const completedMilestones = milestones?.filter(m => m.status === 'completed') || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Accountability Milestones
              </CardTitle>
              <CardDescription>
                Track progress on key commitments and goals
              </CardDescription>
            </div>
            <Dialog open={isAddingMilestone} onOpenChange={setIsAddingMilestone}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Milestone
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Accountability Milestone</DialogTitle>
                  <DialogDescription>
                    Set a specific milestone or commitment for your mentee to work towards
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Milestone Title</Label>
                    <Input
                      id="title"
                      value={newMilestone.title}
                      onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                      placeholder="e.g., Apply to 10 target companies"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newMilestone.description}
                      onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                      placeholder="Provide details about what success looks like..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newMilestone.dueDate}
                      onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddingMilestone(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => createMilestone.mutate()}
                    disabled={!newMilestone.title || !newMilestone.dueDate}
                  >
                    Create Milestone
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingMilestones.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedMilestones.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {milestones && milestones.length > 0 
                    ? Math.round((completedMilestones.length / milestones.length) * 100)
                    : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          {milestones && milestones.length > 0 ? (
            <div className="space-y-4">
              {milestones.map((milestone) => (
                <Card key={milestone.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {getStatusIcon(milestone.status)}
                          {milestone.milestone_title}
                        </CardTitle>
                        <CardDescription>
                          {milestone.milestone_description}
                        </CardDescription>
                      </div>
                      <Badge variant={getStatusColor(milestone.status)}>
                        {milestone.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Due: {format(new Date(milestone.due_date), 'MMM d, yyyy')}
                      </span>
                      {milestone.completed_at && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Completed: {format(new Date(milestone.completed_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>

                    {milestone.completion_notes && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">Completion Notes</p>
                        <p className="text-sm text-muted-foreground">{milestone.completion_notes}</p>
                      </div>
                    )}

                    {milestone.status !== 'completed' && milestone.status !== 'missed' && (
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(value) => updateMilestoneStatus.mutate({ 
                            milestoneId: milestone.id, 
                            status: value 
                          })}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Update status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in_progress">Mark In Progress</SelectItem>
                            <SelectItem value="completed">Mark Completed</SelectItem>
                            <SelectItem value="missed">Mark Missed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No milestones yet. Create your first accountability milestone to track your mentee's progress.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
