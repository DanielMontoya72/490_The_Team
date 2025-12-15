import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Plus, Calendar, Target, Loader2, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface CohortManagementProps {
  organizationId: string;
}

export function CohortManagement({ organizationId }: CohortManagementProps) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<any>(null);
  const [newCohort, setNewCohort] = useState({
    cohort_name: '',
    cohort_description: '',
    program_type: 'new_grad',
    start_date: '',
    end_date: '',
    target_placement_rate: 80,
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: cohorts, isLoading } = useQuery({
    queryKey: ['organization-cohorts', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_cohorts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: cohortMembers } = useQuery({
    queryKey: ['cohort-members-counts', organizationId],
    queryFn: async () => {
      const cohortIds = cohorts?.map(c => c.id) || [];
      if (cohortIds.length === 0) return {};

      const { data, error } = await supabase
        .from('cohort_members')
        .select('cohort_id, status')
        .in('cohort_id', cohortIds);
      
      if (error) throw error;

      // Group by cohort
      const counts: Record<string, { total: number; placed: number }> = {};
      data?.forEach(m => {
        if (!counts[m.cohort_id]) {
          counts[m.cohort_id] = { total: 0, placed: 0 };
        }
        counts[m.cohort_id].total++;
        if (m.status === 'placed') counts[m.cohort_id].placed++;
      });

      return counts;
    },
    enabled: !!cohorts?.length,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('organization_cohorts')
        .insert({
          organization_id: organizationId,
          ...newCohort,
          start_date: newCohort.start_date || null,
          end_date: newCohort.end_date || null,
          created_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-cohorts'] });
      toast.success("Cohort created successfully!");
      setShowCreate(false);
      setNewCohort({
        cohort_name: '',
        cohort_description: '',
        program_type: 'new_grad',
        start_date: '',
        end_date: '',
        target_placement_rate: 80,
      });
    },
    onError: () => {
      toast.error("Failed to create cohort");
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      active: "default",
      planning: "secondary",
      completed: "outline",
      archived: "destructive",
    };
    return <Badge variant={variants[status] || "outline"} className="capitalize">{status}</Badge>;
  };

  const getProgramTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      career_transition: '🔄 Career Transition',
      new_grad: '🎓 New Graduate',
      upskilling: '📚 Upskilling',
      outplacement: '🏢 Outplacement',
    };
    return labels[type] || type;
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
                <Users className="h-5 w-5 text-primary" />
                Cohort Management
              </CardTitle>
              <CardDescription>
                Create and manage groups of job seekers in your program
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Cohort
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!cohorts || cohorts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Cohorts Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-4">
                Create your first cohort to start tracking job seekers in your program.
              </p>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Cohort
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {cohorts.map((cohort) => {
                const memberStats = cohortMembers?.[cohort.id] || { total: 0, placed: 0 };
                const placementRate = memberStats.total > 0 
                  ? Math.round((memberStats.placed / memberStats.total) * 100) 
                  : 0;

                return (
                  <div
                    key={cohort.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedCohort(cohort)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{cohort.cohort_name}</h4>
                        {getStatusBadge(cohort.status)}
                        <Badge variant="outline">{getProgramTypeLabel(cohort.program_type)}</Badge>
                      </div>
                      {cohort.cohort_description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {cohort.cohort_description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {memberStats.total} members
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {placementRate}% placed (target: {cohort.target_placement_rate}%)
                        </span>
                        {cohort.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(cohort.start_date), 'MMM d, yyyy')}
                            {cohort.end_date && ` - ${format(new Date(cohort.end_date), 'MMM d, yyyy')}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Cohort Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Cohort</DialogTitle>
            <DialogDescription>
              Set up a new group of job seekers for your program
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cohort Name *</Label>
              <Input
                placeholder="e.g., Spring 2025 Graduates"
                value={newCohort.cohort_name}
                onChange={(e) => setNewCohort(s => ({ ...s, cohort_name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of this cohort..."
                value={newCohort.cohort_description}
                onChange={(e) => setNewCohort(s => ({ ...s, cohort_description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Program Type</Label>
              <Select
                value={newCohort.program_type}
                onValueChange={(v) => setNewCohort(s => ({ ...s, program_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_grad">🎓 New Graduate</SelectItem>
                  <SelectItem value="career_transition">🔄 Career Transition</SelectItem>
                  <SelectItem value="upskilling">📚 Upskilling</SelectItem>
                  <SelectItem value="outplacement">🏢 Outplacement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={newCohort.start_date}
                  onChange={(e) => setNewCohort(s => ({ ...s, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={newCohort.end_date}
                  onChange={(e) => setNewCohort(s => ({ ...s, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Target Placement Rate (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={newCohort.target_placement_rate}
                onChange={(e) => setNewCohort(s => ({ ...s, target_placement_rate: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newCohort.cohort_name || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Cohort
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
