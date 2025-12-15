-- Drop the table if it exists to start fresh
DROP TABLE IF EXISTS public.technical_challenges CASCADE;

-- Create technical_challenges table for storing coding challenges, system design scenarios, and case studies
CREATE TABLE public.technical_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL,
  category TEXT NOT NULL,
  challenge_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  time_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT difficulty_check CHECK (difficulty IN ('easy', 'medium', 'hard')),
  CONSTRAINT category_check CHECK (category IN ('coding', 'system-design', 'case-study')),
  CONSTRAINT status_check CHECK (status IN ('active', 'completed', 'abandoned'))
);

-- Enable RLS
ALTER TABLE public.technical_challenges ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own challenges"
  ON public.technical_challenges
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own challenges"
  ON public.technical_challenges
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own challenges"
  ON public.technical_challenges
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own challenges"
  ON public.technical_challenges
  FOR DELETE
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_technical_challenges_user_id ON public.technical_challenges(user_id);
CREATE INDEX idx_technical_challenges_status ON public.technical_challenges(status);
CREATE INDEX idx_technical_challenges_category ON public.technical_challenges(category);

-- Add trigger for updated_at
CREATE TRIGGER update_technical_challenges_updated_at
  BEFORE UPDATE ON public.technical_challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
