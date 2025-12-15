-- Add historical performance tracking columns to interview_success_predictions
ALTER TABLE interview_success_predictions
ADD COLUMN IF NOT EXISTS historical_success_rate NUMERIC,
ADD COLUMN IF NOT EXISTS performance_trend TEXT CHECK (performance_trend IN ('improving', 'declining', 'stable'));