import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell, Plus, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { markChecklistItemComplete } from '@/lib/checklist-utils';

interface FollowUpRemindersProps {
  jobId: string;
}

export function FollowUpReminders({ jobId }: FollowUpRemindersProps) {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReminder, setNewReminder] = useState({
    reminder_date: null as Date | null,
    reminder_type: 'email'
  });

  useEffect(() => {
    fetchReminders();
    checkAndCreateAutomatedReminders();
  }, [jobId]);

  const checkAndCreateAutomatedReminders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if reminders already exist for this job
      const { data: existingReminders } = await supabase
        .from('deadline_reminders' as any)
        .select('id')
        .eq('job_id', jobId);

      // If reminders already exist, don't auto-create
      if (existingReminders && existingReminders.length > 0) return;

      // Fetch the job to check for matching automation rules
      const { data: job, error: jobError } = await supabase
        .from('jobs' as any)
        .select('industry, job_type, status')
        .eq('id', jobId)
        .single();

      if (jobError || !job) return;

      // Fetch automation rules to find matching reminder defaults
      const { data: rules, error: rulesError } = await supabase
        .from('application_automation_rules' as any)
        .select('*')
        .eq('is_active', true);

      if (rulesError || !rules || rules.length === 0) return;

      // Find matching rule - strict matching on ALL conditions
      const matchingRule = (rules as any[]).find((rule: any) => {
        const conditions = rule.conditions as any;
        const jobData = job as any;
        const jobIndustry = jobData.industry?.toLowerCase().trim() || '';
        const jobType = jobData.job_type?.toLowerCase().trim() || '';
        const ruleIndustry = conditions.industry?.toLowerCase().trim() || '';
        const ruleJobType = conditions.jobType?.toLowerCase().trim() || '';
        
        // ALL specified conditions must match exactly
        const industryMatch = !ruleIndustry || jobIndustry === ruleIndustry;
        const jobTypeMatch = !ruleJobType || jobType === ruleJobType;
        
        return industryMatch && jobTypeMatch && rule.actions?.reminder_defaults;
      });

      if (matchingRule?.actions?.reminder_defaults) {
        const reminderDefaults = matchingRule.actions.reminder_defaults as any;
        
        console.log('Found matching rule:', matchingRule.rule_name);
        console.log('Reminder defaults:', reminderDefaults);
        
        const remindersToCreate: any[] = [];

        // Create reminders based on the rule
        const followUpDays = parseInt(reminderDefaults.followUpDays) || 7;
        const reminderType = reminderDefaults.reminderType || 'email';
        
        if (followUpDays > 0) {
          const followUpDate = new Date();
          followUpDate.setDate(followUpDate.getDate() + followUpDays);
          
          console.log('Creating reminder:', {
            followUpDays,
            reminderType,
            followUpDate: followUpDate.toISOString()
          });
          
          remindersToCreate.push({
            job_id: jobId,
            user_id: user.id,
            reminder_date: followUpDate.toISOString(),
            reminder_type: reminderType,
            is_sent: false
          });
        }

        if (remindersToCreate.length > 0) {
          const { error: insertError } = await supabase
            .from('deadline_reminders' as any)
            .insert(remindersToCreate);
          
          if (insertError) {
            console.error('Error inserting reminders:', insertError);
          } else {
            console.log('Reminders created successfully');
          }
        }
      } else {
        console.log('No matching rule found or no reminder_defaults configured');
      }
    } catch (error) {
      console.error('Error creating automated reminders:', error);
    }
  };

  const fetchReminders = async () => {
    try {
      const { data, error } = await supabase
        .from('deadline_reminders' as any)
        .select('*')
        .eq('job_id', jobId)
        .order('reminder_date', { ascending: true });

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  const createReminder = async () => {
    if (!newReminder.reminder_date) {
      toast.error('Please select a reminder date');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('deadline_reminders' as any)
        .insert({
          job_id: jobId,
          user_id: user.id,
          reminder_date: newReminder.reminder_date.toISOString(),
          reminder_type: newReminder.reminder_type,
          is_sent: false
        });

      if (error) throw error;

      toast.success('Follow-up reminder created');
      
      // Auto-complete the "follow up" checklist item
      await markChecklistItemComplete(jobId, 'follow_up');
      
      setNewReminder({ reminder_date: null, reminder_type: 'email' });
      fetchReminders();
    } catch (error: any) {
      console.error('Error creating reminder:', error);
      toast.error(error.message || 'Failed to create reminder');
    }
  };

  const deleteReminder = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('deadline_reminders' as any)
        .delete()
        .eq('id', reminderId);

      if (error) throw error;

      toast.success('Reminder deleted');
      fetchReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast.error('Failed to delete reminder');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Follow-Up Reminders
        </CardTitle>
        <CardDescription>
          Set automated reminders to follow up on this application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create New Reminder */}
        <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
          <h4 className="font-medium text-sm">Add New Reminder</h4>
          <div className="grid gap-3">
            <div>
              <Label>Reminder Date</Label>
              <DatePicker
                date={newReminder.reminder_date}
                onSelect={(date) => setNewReminder({ ...newReminder, reminder_date: date || null })}
              />
            </div>
            <div>
              <Label>Reminder Type</Label>
              <Select
                value={newReminder.reminder_type}
                onValueChange={(value) => setNewReminder({ ...newReminder, reminder_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email Notification</SelectItem>
                  <SelectItem value="push">Push Notification</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createReminder} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Reminder
            </Button>
          </div>
        </div>

        {/* Existing Reminders */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Scheduled Reminders</h4>
          {reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No reminders set yet
            </p>
          ) : (
            reminders.map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(reminder.reminder_date), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {reminder.reminder_type} • {reminder.is_sent ? 'Sent' : 'Pending'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteReminder(reminder.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
