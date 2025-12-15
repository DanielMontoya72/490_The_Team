-- Create saved market searches table
CREATE TABLE IF NOT EXISTS public.saved_market_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  search_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  location TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_market_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_market_searches
CREATE POLICY "Users can view their own saved searches"
  ON public.saved_market_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved searches"
  ON public.saved_market_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved searches"
  ON public.saved_market_searches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved searches"
  ON public.saved_market_searches FOR DELETE
  USING (auth.uid() = user_id);

-- Add favorited column to market_insights table
ALTER TABLE public.market_insights ADD COLUMN IF NOT EXISTS is_favorited BOOLEAN DEFAULT false;
ALTER TABLE public.market_insights ADD COLUMN IF NOT EXISTS favorited_at TIMESTAMPTZ;

-- Add favorited column to skill_demand_trends table
ALTER TABLE public.skill_demand_trends ADD COLUMN IF NOT EXISTS is_favorited BOOLEAN DEFAULT false;
ALTER TABLE public.skill_demand_trends ADD COLUMN IF NOT EXISTS favorited_at TIMESTAMPTZ;

-- Add favorited column to market_trends table
ALTER TABLE public.market_trends ADD COLUMN IF NOT EXISTS is_favorited BOOLEAN DEFAULT false;
ALTER TABLE public.market_trends ADD COLUMN IF NOT EXISTS favorited_at TIMESTAMPTZ;

-- Add favorited column to company_growth_tracking table
ALTER TABLE public.company_growth_tracking ADD COLUMN IF NOT EXISTS is_favorited BOOLEAN DEFAULT false;
ALTER TABLE public.company_growth_tracking ADD COLUMN IF NOT EXISTS favorited_at TIMESTAMPTZ;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_market_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_market_insights_favorited ON public.market_insights(user_id, is_favorited);
CREATE INDEX IF NOT EXISTS idx_skill_trends_favorited ON public.skill_demand_trends(user_id, is_favorited);
CREATE INDEX IF NOT EXISTS idx_market_trends_favorited ON public.market_trends(user_id, is_favorited);

-- Create updated_at trigger for saved_market_searches
CREATE TRIGGER update_saved_market_searches_updated_at
  BEFORE UPDATE ON public.saved_market_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();