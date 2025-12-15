-- Create table for technical prep practice attempts
CREATE TABLE public.technical_prep_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL,
  difficulty_level TEXT NOT NULL,
  question_title TEXT NOT NULL,
  question_data JSONB NOT NULL,
  user_solution TEXT NOT NULL,
  ai_feedback JSONB,
  score INTEGER,
  time_spent_seconds INTEGER,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technical_prep_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own attempts" 
ON public.technical_prep_attempts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attempts" 
ON public.technical_prep_attempts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_technical_prep_attempts_user_id ON public.technical_prep_attempts(user_id);
CREATE INDEX idx_technical_prep_attempts_job_id ON public.technical_prep_attempts(job_id);
CREATE INDEX idx_technical_prep_attempts_completed_at ON public.technical_prep_attempts(completed_at DESC);