-- Create interview_insights table
CREATE TABLE IF NOT EXISTS public.interview_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  interview_process JSONB DEFAULT '[]'::jsonb,
  common_questions JSONB DEFAULT '[]'::jsonb,
  interviewer_info JSONB DEFAULT '[]'::jsonb,
  interview_formats JSONB DEFAULT '[]'::jsonb,
  preparation_recommendations JSONB DEFAULT '[]'::jsonb,
  timeline_expectations TEXT,
  success_tips JSONB DEFAULT '[]'::jsonb,
  preparation_checklist JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.interview_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own interview insights"
  ON public.interview_insights
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own interview insights"
  ON public.interview_insights
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own interview insights"
  ON public.interview_insights
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own interview insights"
  ON public.interview_insights
  FOR DELETE
  USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_interview_insights_job_id ON public.interview_insights(job_id);
CREATE INDEX idx_interview_insights_user_id ON public.interview_insights(user_id);