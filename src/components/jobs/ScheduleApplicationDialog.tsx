import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ScheduleApplicationDialogProps {
  jobId?: string;
  suggestedTime: Date | null;
  onClose: () => void;
  onScheduled: () => void;
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'GMT (London)' },
  { value: 'Europe/Paris', label: 'CET (Paris)' },
  { value: 'Asia/Tokyo', label: 'JST (Tokyo)' },
  { value: 'Asia/Shanghai', label: 'CST (Shanghai)' },
  { value: 'Australia/Sydney', label: 'AEST (Sydney)' },
];

export function ScheduleApplicationDialog({
  jobId,
  suggestedTime,
  onClose,
  onScheduled,
}: ScheduleApplicationDialogProps) {
  const [scheduledDate, setScheduledDate] = useState(
    suggestedTime ? format(suggestedTime, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")
  );
  const [scheduledTime, setScheduledTime] = useState(
    suggestedTime ? format(suggestedTime, "HH:mm") : "09:00"
  );
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);

      const { error } = await supabase
        .from('scheduled_applications')
        .insert({
          user_id: user.id,
          job_id: jobId || null,
          scheduled_for: scheduledFor.toISOString(),
          timezone,
          recommendation_reason: suggestedTime 
            ? 'AI-recommended optimal timing' 
            : 'User-selected timing',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Application submission scheduled!');
      onScheduled();
    },
    onError: (error) => {
      console.error('Schedule error:', error);
      toast.error('Failed to schedule submission');
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Application Submission
          </DialogTitle>
          <DialogDescription>
            Set a reminder to submit your application at the optimal time
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {suggestedTime && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm">
                <span className="font-medium">AI Suggestion: </span>
                {format(suggestedTime, "EEEE, MMMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={() => scheduleMutation.mutate()}
            disabled={scheduleMutation.isPending}
          >
            {scheduleMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Schedule Submission
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
