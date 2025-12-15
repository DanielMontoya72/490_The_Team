import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Loader2, MessageSquare, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { differenceInHours } from 'date-fns';

interface UpdateOutcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: {
    id: string;
    test_id: string;
    job_id: string;
    applied_at: string;
    outcome: string;
    jobs?: {
      job_title: string;
      company_name: string;
    };
  };
}

const OUTCOMES = [
  { value: 'pending', label: 'Pending', icon: Clock, description: 'No response yet' },
  { value: 'response', label: 'Response Received', icon: MessageSquare, description: 'Got a response (not interview)' },
  { value: 'interview', label: 'Interview Invite', icon: Calendar, description: 'Invited to interview' },
  { value: 'offer', label: 'Offer Received', icon: CheckCircle, description: 'Received job offer' },
  { value: 'rejection', label: 'Rejected', icon: XCircle, description: 'Application rejected' },
  { value: 'no_response', label: 'No Response', icon: Clock, description: 'Confirmed no response after 2+ weeks' },
];

export function UpdateOutcomeDialog({ open, onOpenChange, application }: UpdateOutcomeDialogProps) {
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState(application.outcome || 'pending');

  const updateOutcomeMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const appliedAt = new Date(application.applied_at);
      const responseTimeHours = outcome !== 'pending' && outcome !== 'no_response' 
        ? differenceInHours(now, appliedAt)
        : null;

      const { error } = await supabase
        .from('material_ab_test_applications')
        .update({
          outcome,
          outcome_date: outcome !== 'pending' ? now.toISOString() : null,
          response_time_hours: responseTimeHours
        })
        .eq('id', application.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-test-applications', application.test_id] });
      toast.success('Outcome updated');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to update outcome: ' + error.message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Update Application Outcome</DialogTitle>
          <DialogDescription>
            {application.jobs?.job_title} at {application.jobs?.company_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>What happened with this application?</Label>
            <RadioGroup value={outcome} onValueChange={setOutcome} className="space-y-2">
              {OUTCOMES.map(({ value, label, icon: Icon, description }) => (
                <div 
                  key={value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    outcome === value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setOutcome(value)}
                >
                  <RadioGroupItem value={value} id={value} />
                  <Icon className={`h-4 w-4 ${
                    value === 'interview' || value === 'offer' ? 'text-green-500' :
                    value === 'rejection' ? 'text-red-500' :
                    value === 'response' ? 'text-blue-500' :
                    'text-muted-foreground'
                  }`} />
                  <div className="flex-1">
                    <label htmlFor={value} className="text-sm font-medium cursor-pointer">{label}</label>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => updateOutcomeMutation.mutate()}
              disabled={updateOutcomeMutation.isPending}
            >
              {updateOutcomeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Outcome
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
