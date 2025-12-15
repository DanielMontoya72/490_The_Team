import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Shuffle, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface BulkAddApplicationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: {
    id: string;
    variant_a_id: string;
    variant_b_id: string;
    variant_a_name: string;
    variant_b_name: string;
    material_type: string;
  };
}

export function BulkAddApplicationsDialog({ open, onOpenChange, test }: BulkAddApplicationsDialogProps) {
  const queryClient = useQueryClient();
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);

  // Fetch jobs not already in this test
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs-for-ab-test-bulk', test.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get jobs already in this test
      const { data: existingApps } = await supabase
        .from('material_ab_test_applications')
        .select('job_id')
        .eq('test_id', test.id);

      const existingJobIds = existingApps?.map(a => a.job_id) || [];

      // Get available jobs
      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_title, company_name, status')
        .eq('user_id', user.id)
        .not('id', 'in', existingJobIds.length > 0 ? `(${existingJobIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open
  });

  const addApplicationsMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Randomly assign variants to selected jobs
      const applications = selectedJobs.map(jobId => {
        const variant = Math.random() < 0.5 ? 'A' : 'B';
        const materialId = variant === 'A' ? test.variant_a_id : test.variant_b_id;
        return {
          test_id: test.id,
          job_id: jobId,
          user_id: user.id,
          variant,
          material_id: materialId,
          outcome: 'pending'
        };
      });

      const { error } = await supabase
        .from('material_ab_test_applications')
        .insert(applications);

      if (error) throw error;
      
      // Count variants
      const variantACnt = applications.filter(a => a.variant === 'A').length;
      const variantBCnt = applications.filter(a => a.variant === 'B').length;
      
      return { total: applications.length, variantA: variantACnt, variantB: variantBCnt };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ab-test-applications', test.id] });
      queryClient.invalidateQueries({ queryKey: ['jobs-for-ab-test-bulk', test.id] });
      toast.success(`Added ${result.total} applications (${result.variantA} to A, ${result.variantB} to B)`);
      onOpenChange(false);
      setSelectedJobs([]);
    },
    onError: (error) => {
      toast.error('Failed to add applications: ' + error.message);
    }
  });

  const toggleJob = (jobId: string) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const selectAll = () => {
    if (jobs) {
      setSelectedJobs(jobs.map(j => j.id));
    }
  };

  const deselectAll = () => {
    setSelectedJobs([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Add Applications</DialogTitle>
          <DialogDescription>
            Select multiple job applications to add to this test. Variants will be randomly assigned for unbiased testing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Select Jobs ({selectedJobs.length} selected)</Label>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[300px] border rounded-lg p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : jobs?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mb-2" />
                <p className="text-sm">All jobs are already in this test!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {jobs?.map(job => (
                  <div 
                    key={job.id} 
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedJobs.includes(job.id) ? 'bg-primary/10 border border-primary/30' : ''
                    }`}
                    onClick={() => toggleJob(job.id)}
                  >
                    <Checkbox 
                      checked={selectedJobs.includes(job.id)}
                      onCheckedChange={() => toggleJob(job.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{job.job_title}</p>
                      <p className="text-xs text-muted-foreground truncate">{job.company_name}</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {job.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Shuffle className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Variants will be randomly assigned (50/50 split) for unbiased testing
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => addApplicationsMutation.mutate()}
              disabled={selectedJobs.length === 0 || addApplicationsMutation.isPending}
            >
              {addApplicationsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add {selectedJobs.length} Application{selectedJobs.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
