-- Create skill development progress tracking table
CREATE TABLE IF NOT EXISTS public.skill_development_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  current_level TEXT NOT NULL DEFAULT 'beginner',
  target_level TEXT NOT NULL DEFAULT 'intermediate',
  status TEXT NOT NULL DEFAULT 'not_started',
  learning_resources JSONB DEFAULT '[]'::jsonb,
  progress_percentage INTEGER DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'medium',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create skill gap analyses table
CREATE TABLE IF NOT EXISTS public.skill_gap_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  missing_skills JSONB DEFAULT '[]'::jsonb,
  weak_skills JSONB DEFAULT '[]'::jsonb,
  matching_skills JSONB DEFAULT '[]'::jsonb,
  learning_path JSONB DEFAULT '[]'::jsonb,
  priority_skills JSONB DEFAULT '[]'::jsonb,
  estimated_learning_time_weeks INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.skill_development_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_gap_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for skill_development_progress
CREATE POLICY "Users can view own skill development progress"
  ON public.skill_development_progress FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own skill development progress"
  ON public.skill_development_progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own skill development progress"
  ON public.skill_development_progress FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own skill development progress"
  ON public.skill_development_progress FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for skill_gap_analyses
CREATE POLICY "Users can view own skill gap analyses"
  ON public.skill_gap_analyses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own skill gap analyses"
  ON public.skill_gap_analyses FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own skill gap analyses"
  ON public.skill_gap_analyses FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own skill gap analyses"
  ON public.skill_gap_analyses FOR DELETE
  USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_skill_development_progress_updated_at
  BEFORE UPDATE ON public.skill_development_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_skill_gap_analyses_updated_at
  BEFORE UPDATE ON public.skill_gap_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();