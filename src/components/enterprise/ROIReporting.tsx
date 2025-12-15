import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { TrendingUp, DollarSign, Users, Target, Plus, Loader2, Download } from "lucide-react";
import { format } from "date-fns";

interface ROIReportingProps {
  organizationId: string;
}

export function ROIReporting({ organizationId }: ROIReportingProps) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newOutcome, setNewOutcome] = useState({
    cohort_id: '',
    outcome_period_start: '',
    outcome_period_end: '',
    total_participants: 0,
    placed_participants: 0,
    avg_starting_salary: 0,
    salary_increase_percentage: 0,
    retention_rate_90_days: 0,
    participant_satisfaction_score: 0,
    employer_satisfaction_score: 0,
    program_cost: 0,
  });

  const { data: cohorts } = useQuery({
    queryKey: ['organization-cohorts', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_cohorts')
        .select('*')
        .eq('organization_id', organizationId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: outcomes, isLoading } = useQuery({
    queryKey: ['program-outcomes', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_outcomes')
        .select(`
          *,
          organization_cohorts (cohort_name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const placementRate = newOutcome.total_participants > 0
        ? (newOutcome.placed_participants / newOutcome.total_participants) * 100
        : 0;
      
      const costPerPlacement = newOutcome.placed_participants > 0
        ? newOutcome.program_cost / newOutcome.placed_participants
        : 0;

      // Simple ROI calculation: (value generated - cost) / cost * 100
      // Value generated = placed participants * avg salary increase
      const valueGenerated = newOutcome.placed_participants * newOutcome.avg_starting_salary * (newOutcome.salary_increase_percentage / 100);
      const roiPercentage = newOutcome.program_cost > 0
        ? ((valueGenerated - newOutcome.program_cost) / newOutcome.program_cost) * 100
        : 0;

      const { error } = await supabase
        .from('program_outcomes')
        .insert({
          organization_id: organizationId,
          ...newOutcome,
          cohort_id: newOutcome.cohort_id || null,
          cost_per_placement: costPerPlacement,
          roi_percentage: roiPercentage,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-outcomes'] });
      toast.success("Outcome report created!");
      setShowCreate(false);
      setNewOutcome({
        cohort_id: '',
        outcome_period_start: '',
        outcome_period_end: '',
        total_participants: 0,
        placed_participants: 0,
        avg_starting_salary: 0,
        salary_increase_percentage: 0,
        retention_rate_90_days: 0,
        participant_satisfaction_score: 0,
        employer_satisfaction_score: 0,
        program_cost: 0,
      });
    },
    onError: () => {
      toast.error("Failed to create outcome report");
    },
  });

  const exportReport = (outcome: any) => {
    const report = `
PROGRAM ROI REPORT
==================
Period: ${outcome.outcome_period_start ? format(new Date(outcome.outcome_period_start), 'MMM d, yyyy') : 'N/A'} - ${outcome.outcome_period_end ? format(new Date(outcome.outcome_period_end), 'MMM d, yyyy') : 'N/A'}
Cohort: ${outcome.organization_cohorts?.cohort_name || 'All Programs'}

PARTICIPANTS
- Total Participants: ${outcome.total_participants}
- Placed: ${outcome.placed_participants}
- Placement Rate: ${outcome.total_participants > 0 ? ((outcome.placed_participants / outcome.total_participants) * 100).toFixed(1) : 0}%

FINANCIAL METRICS
- Average Starting Salary: $${outcome.avg_starting_salary?.toLocaleString() || 0}
- Salary Increase: ${outcome.salary_increase_percentage || 0}%
- Program Cost: $${outcome.program_cost?.toLocaleString() || 0}
- Cost Per Placement: $${outcome.cost_per_placement?.toLocaleString() || 0}
- ROI: ${outcome.roi_percentage?.toFixed(1) || 0}%

QUALITY METRICS
- 90-Day Retention Rate: ${outcome.retention_rate_90_days || 0}%
- Participant Satisfaction: ${outcome.participant_satisfaction_score || 0}/5
- Employer Satisfaction: ${outcome.employer_satisfaction_score || 0}/5

Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roi-report-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Report downloaded!");
  };

  // Calculate aggregate metrics
  const aggregateMetrics = outcomes?.reduce((acc, o) => {
    acc.totalParticipants += o.total_participants || 0;
    acc.totalPlaced += o.placed_participants || 0;
    acc.totalCost += o.program_cost || 0;
    return acc;
  }, { totalParticipants: 0, totalPlaced: 0, totalCost: 0 }) || { totalParticipants: 0, totalPlaced: 0, totalCost: 0 };

  const overallPlacementRate = aggregateMetrics.totalParticipants > 0
    ? (aggregateMetrics.totalPlaced / aggregateMetrics.totalParticipants) * 100
    : 0;

  const avgCostPerPlacement = aggregateMetrics.totalPlaced > 0
    ? aggregateMetrics.totalCost / aggregateMetrics.totalPlaced
    : 0;

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
                <TrendingUp className="h-5 w-5 text-primary" />
                ROI & Outcome Tracking
              </CardTitle>
              <CardDescription>
                Track program effectiveness and return on investment
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Participants</p>
                <p className="text-2xl font-bold">{aggregateMetrics.totalParticipants}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-500/10">
                <Target className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overall Placement</p>
                <p className="text-2xl font-bold">{overallPlacementRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-blue-500/10">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Investment</p>
                <p className="text-2xl font-bold">${(aggregateMetrics.totalCost / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cost/Placement</p>
                <p className="text-2xl font-bold">${avgCostPerPlacement.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outcome Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Outcome Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {!outcomes || outcomes.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Outcome Reports Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first outcome report to track program ROI
              </p>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Report
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {outcomes.map((outcome) => (
                <div
                  key={outcome.id}
                  className="p-4 rounded-lg border"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">
                        {outcome.organization_cohorts?.cohort_name || 'All Programs'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {outcome.outcome_period_start && outcome.outcome_period_end
                          ? `${format(new Date(outcome.outcome_period_start), 'MMM d, yyyy')} - ${format(new Date(outcome.outcome_period_end), 'MMM d, yyyy')}`
                          : 'Period not specified'}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => exportReport(outcome)}>
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Participants</p>
                      <p className="font-medium">{outcome.total_participants}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Placed</p>
                      <p className="font-medium">{outcome.placed_participants}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cost/Placement</p>
                      <p className="font-medium">${outcome.cost_per_placement?.toFixed(0) || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ROI</p>
                      <p className={`font-medium ${(outcome.roi_percentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {outcome.roi_percentage?.toFixed(1) || 0}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Outcome Report</DialogTitle>
            <DialogDescription>
              Record program outcomes for ROI analysis
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              <Label>Cohort (optional)</Label>
              <Select value={newOutcome.cohort_id || "all"} onValueChange={(v) => setNewOutcome(s => ({ ...s, cohort_id: v === "all" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {cohorts?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.cohort_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={newOutcome.outcome_period_start}
                  onChange={(e) => setNewOutcome(s => ({ ...s, outcome_period_start: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={newOutcome.outcome_period_end}
                  onChange={(e) => setNewOutcome(s => ({ ...s, outcome_period_end: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Participants</Label>
                <Input
                  type="number"
                  value={newOutcome.total_participants}
                  onChange={(e) => setNewOutcome(s => ({ ...s, total_participants: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Placed Participants</Label>
                <Input
                  type="number"
                  value={newOutcome.placed_participants}
                  onChange={(e) => setNewOutcome(s => ({ ...s, placed_participants: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Avg Starting Salary ($)</Label>
                <Input
                  type="number"
                  value={newOutcome.avg_starting_salary}
                  onChange={(e) => setNewOutcome(s => ({ ...s, avg_starting_salary: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Salary Increase (%)</Label>
                <Input
                  type="number"
                  value={newOutcome.salary_increase_percentage}
                  onChange={(e) => setNewOutcome(s => ({ ...s, salary_increase_percentage: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Program Cost ($)</Label>
              <Input
                type="number"
                value={newOutcome.program_cost}
                onChange={(e) => setNewOutcome(s => ({ ...s, program_cost: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>90-Day Retention (%)</Label>
                <Input
                  type="number"
                  max={100}
                  value={newOutcome.retention_rate_90_days}
                  onChange={(e) => setNewOutcome(s => ({ ...s, retention_rate_90_days: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Participant Score (1-5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  step={0.1}
                  value={newOutcome.participant_satisfaction_score}
                  onChange={(e) => setNewOutcome(s => ({ ...s, participant_satisfaction_score: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Employer Score (1-5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  step={0.1}
                  value={newOutcome.employer_satisfaction_score}
                  onChange={(e) => setNewOutcome(s => ({ ...s, employer_satisfaction_score: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
