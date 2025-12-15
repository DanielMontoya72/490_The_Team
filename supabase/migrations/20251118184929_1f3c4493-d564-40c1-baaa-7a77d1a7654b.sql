-- Create job match analyses table
CREATE TABLE public.job_match_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  skills_score INTEGER CHECK (skills_score >= 0 AND skills_score <= 100),
  experience_score INTEGER CHECK (experience_score >= 0 AND experience_score <= 100),
  education_score INTEGER CHECK (education_score >= 0 AND education_score <= 100),
  strengths JSONB DEFAULT '[]'::jsonb,
  gaps JSONB DEFAULT '[]'::jsonb,
  improvement_suggestions JSONB DEFAULT '[]'::jsonb,
  match_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_match_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own job match analyses"
  ON public.job_match_analyses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own job match analyses"
  ON public.job_match_analyses FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own job match analyses"
  ON public.job_match_analyses FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own job match analyses"
  ON public.job_match_analyses FOR DELETE
  USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_job_match_analyses_job_id ON public.job_match_analyses(job_id);
CREATE INDEX idx_job_match_analyses_user_id ON public.job_match_analyses(user_id);
CREATE INDEX idx_job_match_analyses_created_at ON public.job_match_analyses(created_at DESC);

-- Create user matching preferences table
CREATE TABLE public.user_matching_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  skills_weight INTEGER NOT NULL DEFAULT 40 CHECK (skills_weight >= 0 AND skills_weight <= 100),
  experience_weight INTEGER NOT NULL DEFAULT 35 CHECK (experience_weight >= 0 AND experience_weight <= 100),
  education_weight INTEGER NOT NULL DEFAULT 25 CHECK (education_weight >= 0 AND education_weight <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_matching_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for preferences
CREATE POLICY "Users can view own matching preferences"
  ON public.user_matching_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own matching preferences"
  ON public.user_matching_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own matching preferences"
  ON public.user_matching_preferences FOR UPDATE
  USING (user_id = auth.uid());

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_job_match_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_match_analyses_updated_at
  BEFORE UPDATE ON public.job_match_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_job_match_analyses_updated_at();

CREATE TRIGGER update_user_matching_preferences_updated_at
  BEFORE UPDATE ON public.user_matching_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_job_match_analyses_updated_at();