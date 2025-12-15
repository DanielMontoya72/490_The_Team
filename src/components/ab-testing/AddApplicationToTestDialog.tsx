import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Loader2, Shuffle } from 'lucide-react';

interface AddApplicationToTestDialogProps {
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

export function AddApplicationToTestDialog({ open, onOpenChange, test }: AddApplicationToTestDialogProps) {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState('');
  const [variant, setVariant] = useState<'A' | 'B' | 'random'>('random');

  // Fetch jobs not already in this test
  const { data: jobs } = useQuery({
    queryKey: ['jobs-for-ab-test', test.id],
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

  const addApplicationMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine variant (random if selected)
      const selectedVariant = variant === 'random' 
        ? (Math.random() < 0.5 ? 'A' : 'B')
        : variant;

      const materialId = selectedVariant === 'A' ? test.variant_a_id : test.variant_b_id;

      const { error } = await supabase
        .from('material_ab_test_applications')
        .insert({
          test_id: test.id,
          job_id: jobId,
          user_id: user.id,
          variant: selectedVariant,
          material_id: materialId,
          outcome: 'pending'
        });

      if (error) throw error;
      return selectedVariant;
    },
    onSuccess: (selectedVariant) => {
      queryClient.invalidateQueries({ queryKey: ['ab-test-applications', test.id] });
      toast.success(`Application added to ${test.material_type === 'resume' ? 'resume' : 'cover letter'} Variant ${selectedVariant}`);
      onOpenChange(false);
      setJobId('');
      setVariant('random');
    },
    onError: (error) => {
      toast.error('Failed to add application: ' + error.message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Add Application to Test</DialogTitle>
          <DialogDescription>
            Select a job application to include in this A/B test. The system can randomly assign a variant for unbiased testing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Job Application</Label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a job" />
              </SelectTrigger>
              <SelectContent>
                {jobs?.map(job => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.job_title} at {job.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {jobs?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No available jobs. All your jobs are already in this test or you need to add new job applications.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Variant Assignment</Label>
            <RadioGroup value={variant} onValueChange={(v: 'A' | 'B' | 'random') => setVariant(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="random" id="random" />
                <label htmlFor="random" className="text-sm flex items-center gap-1 cursor-pointer">
                  <Shuffle className="h-3 w-3" />
                  Random (recommended for unbiased testing)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="A" id="variantA" />
                <label htmlFor="variantA" className="text-sm cursor-pointer">
                  Variant A: {test.variant_a_name}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="B" id="variantB" />
                <label htmlFor="variantB" className="text-sm cursor-pointer">
                  Variant B: {test.variant_b_name}
                </label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => addApplicationMutation.mutate()}
              disabled={!jobId || addApplicationMutation.isPending}
            >
              {addApplicationMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add to Test
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
