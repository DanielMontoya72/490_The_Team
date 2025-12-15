-- Create smart follow-up reminders table
CREATE TABLE public.smart_follow_up_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  application_stage TEXT NOT NULL,
  reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_type TEXT NOT NULL DEFAULT 'application_follow_up',
  suggested_timing TEXT,
  email_subject TEXT,
  email_template TEXT,
  etiquette_tips TEXT[],
  is_completed BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  is_snoozed BOOLEAN DEFAULT false,
  snooze_until TIMESTAMP WITH TIME ZONE,
  response_received BOOLEAN DEFAULT false,
  response_date TIMESTAMP WITH TIME ZONE,
  company_responsiveness TEXT DEFAULT 'unknown',
  follow_up_count INTEGER DEFAULT 0,
  max_follow_ups INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.smart_follow_up_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own smart reminders"
ON public.smart_follow_up_reminders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own smart reminders"
ON public.smart_follow_up_reminders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own smart reminders"
ON public.smart_follow_up_reminders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own smart reminders"
ON public.smart_follow_up_reminders FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_smart_follow_up_reminders_updated_at
BEFORE UPDATE ON public.smart_follow_up_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_smart_follow_up_reminders_user_job ON public.smart_follow_up_reminders(user_id, job_id);
CREATE INDEX idx_smart_follow_up_reminders_date ON public.smart_follow_up_reminders(reminder_date) WHERE is_completed = false AND is_dismissed = false;