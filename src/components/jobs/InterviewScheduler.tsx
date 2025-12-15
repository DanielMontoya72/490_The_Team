import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface InterviewSchedulerProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
  onScheduled?: () => void;
}

export function InterviewScheduler({ jobId, jobTitle, companyName, onScheduled }: InterviewSchedulerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [formData, setFormData] = useState({
    interview_type: "video",
    interview_time: "",
    duration_minutes: "60",
    location: "",
    meeting_link: "",
    interviewer_name: "",
    interviewer_email: "",
    interviewer_phone: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }
    
    if (!formData.interview_time) {
      toast.error("Please select a time");
      return;
    }
    
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Combine date and time
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const interviewDateTime = new Date(`${dateStr}T${formData.interview_time}`);

      // Check for conflicts
      const { data: existingInterviews } = await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', user.id)
        .gte('interview_date', new Date(interviewDateTime.getTime() - 2 * 60 * 60 * 1000).toISOString())
        .lte('interview_date', new Date(interviewDateTime.getTime() + 2 * 60 * 60 * 1000).toISOString());

      if (existingInterviews && existingInterviews.length > 0) {
        toast.warning("Calendar Conflict Detected", {
          description: "You have another interview scheduled around this time. Please verify your schedule."
        });
      }

      const { data: newInterview, error } = await supabase
        .from('interviews')
        .insert({
          user_id: user.id,
          job_id: jobId,
          interview_type: formData.interview_type,
          interview_date: interviewDateTime.toISOString(),
          duration_minutes: parseInt(formData.duration_minutes),
          location: formData.location || null,
          meeting_link: formData.meeting_link || null,
          interviewer_name: formData.interviewer_name || null,
          interviewer_email: formData.interviewer_email || null,
          interviewer_phone: formData.interviewer_phone || null,
          notes: formData.notes || null,
          preparation_tasks: [
            { task: "Review company background", completed: false },
            { task: "Prepare questions for interviewer", completed: false },
            { task: "Research interviewer on LinkedIn", completed: false },
            { task: "Prepare STAR examples", completed: false },
          ],
          status: 'scheduled',
          outcome: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Automatically generate comprehensive preparation checklist
      if (newInterview) {
        try {
          await supabase.functions.invoke('generate-interview-preparation', {
            body: { interviewId: newInterview.id }
          });
        } catch (prepError) {
          console.error('Failed to generate preparation checklist:', prepError);
          // Don't fail the entire operation if prep generation fails
        }
      }

      // Create automatic reminders: 24 hours and 2 hours before interview
      const reminder24h = new Date(interviewDateTime.getTime() - 24 * 60 * 60 * 1000);
      const reminder2h = new Date(interviewDateTime.getTime() - 2 * 60 * 60 * 1000);
      
      await supabase
        .from('deadline_reminders')
        .insert([
          {
            user_id: user.id,
            job_id: jobId,
            reminder_date: reminder24h.toISOString(),
            reminder_type: 'both',
            is_sent: false
          },
          {
            user_id: user.id,
            job_id: jobId,
            reminder_date: reminder2h.toISOString(),
            reminder_type: 'both',
            is_sent: false
          }
        ]);

      toast.success("Interview Scheduled", {
        description: `Interview scheduled for ${companyName} on ${new Date(interviewDateTime).toLocaleString()}`
      });
      setOpen(false);
      setSelectedDate(undefined);
      setUseCustomTime(false);
      setFormData({
        interview_type: "video",
        interview_time: "",
        duration_minutes: "60",
        location: "",
        meeting_link: "",
        interviewer_name: "",
        interviewer_email: "",
        interviewer_phone: "",
        notes: "",
      });
      onScheduled?.();
      onScheduled?.();
    } catch (error: any) {
      console.error('Error scheduling interview:', error);
      toast.error("Failed to schedule interview", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Calendar className="mr-2 h-4 w-4" />
          Schedule Interview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {jobTitle} at {companyName}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interview_type">Interview Type *</Label>
              <Select
                value={formData.interview_type}
                onValueChange={(value) => setFormData({ ...formData, interview_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="video">Video Call</SelectItem>
                  <SelectItem value="in-person">In-Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duration (minutes) *</Label>
              <Select
                value={formData.duration_minutes}
                onValueChange={(value) => setFormData({ ...formData, duration_minutes: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interview_date">Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="interview_date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="interview_time">Time *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setUseCustomTime(!useCustomTime)}
                  className="h-6 text-xs"
                >
                  {useCustomTime ? "Use Dropdowns" : "Type Time"}
                </Button>
              </div>
              {useCustomTime ? (
                <Input
                  id="interview_time"
                  type="time"
                  value={formData.interview_time}
                  onChange={(e) => setFormData({ ...formData, interview_time: e.target.value })}
                  className="w-full"
                />
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={formData.interview_time.split(':')[0] ? (() => {
                      const hour = parseInt(formData.interview_time.split(':')[0]);
                      return hour === 0 ? '12' : hour > 12 ? (hour - 12).toString() : hour.toString();
                    })() : ''}
                    onValueChange={(value) => {
                      const currentTime = formData.interview_time.split(':');
                      const currentMinute = currentTime[1] || '00';
                      const isPM = currentTime[0] ? parseInt(currentTime[0]) >= 12 : false;
                      let hour24 = parseInt(value);
                      if (isPM && hour24 !== 12) hour24 += 12;
                      if (!isPM && hour24 === 12) hour24 = 0;
                      setFormData({ ...formData, interview_time: `${hour24.toString().padStart(2, '0')}:${currentMinute}` });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hour" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {Array.from({ length: 12 }, (_, i) => {
                        const hour = (i + 1).toString();
                        return (
                          <SelectItem key={hour} value={hour}>
                            {hour}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Select
                    value={formData.interview_time.split(':')[1] || ''}
                    onValueChange={(value) => {
                      const currentHour = formData.interview_time.split(':')[0] || '00';
                      setFormData({ ...formData, interview_time: `${currentHour}:${value}` });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Min" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {Array.from({ length: 60 }, (_, i) => {
                        const minute = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={minute} value={minute}>
                            {minute}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Select
                    value={formData.interview_time.split(':')[0] ? (parseInt(formData.interview_time.split(':')[0]) < 12 ? 'AM' : 'PM') : ''}
                    onValueChange={(value) => {
                      const currentTime = formData.interview_time.split(':');
                      if (currentTime[0]) {
                        let hour = parseInt(currentTime[0]);
                        if (value === 'AM' && hour >= 12) {
                          hour = hour - 12;
                        } else if (value === 'PM' && hour < 12) {
                          hour = hour + 12;
                        }
                        setFormData({ ...formData, interview_time: `${hour.toString().padStart(2, '0')}:${currentTime[1] || '00'}` });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="AM/PM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {formData.interview_type === 'video' && (
            <div className="space-y-2">
              <Label htmlFor="meeting_link">Meeting Link</Label>
              <Input
                id="meeting_link"
                type="url"
                placeholder="https://zoom.us/j/..."
                value={formData.meeting_link}
                onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
              />
            </div>
          )}

          {formData.interview_type === 'in-person' && (
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="123 Main St, City, State"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interviewer_name">Interviewer Name</Label>
              <Input
                id="interviewer_name"
                placeholder="John Doe"
                value={formData.interviewer_name}
                onChange={(e) => setFormData({ ...formData, interviewer_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interviewer_email">Interviewer Email</Label>
              <Input
                id="interviewer_email"
                type="email"
                placeholder="john@company.com"
                value={formData.interviewer_email}
                onChange={(e) => setFormData({ ...formData, interviewer_email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interviewer_phone">Interviewer Phone</Label>
              <Input
                id="interviewer_phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.interviewer_phone}
                onChange={(e) => setFormData({ ...formData, interviewer_phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about the interview..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Scheduling..." : "Schedule Interview"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
