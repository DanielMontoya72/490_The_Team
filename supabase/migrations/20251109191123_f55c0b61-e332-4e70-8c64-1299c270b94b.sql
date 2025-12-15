-- Create table for saving tailored experience versions
CREATE TABLE IF NOT EXISTS public.tailored_experience_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employment_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  variation_label TEXT NOT NULL,
  tailored_description TEXT NOT NULL,
  relevance_score INTEGER NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 100),
  action_verbs JSONB DEFAULT '[]'::jsonb,
  quantified_accomplishments JSONB DEFAULT '[]'::jsonb,
  industry_terms JSONB DEFAULT '[]'::jsonb,
  key_responsibilities JSONB DEFAULT '[]'::jsonb,
  job_description_excerpt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tailored_versions_user_id ON public.tailored_experience_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_tailored_versions_employment_id ON public.tailored_experience_versions(employment_id);
CREATE INDEX IF NOT EXISTS idx_tailored_versions_job_id ON public.tailored_experience_versions(job_id);
CREATE INDEX IF NOT EXISTS idx_tailored_versions_active ON public.tailored_experience_versions(is_active);

-- Enable RLS
ALTER TABLE public.tailored_experience_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own tailored versions"
  ON public.tailored_experience_versions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tailored versions"
  ON public.tailored_experience_versions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tailored versions"
  ON public.tailored_experience_versions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tailored versions"
  ON public.tailored_experience_versions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_tailored_experience_versions_updated_at
  BEFORE UPDATE ON public.tailored_experience_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();