import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

interface BulkStatusUpdateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedJobIds: string[];
  onUpdate: () => void;
}

export function BulkStatusUpdate({ open, onOpenChange, selectedJobIds, onUpdate }: BulkStatusUpdateProps) {
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');

  const handleBulkUpdate = async () => {
    if (!newStatus) {
      toast.error('Please select a status');
      return;
    }

    if (selectedJobIds.length === 0) {
      toast.error('No jobs selected');
      return;
    }

    setLoading(true);
    try {
      // Get current jobs data to create status history
      const { data: jobs, error: fetchError } = await supabase
        .from('jobs')
        .select('id, status')
        .in('id', selectedJobIds);

      if (fetchError) throw fetchError;

      // Update all jobs
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .in('id', selectedJobIds);

      if (updateError) throw updateError;

      // Create status history entries
      const historyEntries = jobs?.map(job => ({
        job_id: job.id,
        from_status: job.status,
        to_status: newStatus,
        notes: notes || null
      })) || [];

      if (historyEntries.length > 0) {
        const { error: historyError } = await supabase
          .from('job_status_history' as any)
          .insert(historyEntries);

        if (historyError) console.error('Error creating history:', historyError);
      }

      toast.success(`Updated ${selectedJobIds.length} job(s) to ${newStatus}`);
      setNewStatus('');
      setNotes('');
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating jobs:', error);
      toast.error(error.message || 'Failed to update jobs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Status Update</DialogTitle>
          <DialogDescription>
            Update the status of {selectedJobIds.length} selected job(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>New Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Interested">Interested</SelectItem>
                <SelectItem value="Applied">Applied</SelectItem>
                <SelectItem value="Interviewing">Interviewing</SelectItem>
                <SelectItem value="Offer">Offer</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Accepted">Accepted</SelectItem>
                <SelectItem value="Declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this status change..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpdate} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>Update {selectedJobIds.length} Job(s)</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
