-- Create job offers table for comparison
CREATE TABLE public.job_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  
  -- Basic info
  company_name TEXT NOT NULL,
  position_title TEXT NOT NULL,
  location TEXT,
  remote_policy TEXT, -- 'remote', 'hybrid', 'onsite'
  
  -- Compensation
  base_salary NUMERIC NOT NULL,
  signing_bonus NUMERIC DEFAULT 0,
  annual_bonus_percent NUMERIC DEFAULT 0,
  equity_value NUMERIC DEFAULT 0,
  equity_vesting_years INTEGER DEFAULT 4,
  
  -- Benefits
  health_insurance_value NUMERIC DEFAULT 0,
  retirement_match_percent NUMERIC DEFAULT 0,
  retirement_max_match NUMERIC DEFAULT 0,
  pto_days INTEGER DEFAULT 0,
  other_benefits_value NUMERIC DEFAULT 0,
  benefits_notes TEXT,
  
  -- Non-financial scores (1-10)
  culture_fit_score INTEGER,
  growth_opportunity_score INTEGER,
  work_life_balance_score INTEGER,
  job_security_score INTEGER,
  commute_score INTEGER,
  
  -- Calculated fields
  total_compensation NUMERIC,
  adjusted_compensation NUMERIC, -- COL adjusted
  cost_of_living_index NUMERIC DEFAULT 100,
  weighted_score NUMERIC,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'accepted', 'declined', 'expired'
  offer_date DATE,
  expiration_date DATE,
  decision_date DATE,
  decline_reason TEXT,
  
  -- Scenario analysis
  scenario_adjustments JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own job offers"
  ON public.job_offers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own job offers"
  ON public.job_offers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own job offers"
  ON public.job_offers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own job offers"
  ON public.job_offers FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_job_offers_updated_at
  BEFORE UPDATE ON public.job_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index
CREATE INDEX idx_job_offers_user_id ON public.job_offers(user_id);
CREATE INDEX idx_job_offers_status ON public.job_offers(status);