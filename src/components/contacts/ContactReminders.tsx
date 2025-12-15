import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, Calendar, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface ContactRemindersProps {
  contactId: string;
}

export function ContactReminders({ contactId }: ContactRemindersProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date>(addWeeks(new Date(), 1));
  const [formData, setFormData] = useState({
    reminder_type: "follow_up",
    reminder_message: ""
  });

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['contact-reminders', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_reminders')
        .select('*')
        .eq('contact_id', contactId)
        .order('reminder_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const addReminderMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('contact_reminders')
        .insert({
          user_id: user.id,
          contact_id: contactId,
          reminder_type: formData.reminder_type,
          reminder_date: format(reminderDate, "yyyy-MM-dd"),
          reminder_message: formData.reminder_message || null,
          is_completed: false
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-reminders', contactId] });
      toast({
        title: "Reminder Added",
        description: "Relationship maintenance reminder created successfully.",
      });
      setFormData({ reminder_type: "follow_up", reminder_message: "" });
      setReminderDate(addWeeks(new Date(), 1));
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Reminder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string; isCompleted: boolean }) => {
      const { error } = await supabase
        .from('contact_reminders')
        .update({
          is_completed: !isCompleted,
          completed_at: !isCompleted ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-reminders', contactId] });
    },
  });

  const deleteReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-reminders', contactId] });
      toast({
        title: "Reminder Deleted",
        description: "Reminder removed successfully.",
      });
    },
  });

  const setQuickReminder = (type: 'week' | 'month' | 'quarter') => {
    const date = type === 'week' ? addWeeks(new Date(), 1)
      : type === 'month' ? addMonths(new Date(), 1)
      : addMonths(new Date(), 3);
    setReminderDate(date);
  };

  const getReminderColor = (type: string, isPast: boolean, isCompleted: boolean) => {
    if (isCompleted) return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (isPast) return 'bg-red-500/10 text-red-500 border-red-500/20';
    
    const colors = {
      follow_up: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      birthday: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
      check_in: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      other: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  const upcomingReminders = reminders?.filter(r => !r.is_completed && new Date(r.reminder_date) >= new Date()) || [];
  const pastReminders = reminders?.filter(r => !r.is_completed && new Date(r.reminder_date) < new Date()) || [];
  const completedReminders = reminders?.filter(r => r.is_completed) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-6">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Relationship Maintenance
            </CardTitle>
            <CardDescription>
              Set reminders to stay in touch regularly
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Reminder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Reminder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Reminder Type</Label>
                  <Select value={formData.reminder_type} onValueChange={(value) => setFormData({ ...formData, reminder_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                      <SelectItem value="check_in">Check In</SelectItem>
                      <SelectItem value="birthday">Birthday</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Reminder Date</Label>
                  <div className="flex gap-2 mb-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setQuickReminder('week')}>
                      1 Week
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setQuickReminder('month')}>
                      1 Month
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setQuickReminder('quarter')}>
                      3 Months
                    </Button>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal")}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(reminderDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={reminderDate}
                        onSelect={(date) => date && setReminderDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Message (Optional)</Label>
                  <Textarea
                    value={formData.reminder_message}
                    onChange={(e) => setFormData({ ...formData, reminder_message: e.target.value })}
                    placeholder="Custom reminder message"
                    rows={2}
                  />
                </div>

                <Button
                  onClick={() => addReminderMutation.mutate()}
                  disabled={addReminderMutation.isPending}
                  className="w-full"
                >
                  {addReminderMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Reminder
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {pastReminders.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-destructive mb-3">Overdue</h4>
                <div className="space-y-2">
                  {pastReminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-start gap-3 p-3 rounded-lg border bg-destructive/5">
                      <Checkbox
                        checked={reminder.is_completed}
                        onCheckedChange={() => toggleCompleteMutation.mutate({ id: reminder.id, isCompleted: reminder.is_completed })}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={getReminderColor(reminder.reminder_type, true, reminder.is_completed)}>
                            {reminder.reminder_type.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm font-medium text-destructive">
                            {format(new Date(reminder.reminder_date), "MMM d, yyyy")}
                          </span>
                        </div>
                        {reminder.reminder_message && (
                          <p className="text-sm text-muted-foreground">{reminder.reminder_message}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteReminderMutation.mutate(reminder.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcomingReminders.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3">Upcoming</h4>
                <div className="space-y-2">
                  {upcomingReminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-start gap-3 p-3 rounded-lg border">
                      <Checkbox
                        checked={reminder.is_completed}
                        onCheckedChange={() => toggleCompleteMutation.mutate({ id: reminder.id, isCompleted: reminder.is_completed })}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={getReminderColor(reminder.reminder_type, false, reminder.is_completed)}>
                            {reminder.reminder_type.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm font-medium">
                            {format(new Date(reminder.reminder_date), "MMM d, yyyy")}
                          </span>
                        </div>
                        {reminder.reminder_message && (
                          <p className="text-sm text-muted-foreground">{reminder.reminder_message}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteReminderMutation.mutate(reminder.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {completedReminders.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3">Completed</h4>
                <div className="space-y-2">
                  {completedReminders.slice(0, 5).map((reminder) => (
                    <div key={reminder.id} className="flex items-start gap-3 p-3 rounded-lg border opacity-60">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={getReminderColor(reminder.reminder_type, false, true)}>
                            {reminder.reminder_type.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm">
                            {format(new Date(reminder.reminder_date), "MMM d, yyyy")}
                          </span>
                        </div>
                        {reminder.reminder_message && (
                          <p className="text-sm text-muted-foreground">{reminder.reminder_message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reminders && reminders.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No reminders set yet</p>
                <p className="text-sm">Create reminders to maintain regular contact</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
