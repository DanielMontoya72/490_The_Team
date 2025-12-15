-- Create job_status_history table to track status changes over time
CREATE TABLE IF NOT EXISTS public.job_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_job_status_history_job_id ON public.job_status_history(job_id);
CREATE INDEX IF NOT EXISTS idx_job_status_history_user_id ON public.job_status_history(user_id);
CREATE INDEX IF NOT EXISTS idx_job_status_history_changed_at ON public.job_status_history(changed_at);

-- Enable RLS
ALTER TABLE public.job_status_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own job status history"
  ON public.job_status_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own job status history"
  ON public.job_status_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job status history"
  ON public.job_status_history
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job status history"
  ON public.job_status_history
  FOR DELETE
  USING (auth.uid() = user_id);
