import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Calendar, ArchiveRestore, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

interface BulkActionsBarProps {
  selectedJobs: string[];
  onClearSelection: () => void;
  onComplete: () => void;
  isArchived?: boolean;
}

export function BulkActionsBar({ selectedJobs, onClearSelection, onComplete, isArchived = false }: BulkActionsBarProps) {
  const [loading, setLoading] = useState(false);
  const [newDeadline, setNewDeadline] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedJobs.length === 0) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('jobs' as any)
        .update({ status: newStatus } as any)
        .in('id', selectedJobs);

      if (error) throw error;
      
      toast.success(`Updated ${selectedJobs.length} job(s) to ${newStatus}`);
      onComplete();
      onClearSelection();
    } catch (error) {
      console.error('Error updating jobs:', error);
      toast.error('Failed to update jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeadlineUpdate = async () => {
    if (selectedJobs.length === 0 || !newDeadline) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('jobs' as any)
        .update({ application_deadline: newDeadline } as any)
        .in('id', selectedJobs);

      if (error) throw error;
      
      toast.success(`Updated deadline for ${selectedJobs.length} job(s)`);
      onComplete();
      onClearSelection();
      setNewDeadline('');
    } catch (error) {
      console.error('Error updating deadlines:', error);
      toast.error('Failed to update deadlines');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedJobs.length === 0) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('jobs' as any)
        .update({ 
          is_archived: true, 
          archived_at: new Date().toISOString() 
        } as any)
        .in('id', selectedJobs);

      if (error) throw error;
      
      toast.success(`Archived ${selectedJobs.length} job(s)`);
      onComplete();
      onClearSelection();
    } catch (error) {
      console.error('Error archiving jobs:', error);
      toast.error('Failed to archive jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedJobs.length === 0) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('jobs' as any)
        .update({ 
          is_archived: false, 
          archived_at: null,
          archive_reason: null
        } as any)
        .in('id', selectedJobs);

      if (error) throw error;
      
      toast.success(`Restored ${selectedJobs.length} job(s)`);
      onComplete();
      onClearSelection();
    } catch (error) {
      console.error('Error restoring jobs:', error);
      toast.error('Failed to restore jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedJobs.length === 0) return;
    setDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('jobs' as any)
        .delete()
        .in('id', selectedJobs);

      if (error) throw error;
      
      toast.success(`Permanently deleted ${selectedJobs.length} job(s)`);
      onComplete();
      onClearSelection();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting jobs:', error);
      toast.error('Failed to delete jobs');
    } finally {
      setLoading(false);
    }
  };

  if (selectedJobs.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 flex items-center gap-3 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md">
          <span className="font-bold text-lg text-foreground">{selectedJobs.length}</span>
          <span className="text-sm text-muted-foreground">selected</span>
        </div>
        
        <div className="h-8 w-px bg-border" />
        
        {isArchived ? (
          // Actions for archived jobs
          <>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBulkRestore} 
              disabled={loading}
            >
              <ArchiveRestore className="h-4 w-4 mr-2" />
              Restore Selected
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBulkDelete} 
              disabled={loading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Permanently
            </Button>
          </>
        ) : (
          // Actions for active jobs
          <>
            <Select onValueChange={handleBulkStatusUpdate} disabled={loading}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Update Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Interested">Interested</SelectItem>
                <SelectItem value="Applied">Applied</SelectItem>
                <SelectItem value="Phone Screen">Phone Screen</SelectItem>
                <SelectItem value="Interview">Interview</SelectItem>
                <SelectItem value="Offer Received">Offer Received</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={loading}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Update Deadline
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>New Deadline</Label>
                    <DatePicker
                      date={newDeadline ? new Date(newDeadline) : null}
                      onSelect={(date) => setNewDeadline(date ? date.toISOString().split('T')[0] : '')}
                      placeholder="Select deadline"
                    />
                  </div>
                  <Button onClick={handleBulkDeadlineUpdate} className="w-full" disabled={!newDeadline || loading}>
                    Apply to {selectedJobs.length} Job{selectedJobs.length > 1 ? 's' : ''}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBulkArchive} 
              disabled={loading}
            >
              Archive Selected
            </Button>
          </>
        )}

        <div className="h-8 w-px bg-border" />

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClearSelection} 
          className="rounded-full"
          title="Clear selection"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmBulkDelete}
        itemCount={selectedJobs.length}
        title="Delete Jobs"
      />
    </div>
  );
}
