-- Create market intelligence tables for UC-092

-- Market trends tracking
CREATE TABLE IF NOT EXISTS public.market_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  industry TEXT NOT NULL,
  location TEXT,
  trend_type TEXT NOT NULL, -- 'job_demand', 'skill_demand', 'salary', 'company_growth', 'disruption'
  trend_data JSONB NOT NULL,
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_sources JSONB,
  confidence_score NUMERIC(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market insights and recommendations
CREATE TABLE IF NOT EXISTS public.market_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL, -- 'skill_development', 'career_positioning', 'market_opportunity', 'competitive_analysis'
  industry TEXT NOT NULL,
  insight_title TEXT NOT NULL,
  insight_description TEXT NOT NULL,
  recommendations JSONB,
  priority_level TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  action_items JSONB,
  impact_assessment TEXT,
  timeframe TEXT, -- 'immediate', 'short_term', 'long_term'
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Skill demand tracking
CREATE TABLE IF NOT EXISTS public.skill_demand_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  demand_score NUMERIC(5,2) NOT NULL, -- 0-100 score
  growth_rate NUMERIC(5,2), -- percentage growth
  market_saturation NUMERIC(3,2), -- 0-1 scale
  average_salary NUMERIC(12,2),
  job_posting_count INTEGER,
  trend_direction TEXT, -- 'rising', 'stable', 'declining', 'emerging'
  related_skills JSONB,
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company growth tracking
CREATE TABLE IF NOT EXISTS public.company_growth_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  growth_indicators JSONB, -- hiring_velocity, funding, expansion, etc.
  hiring_activity TEXT, -- 'high', 'moderate', 'low', 'declining'
  recent_news JSONB,
  opportunity_score NUMERIC(3,2), -- 0-1 scale
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.market_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_demand_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_growth_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own market trends"
  ON public.market_trends FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own market trends"
  ON public.market_trends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own market insights"
  ON public.market_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own market insights"
  ON public.market_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own market insights"
  ON public.market_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own skill demand trends"
  ON public.skill_demand_trends FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own skill demand trends"
  ON public.skill_demand_trends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own company growth tracking"
  ON public.company_growth_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company growth tracking"
  ON public.company_growth_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_market_trends_user_industry ON public.market_trends(user_id, industry, analysis_date);
CREATE INDEX idx_market_insights_user_priority ON public.market_insights(user_id, priority_level, acknowledged);
CREATE INDEX idx_skill_demand_user_industry ON public.skill_demand_trends(user_id, industry, analysis_date);
CREATE INDEX idx_company_growth_user ON public.company_growth_tracking(user_id, analysis_date);

-- Trigger for updated_at
CREATE TRIGGER update_market_trends_updated_at
  BEFORE UPDATE ON public.market_trends
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();