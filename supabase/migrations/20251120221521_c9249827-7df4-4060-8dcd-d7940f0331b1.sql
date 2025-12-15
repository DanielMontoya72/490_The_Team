-- Create job search goals table
CREATE TABLE IF NOT EXISTS public.job_search_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  goal_type TEXT NOT NULL, -- 'applications', 'interviews', 'offers', 'response_rate', 'interview_rate', 'offer_rate'
  target_value NUMERIC NOT NULL,
  time_period TEXT NOT NULL, -- 'weekly', 'monthly', 'quarterly'
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_search_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own goals"
  ON public.job_search_goals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own goals"
  ON public.job_search_goals FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own goals"
  ON public.job_search_goals FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own goals"
  ON public.job_search_goals FOR DELETE
  USING (user_id = auth.uid());

-- Create index for performance
CREATE INDEX idx_job_search_goals_user_id ON public.job_search_goals(user_id);
CREATE INDEX idx_job_search_goals_active ON public.job_search_goals(user_id, is_active) WHERE is_active = true;