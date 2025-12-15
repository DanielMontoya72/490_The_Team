-- Create technical challenges table
CREATE TABLE IF NOT EXISTS public.technical_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  interview_id UUID REFERENCES public.interviews(id) ON DELETE SET NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('coding', 'system_design', 'case_study', 'whiteboarding')),
  difficulty_level TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tech_stack TEXT[] DEFAULT '{}',
  time_limit_minutes INTEGER DEFAULT 60,
  solution_framework JSONB,
  best_practices JSONB,
  hints JSONB,
  test_cases JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create technical challenge attempts table
CREATE TABLE IF NOT EXISTS public.technical_challenge_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.technical_challenges(id) ON DELETE CASCADE,
  solution_text TEXT,
  code_solution TEXT,
  time_taken_minutes INTEGER,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  ai_feedback JSONB,
  performance_metrics JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technical_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_challenge_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for technical_challenges
CREATE POLICY "Users can view their own technical challenges"
  ON public.technical_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own technical challenges"
  ON public.technical_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own technical challenges"
  ON public.technical_challenges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own technical challenges"
  ON public.technical_challenges FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for technical_challenge_attempts
CREATE POLICY "Users can view their own challenge attempts"
  ON public.technical_challenge_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own challenge attempts"
  ON public.technical_challenge_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge attempts"
  ON public.technical_challenge_attempts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own challenge attempts"
  ON public.technical_challenge_attempts FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_technical_challenges_updated_at
  BEFORE UPDATE ON public.technical_challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technical_challenge_attempts_updated_at
  BEFORE UPDATE ON public.technical_challenge_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_technical_challenges_user_job ON public.technical_challenges(user_id, job_id);
CREATE INDEX idx_technical_challenges_type ON public.technical_challenges(challenge_type);
CREATE INDEX idx_technical_challenge_attempts_user_challenge ON public.technical_challenge_attempts(user_id, challenge_id);
CREATE INDEX idx_technical_challenge_attempts_completed ON public.technical_challenge_attempts(completed_at);