import { supabase } from '@/integrations/supabase/client';

/**
 * Automatically creates default follow-up reminders for a new job
 * - 3 days after application: Initial follow-up
 * - 7 days after application: Second follow-up
 * - 14 days after application: Final follow-up
 */
export async function createDefaultReminders(jobId: string, userId: string): Promise<void> {
  try {
    // Check if reminders already exist for this job
    const { data: existingReminders } = await supabase
      .from('deadline_reminders' as any)
      .select('id')
      .eq('job_id', jobId);

    // If reminders already exist, don't auto-create
    if (existingReminders && existingReminders.length > 0) {
      console.log('Reminders already exist for this job, skipping auto-creation');
      return;
    }

    const remindersToCreate = [
      {
        job_id: jobId,
        user_id: userId,
        reminder_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
        reminder_type: 'email',
        is_sent: false,
        notes: 'Initial follow-up reminder'
      },
      {
        job_id: jobId,
        user_id: userId,
        reminder_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        reminder_type: 'email',
        is_sent: false,
        notes: 'Second follow-up reminder'
      },
      {
        job_id: jobId,
        user_id: userId,
        reminder_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
        reminder_type: 'email',
        is_sent: false,
        notes: 'Final follow-up reminder'
      }
    ];

    const { error } = await supabase
      .from('deadline_reminders' as any)
      .insert(remindersToCreate);

    if (error) {
      console.error('Error creating default reminders:', error);
    } else {
      console.log('Default reminders created successfully');
    }
  } catch (error) {
    // Silently fail - don't block job creation if reminders fail
    console.error('Failed to create default reminders:', error);
  }
}

/**
 * Creates reminder when job status changes to "Applied"
 */
export async function createApplicationReminder(jobId: string, userId: string): Promise<void> {
  try {
    // Check if a reminder already exists for this specific use case
    const { data: existingReminders } = await supabase
      .from('deadline_reminders' as any)
      .select('id')
      .eq('job_id', jobId)
      .gte('reminder_date', new Date().toISOString());

    // If future reminders already exist, don't create duplicate
    if (existingReminders && existingReminders.length > 0) {
      console.log('Future reminders already exist for this job');
      return;
    }

    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 7); // 7 days after applying

    const { error } = await supabase
      .from('deadline_reminders' as any)
      .insert({
        job_id: jobId,
        user_id: userId,
        reminder_date: reminderDate.toISOString(),
        reminder_type: 'email',
        is_sent: false,
        notes: 'Follow up on application'
      });

    if (error) {
      console.error('Error creating application reminder:', error);
    } else {
      console.log('Application reminder created successfully');
    }
  } catch (error) {
    console.error('Failed to create application reminder:', error);
  }
}

/**
 * Creates reminder for interview preparation (24 hours before)
 */
export async function createInterviewReminder(jobId: string, userId: string, interviewDate: Date): Promise<void> {
  try {
    const reminderDate = new Date(interviewDate);
    reminderDate.setHours(reminderDate.getHours() - 24); // 24 hours before

    const { error } = await supabase
      .from('deadline_reminders' as any)
      .insert({
        job_id: jobId,
        user_id: userId,
        reminder_date: reminderDate.toISOString(),
        reminder_type: 'both',
        is_sent: false,
        notes: 'Interview preparation reminder'
      });

    if (error) {
      console.error('Error creating interview reminder:', error);
    } else {
      console.log('Interview reminder created successfully');
    }
  } catch (error) {
    console.error('Failed to create interview reminder:', error);
  }
}
