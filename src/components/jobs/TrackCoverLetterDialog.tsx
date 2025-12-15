import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TrackCoverLetterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialId?: string;
  jobId?: string;
  onSuccess?: () => void;
}

export function TrackCoverLetterDialog({
  open,
  onOpenChange,
  materialId,
  jobId,
  onSuccess,
}: TrackCoverLetterDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    template_style: '',
    approach_type: '',
    word_count: '',
    response_received: false,
    outcome: '',
    time_to_response_hours: '',
    effectiveness_score: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialId || !jobId) {
      toast.error('Missing material or job information');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('cover_letter_performance').insert({
        user_id: user.id,
        material_id: materialId,
        job_id: jobId,
        template_style: formData.template_style || null,
        approach_type: formData.approach_type || null,
        word_count: formData.word_count ? parseInt(formData.word_count) : null,
        response_received: formData.response_received,
        outcome: formData.outcome || null,
        time_to_response_hours: formData.time_to_response_hours ? parseInt(formData.time_to_response_hours) : null,
        effectiveness_score: formData.effectiveness_score ? parseInt(formData.effectiveness_score) : null,
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast.success('Cover letter performance tracked');
      onOpenChange(false);
      onSuccess?.();
      setFormData({
        template_style: '',
        approach_type: '',
        word_count: '',
        response_received: false,
        outcome: '',
        time_to_response_hours: '',
        effectiveness_score: '',
        notes: '',
      });
    } catch (error) {
      console.error('Error tracking cover letter:', error);
      toast.error('Failed to track cover letter performance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Track Cover Letter Performance</DialogTitle>
          <DialogDescription>
            Record details about your cover letter to track its effectiveness
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="template_style">Template Style</Label>
              <Select
                value={formData.template_style}
                onValueChange={(value) => setFormData({ ...formData, template_style: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Creative">Creative</SelectItem>
                  <SelectItem value="Technical">Technical</SelectItem>
                  <SelectItem value="Storytelling">Storytelling</SelectItem>
                  <SelectItem value="Direct">Direct</SelectItem>
                  <SelectItem value="Enthusiastic">Enthusiastic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approach_type">Approach Type</Label>
              <Select
                value={formData.approach_type}
                onValueChange={(value) => setFormData({ ...formData, approach_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select approach" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Problem-Solution">Problem-Solution</SelectItem>
                  <SelectItem value="Achievement-Focused">Achievement-Focused</SelectItem>
                  <SelectItem value="Value Proposition">Value Proposition</SelectItem>
                  <SelectItem value="Company Research">Company Research</SelectItem>
                  <SelectItem value="Skills Match">Skills Match</SelectItem>
                  <SelectItem value="Personal Connection">Personal Connection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="word_count">Word Count</Label>
              <Input
                id="word_count"
                type="number"
                placeholder="e.g., 350"
                value={formData.word_count}
                onChange={(e) => setFormData({ ...formData, word_count: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="effectiveness_score">Effectiveness Score (0-100)</Label>
              <Input
                id="effectiveness_score"
                type="number"
                min="0"
                max="100"
                placeholder="e.g., 75"
                value={formData.effectiveness_score}
                onChange={(e) => setFormData({ ...formData, effectiveness_score: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Response Status</Label>
            <Select
              value={formData.response_received ? 'yes' : 'no'}
              onValueChange={(value) => setFormData({ ...formData, response_received: value === 'yes' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No Response Yet</SelectItem>
                <SelectItem value="yes">Response Received</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.response_received && (
            <>
              <div className="space-y-2">
                <Label htmlFor="outcome">Outcome</Label>
                <Select
                  value={formData.outcome}
                  onValueChange={(value) => setFormData({ ...formData, outcome: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Interview">Interview Scheduled</SelectItem>
                    <SelectItem value="Offer Received">Offer Received</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="No Response">No Follow-up</SelectItem>
                    <SelectItem value="Hired">Hired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time_to_response">Time to Response (hours)</Label>
                <Input
                  id="time_to_response"
                  type="number"
                  placeholder="e.g., 72 (3 days)"
                  value={formData.time_to_response_hours}
                  onChange={(e) => setFormData({ ...formData, time_to_response_hours: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any observations or learnings from this application..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Track Performance'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}