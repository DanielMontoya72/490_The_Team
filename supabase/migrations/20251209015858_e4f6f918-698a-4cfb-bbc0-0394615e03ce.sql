
-- Create table for job competitive analysis
CREATE TABLE public.job_competitive_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  estimated_applicants INTEGER,
  applicant_estimation_factors JSONB,
  competitive_score INTEGER CHECK (competitive_score >= 0 AND competitive_score <= 100),
  competitive_advantages JSONB,
  competitive_disadvantages JSONB,
  mitigation_strategies JSONB,
  interview_likelihood TEXT CHECK (interview_likelihood IN ('low', 'medium', 'high')),
  interview_confidence INTEGER CHECK (interview_confidence >= 0 AND interview_confidence <= 100),
  differentiating_strategies JSONB,
  typical_hired_profile JSONB,
  profile_comparison JSONB,
  priority_score INTEGER CHECK (priority_score >= 0 AND priority_score <= 100),
  priority_reasoning TEXT,
  analysis_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_competitive_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own competitive analysis"
ON public.job_competitive_analysis
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own competitive analysis"
ON public.job_competitive_analysis
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own competitive analysis"
ON public.job_competitive_analysis
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own competitive analysis"
ON public.job_competitive_analysis
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_job_competitive_analysis_job_id ON public.job_competitive_analysis(job_id);
CREATE INDEX idx_job_competitive_analysis_user_id ON public.job_competitive_analysis(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_job_competitive_analysis_updated_at
BEFORE UPDATE ON public.job_competitive_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
