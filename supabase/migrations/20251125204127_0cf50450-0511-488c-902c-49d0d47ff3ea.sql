-- Add market_position field to company_research table
ALTER TABLE public.company_research
ADD COLUMN IF NOT EXISTS market_position jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.company_research.market_position IS 'Structured market position analysis including market share, positioning strategy, growth stage, and competitive advantages';