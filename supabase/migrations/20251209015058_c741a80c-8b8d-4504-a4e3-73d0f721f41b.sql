
-- Create table for application package quality scores
CREATE TABLE public.application_quality_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL DEFAULT 0,
  resume_score INTEGER,
  cover_letter_score INTEGER,
  linkedin_score INTEGER,
  keyword_match_score INTEGER,
  formatting_score INTEGER,
  missing_keywords TEXT[],
  missing_skills TEXT[],
  missing_experiences TEXT[],
  formatting_issues JSONB DEFAULT '[]',
  improvement_suggestions JSONB DEFAULT '[]',
  user_average_score NUMERIC(5,2),
  top_score INTEGER,
  score_percentile INTEGER,
  meets_threshold BOOLEAN DEFAULT false,
  threshold_value INTEGER DEFAULT 70,
  analysis_details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

-- Create table for tracking score improvements over time
CREATE TABLE public.quality_score_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  change_type TEXT,
  change_description TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.application_quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_score_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for application_quality_scores
CREATE POLICY "Users can view their own quality scores"
ON public.application_quality_scores FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quality scores"
ON public.application_quality_scores FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quality scores"
ON public.application_quality_scores FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quality scores"
ON public.application_quality_scores FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for quality_score_history
CREATE POLICY "Users can view their own score history"
ON public.quality_score_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own score history"
ON public.quality_score_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_application_quality_scores_updated_at
BEFORE UPDATE ON public.application_quality_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
