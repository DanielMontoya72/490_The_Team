-- Add negotiation outcome tracking columns to salary_research
ALTER TABLE salary_research ADD COLUMN IF NOT EXISTS negotiation_outcome text;
ALTER TABLE salary_research ADD COLUMN IF NOT EXISTS final_salary integer;
ALTER TABLE salary_research ADD COLUMN IF NOT EXISTS negotiation_success boolean;
ALTER TABLE salary_research ADD COLUMN IF NOT EXISTS negotiated_at timestamp with time zone;
ALTER TABLE salary_research ADD COLUMN IF NOT EXISTS original_offer integer;
ALTER TABLE salary_research ADD COLUMN IF NOT EXISTS salary_increase_amount integer;
ALTER TABLE salary_research ADD COLUMN IF NOT EXISTS salary_increase_percentage numeric;

-- Create salary_progression table for tracking career salary history
CREATE TABLE IF NOT EXISTS salary_progression (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_title text NOT NULL,
  company_name text,
  location text,
  industry text,
  base_salary integer NOT NULL,
  bonus integer DEFAULT 0,
  equity_value integer DEFAULT 0,
  benefits_value integer DEFAULT 0,
  total_compensation integer NOT NULL,
  start_date date NOT NULL,
  end_date date,
  is_current boolean DEFAULT false,
  salary_type text DEFAULT 'offer', -- 'offer', 'current', 'historical'
  negotiation_attempted boolean DEFAULT false,
  negotiation_successful boolean,
  original_offer integer,
  final_offer integer,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE salary_progression ENABLE ROW LEVEL SECURITY;

-- RLS policies for salary_progression
CREATE POLICY "Users can view own salary progression"
  ON salary_progression FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own salary progression"
  ON salary_progression FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own salary progression"
  ON salary_progression FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own salary progression"
  ON salary_progression FOR DELETE
  USING (user_id = auth.uid());

-- Create salary_analytics_snapshots table for periodic market position snapshots
CREATE TABLE IF NOT EXISTS salary_analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  current_total_compensation integer,
  market_median integer,
  market_percentile_25 integer,
  market_percentile_75 integer,
  market_position text, -- 'below', 'at', 'above'
  percentile_rank integer,
  industry text,
  location text,
  job_title text,
  years_experience integer,
  career_growth_rate numeric,
  negotiation_success_rate numeric,
  total_negotiations integer DEFAULT 0,
  successful_negotiations integer DEFAULT 0,
  ai_recommendations jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE salary_analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for salary_analytics_snapshots
CREATE POLICY "Users can view own salary analytics snapshots"
  ON salary_analytics_snapshots FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own salary analytics snapshots"
  ON salary_analytics_snapshots FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own salary analytics snapshots"
  ON salary_analytics_snapshots FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own salary analytics snapshots"
  ON salary_analytics_snapshots FOR DELETE
  USING (user_id = auth.uid());