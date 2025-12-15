-- Add missing columns for relationship health metrics
ALTER TABLE public.relationship_health_metrics 
ADD COLUMN IF NOT EXISTS response_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS mutual_value_score INTEGER;

-- Add helpful comments
COMMENT ON COLUMN public.relationship_health_metrics.response_rate IS 'Response rate from contact (0.00 to 1.00)';
COMMENT ON COLUMN public.relationship_health_metrics.mutual_value_score IS 'Score representing mutual value exchange (0-100)';