-- Create job_todos table
CREATE TABLE IF NOT EXISTS public.job_todos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('interview_prep', 'research', 'follow_up', 'application', 'other')),
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_todos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own todos"
  ON public.job_todos
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own todos"
  ON public.job_todos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own todos"
  ON public.job_todos
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own todos"
  ON public.job_todos
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_job_todos_user_id ON public.job_todos(user_id);
CREATE INDEX IF NOT EXISTS idx_job_todos_job_id ON public.job_todos(job_id);
CREATE INDEX IF NOT EXISTS idx_job_todos_completed ON public.job_todos(completed);
CREATE INDEX IF NOT EXISTS idx_job_todos_due_date ON public.job_todos(due_date);