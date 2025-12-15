-- Create salary research table
CREATE TABLE IF NOT EXISTS public.salary_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  location TEXT,
  experience_level TEXT,
  company_size TEXT,
  
  -- Salary data
  salary_range_min INTEGER,
  salary_range_max INTEGER,
  median_salary INTEGER,
  percentile_25 INTEGER,
  percentile_75 INTEGER,
  
  -- Compensation breakdown
  base_salary_avg INTEGER,
  bonus_avg INTEGER,
  equity_avg INTEGER,
  benefits_value INTEGER,
  total_compensation_avg INTEGER,
  
  -- Market comparison
  market_comparisons JSONB DEFAULT '[]'::jsonb,
  similar_positions JSONB DEFAULT '[]'::jsonb,
  
  -- Trends and insights
  historical_trends JSONB DEFAULT '[]'::jsonb,
  negotiation_recommendations JSONB DEFAULT '[]'::jsonb,
  competitive_analysis TEXT,
  
  -- User context
  current_compensation INTEGER,
  compensation_gap INTEGER,
  market_position TEXT, -- "below", "at", "above" market
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.salary_research ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own salary research"
  ON public.salary_research
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own salary research"
  ON public.salary_research
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own salary research"
  ON public.salary_research
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own salary research"
  ON public.salary_research
  FOR DELETE
  USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_salary_research_user_job ON public.salary_research(user_id, job_id);
CREATE INDEX idx_salary_research_created ON public.salary_research(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER set_salary_research_updated_at
  BEFORE UPDATE ON public.salary_research
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();