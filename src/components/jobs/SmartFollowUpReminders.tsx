import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Bell, 
  BellOff, 
  Clock, 
  Mail, 
  CheckCircle, 
  X, 
  AlarmClock, 
  Lightbulb, 
  RefreshCw,
  Send,
  Copy,
  Plus
} from 'lucide-react';
import { format, formatDistanceToNow, addDays, isPast, isToday } from 'date-fns';

interface SmartFollowUpRemindersProps {
  jobId: string;
  jobStatus?: string;
  companyName?: string;
  jobTitle?: string;
}

export function SmartFollowUpReminders({ jobId, jobStatus, companyName, jobTitle }: SmartFollowUpRemindersProps) {
  const queryClient = useQueryClient();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<any>(null);
  const [editedTemplate, setEditedTemplate] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [snoozeDialogOpen, setSnoozeDialogOpen] = useState(false);
  const [snoozeDays, setSnoozeDays] = useState('3');

  // Fetch reminders
  const { data: reminders, isLoading } = useQuery({
    queryKey: ['smart-follow-up-reminders', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('smart_follow_up_reminders')
        .select('*')
        .eq('job_id', jobId)
        .order('reminder_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Generate smart reminder
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-smart-follow-up', {
        body: { 
          jobId, 
          userId: user.id,
          stage: jobStatus,
          companyName,
          jobTitle
        }
      });

      if (error) throw error;
      if (data.disabled) throw new Error(data.message);
      if (data.existing) throw new Error(data.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-follow-up-reminders', jobId] });
      toast.success('Smart follow-up reminder created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create reminder');
    },
  });

  // Mark as completed
  const completeMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from('smart_follow_up_reminders')
        .update({ 
          is_completed: true,
          follow_up_count: (reminders?.find(r => r.id === reminderId)?.follow_up_count || 0) + 1
        })
        .eq('id', reminderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-follow-up-reminders', jobId] });
      toast.success('Follow-up marked as completed');
    },
  });

  // Dismiss reminder
  const dismissMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from('smart_follow_up_reminders')
        .update({ is_dismissed: true })
        .eq('id', reminderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-follow-up-reminders', jobId] });
      toast.success('Reminder dismissed');
    },
  });

  // Snooze reminder
  const snoozeMutation = useMutation({
    mutationFn: async ({ reminderId, days }: { reminderId: string; days: number }) => {
      const snoozeUntil = addDays(new Date(), days);
      const { error } = await supabase
        .from('smart_follow_up_reminders')
        .update({ 
          is_snoozed: true,
          snooze_until: snoozeUntil.toISOString(),
          reminder_date: snoozeUntil.toISOString()
        })
        .eq('id', reminderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-follow-up-reminders', jobId] });
      setSnoozeDialogOpen(false);
      toast.success(`Reminder snoozed for ${snoozeDays} days`);
    },
  });

  // Mark response received
  const markResponseMutation = useMutation({
    mutationFn: async ({ reminderId, received }: { reminderId: string; received: boolean }) => {
      const { error } = await supabase
        .from('smart_follow_up_reminders')
        .update({ 
          response_received: received,
          response_date: received ? new Date().toISOString() : null,
          company_responsiveness: received ? 'responsive' : 'unknown'
        })
        .eq('id', reminderId);

      if (error) throw error;
    },
    onSuccess: (_, { received }) => {
      queryClient.invalidateQueries({ queryKey: ['smart-follow-up-reminders', jobId] });
      toast.success(received ? 'Response marked as received' : 'Response status cleared');
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const activeReminders = reminders?.filter(r => !r.is_completed && !r.is_dismissed) || [];
  const completedReminders = reminders?.filter(r => r.is_completed) || [];
  const isRejected = jobStatus === 'rejected' || jobStatus === 'withdrawn';

  const getReminderPriority = (reminder: any) => {
    const reminderDate = new Date(reminder.reminder_date);
    if (isPast(reminderDate) && !isToday(reminderDate)) return 'overdue';
    if (isToday(reminderDate)) return 'today';
    return 'upcoming';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle className="text-lg">Smart Follow-Up Reminders</CardTitle>
          </div>
          {!isRejected && (
            <Button 
              size="sm" 
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Generate Reminder
            </Button>
          )}
        </div>
        <CardDescription>
          Intelligent follow-up scheduling based on your application stage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRejected && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-muted-foreground">
            <BellOff className="h-4 w-4" />
            <span className="text-sm">Follow-up reminders are disabled for rejected/withdrawn applications</span>
          </div>
        )}

        {activeReminders.length === 0 && !isRejected ? (
          <div className="text-center py-6 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active reminders</p>
            <p className="text-xs">Click "Generate Reminder" to create a smart follow-up</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeReminders.map((reminder) => {
              const priority = getReminderPriority(reminder);
              return (
                <div
                  key={reminder.id}
                  className={`p-4 rounded-lg border ${
                    priority === 'overdue' 
                      ? 'border-destructive/50 bg-destructive/5' 
                      : priority === 'today'
                        ? 'border-warning/50 bg-warning/5'
                        : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {format(new Date(reminder.reminder_date), 'MMM d, yyyy')}
                        </span>
                        <Badge variant={
                          priority === 'overdue' ? 'destructive' : 
                          priority === 'today' ? 'default' : 'secondary'
                        }>
                          {priority === 'overdue' ? 'Overdue' : 
                           priority === 'today' ? 'Today' : 
                           formatDistanceToNow(new Date(reminder.reminder_date), { addSuffix: true })}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {reminder.suggested_timing} • Stage: {reminder.application_stage}
                      </p>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Dialog open={showTemplateDialog && selectedReminder?.id === reminder.id} onOpenChange={(open) => {
                          setShowTemplateDialog(open);
                          if (open) {
                            setSelectedReminder(reminder);
                            setEditedSubject(reminder.email_subject || '');
                            setEditedTemplate(reminder.email_template || '');
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Mail className="h-3 w-3 mr-1" />
                              View Template
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Follow-Up Email Template</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Subject</Label>
                                <div className="flex gap-2">
                                  <Input 
                                    value={editedSubject}
                                    onChange={(e) => setEditedSubject(e.target.value)}
                                  />
                                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(editedSubject)}>
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <Label>Email Body</Label>
                                <div className="flex gap-2">
                                  <Textarea 
                                    value={editedTemplate}
                                    onChange={(e) => setEditedTemplate(e.target.value)}
                                    rows={12}
                                    className="font-mono text-sm"
                                  />
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="mt-2"
                                  onClick={() => copyToClipboard(editedTemplate)}
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy Email
                                </Button>
                              </div>

                              {/* Etiquette Tips */}
                              {reminder.etiquette_tips && reminder.etiquette_tips.length > 0 && (
                                <Accordion type="single" collapsible>
                                  <AccordionItem value="tips">
                                    <AccordionTrigger className="text-sm">
                                      <div className="flex items-center gap-2">
                                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                                        Etiquette Tips
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <ul className="space-y-2">
                                        {reminder.etiquette_tips.map((tip: string, i: number) => (
                                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                            <span className="text-primary">•</span>
                                            {tip}
                                          </li>
                                        ))}
                                      </ul>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => completeMutation.mutate(reminder.id)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Complete
                        </Button>

                        <Dialog open={snoozeDialogOpen && selectedReminder?.id === reminder.id} onOpenChange={(open) => {
                          setSnoozeDialogOpen(open);
                          if (open) setSelectedReminder(reminder);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <AlarmClock className="h-3 w-3 mr-1" />
                              Snooze
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Snooze Reminder</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Snooze for</Label>
                                <Select value={snoozeDays} onValueChange={setSnoozeDays}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">1 day</SelectItem>
                                    <SelectItem value="2">2 days</SelectItem>
                                    <SelectItem value="3">3 days</SelectItem>
                                    <SelectItem value="5">5 days</SelectItem>
                                    <SelectItem value="7">1 week</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button 
                                onClick={() => snoozeMutation.mutate({ 
                                  reminderId: reminder.id, 
                                  days: parseInt(snoozeDays) 
                                })}
                                disabled={snoozeMutation.isPending}
                              >
                                Confirm Snooze
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => dismissMutation.mutate(reminder.id)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Dismiss
                        </Button>
                      </div>

                      {/* Response tracking */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                        <span className="text-xs text-muted-foreground">Response:</span>
                        <Button
                          variant={reminder.response_received ? "default" : "outline"}
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => markResponseMutation.mutate({ 
                            reminderId: reminder.id, 
                            received: !reminder.response_received 
                          })}
                        >
                          {reminder.response_received ? 'Received ✓' : 'Mark as Received'}
                        </Button>
                        {reminder.follow_up_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {reminder.follow_up_count} follow-up{reminder.follow_up_count > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Completed Reminders */}
        {completedReminders.length > 0 && (
          <Accordion type="single" collapsible className="mt-4">
            <AccordionItem value="completed">
              <AccordionTrigger className="text-sm text-muted-foreground">
                Completed Follow-ups ({completedReminders.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {completedReminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>{reminder.application_stage}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">
                          {format(new Date(reminder.updated_at), 'MMM d')}
                        </span>
                      </div>
                      {reminder.response_received && (
                        <Badge variant="outline" className="text-xs text-green-600">
                          Response received
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}