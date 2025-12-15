-- Create time tracking and productivity analysis tables

-- Time tracking entries for different job search activities
CREATE TABLE public.time_tracking_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'job_research', 'application', 'networking', 'interview_prep', 'skill_development', 'resume_work', 'cover_letter', 'follow_up'
  activity_title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5), -- 1=very low, 5=very high
  productivity_rating INTEGER CHECK (productivity_rating >= 1 AND productivity_rating <= 5), -- self-assessed
  notes TEXT,
  related_job_id UUID,
  related_contact_id UUID,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Daily productivity metrics and patterns
CREATE TABLE public.productivity_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  metric_date DATE NOT NULL,
  total_time_minutes INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_planned INTEGER DEFAULT 0,
  completion_rate NUMERIC,
  average_energy_level NUMERIC,
  average_productivity_rating NUMERIC,
  peak_productivity_hour INTEGER, -- 0-23
  activities_breakdown JSONB DEFAULT '{}', -- {activity_type: minutes}
  outcomes_generated JSONB DEFAULT '{}', -- {outcome_type: count}
  burnout_risk_score NUMERIC, -- 0-100
  work_life_balance_score NUMERIC, -- 0-100
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, metric_date)
);

-- AI-generated productivity insights and recommendations
CREATE TABLE public.productivity_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL, -- 'time_allocation', 'productivity_pattern', 'burnout_warning', 'efficiency_tip', 'schedule_optimization'
  insight_title TEXT NOT NULL,
  insight_description TEXT NOT NULL,
  recommendations JSONB DEFAULT '[]',
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_tracking_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productivity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productivity_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time_tracking_entries
CREATE POLICY "Users can view own time tracking entries"
ON public.time_tracking_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own time tracking entries"
ON public.time_tracking_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time tracking entries"
ON public.time_tracking_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own time tracking entries"
ON public.time_tracking_entries FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for productivity_metrics
CREATE POLICY "Users can view own productivity metrics"
ON public.productivity_metrics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own productivity metrics"
ON public.productivity_metrics FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own productivity metrics"
ON public.productivity_metrics FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own productivity metrics"
ON public.productivity_metrics FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for productivity_insights
CREATE POLICY "Users can view own productivity insights"
ON public.productivity_insights FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own productivity insights"
ON public.productivity_insights FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own productivity insights"
ON public.productivity_insights FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own productivity insights"
ON public.productivity_insights FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to update productivity_metrics.updated_at
CREATE OR REPLACE FUNCTION update_productivity_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_productivity_metrics_updated_at
BEFORE UPDATE ON public.productivity_metrics
FOR EACH ROW
EXECUTE FUNCTION update_productivity_metrics_updated_at();