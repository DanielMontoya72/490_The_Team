-- Add missing columns to relationship_health_metrics table
ALTER TABLE public.relationship_health_metrics 
ADD COLUMN IF NOT EXISTS health_status TEXT,
ADD COLUMN IF NOT EXISTS last_interaction_days INTEGER,
ADD COLUMN IF NOT EXISTS recommendations TEXT[];

-- Add a check constraint for health_status
ALTER TABLE public.relationship_health_metrics
ADD CONSTRAINT health_status_check 
CHECK (health_status IN ('strong', 'healthy', 'needs_attention', 'at_risk'));

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_relationship_health_metrics_health_status 
ON public.relationship_health_metrics(health_status);

CREATE INDEX IF NOT EXISTS idx_relationship_health_metrics_health_score 
ON public.relationship_health_metrics(health_score);