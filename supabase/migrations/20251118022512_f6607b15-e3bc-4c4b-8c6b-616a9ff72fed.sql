-- Create interviews table for UC-071
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  interview_type TEXT NOT NULL CHECK (interview_type IN ('phone', 'video', 'in-person')),
  interview_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  location TEXT,
  meeting_link TEXT,
  interviewer_name TEXT,
  interviewer_email TEXT,
  interviewer_phone TEXT,
  notes TEXT,
  preparation_tasks JSONB DEFAULT '[]'::jsonb,
  outcome TEXT CHECK (outcome IN ('pending', 'passed', 'failed', 'cancelled', 'rescheduled')),
  outcome_notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for interviews
CREATE POLICY "Users can view own interviews"
  ON public.interviews FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own interviews"
  ON public.interviews FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own interviews"
  ON public.interviews FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own interviews"
  ON public.interviews FOR DELETE
  USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_interviews_user_id ON public.interviews(user_id);
CREATE INDEX idx_interviews_job_id ON public.interviews(job_id);
CREATE INDEX idx_interviews_date ON public.interviews(interview_date);

-- Create application_metrics table for UC-072
CREATE TABLE IF NOT EXISTS public.application_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC,
  metric_data JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.application_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for application_metrics
CREATE POLICY "Users can view own metrics"
  ON public.application_metrics FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own metrics"
  ON public.application_metrics FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_application_metrics_user_id ON public.application_metrics(user_id);
CREATE INDEX idx_application_metrics_job_id ON public.application_metrics(job_id);
CREATE INDEX idx_application_metrics_type ON public.application_metrics(metric_type);

-- Create user_goals table for goal tracking
CREATE TABLE IF NOT EXISTS public.user_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_type TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  time_period TEXT NOT NULL CHECK (time_period IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_goals
CREATE POLICY "Users can view own goals"
  ON public.user_goals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own goals"
  ON public.user_goals FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own goals"
  ON public.user_goals FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own goals"
  ON public.user_goals FOR DELETE
  USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_user_goals_user_id ON public.user_goals(user_id);
CREATE INDEX idx_user_goals_active ON public.user_goals(is_active);