-- Create table for interview question responses
CREATE TABLE IF NOT EXISTS public.interview_question_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_category TEXT NOT NULL, -- behavioral, technical, situational
  difficulty_level TEXT NOT NULL DEFAULT 'intermediate', -- entry, intermediate, senior
  response_text TEXT,
  is_practiced BOOLEAN NOT NULL DEFAULT false,
  star_method JSONB DEFAULT '{"situation": "", "task": "", "action": "", "result": ""}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for company research
CREATE TABLE IF NOT EXISTS public.company_research (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  interview_id UUID REFERENCES public.interviews(id) ON DELETE SET NULL,
  company_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  leadership_info JSONB DEFAULT '[]'::jsonb,
  competitive_landscape TEXT,
  recent_news JSONB DEFAULT '[]'::jsonb,
  talking_points JSONB DEFAULT '[]'::jsonb,
  questions_to_ask JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interview_question_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_research ENABLE ROW LEVEL SECURITY;

-- RLS policies for interview_question_responses
CREATE POLICY "Users can view own question responses"
  ON public.interview_question_responses
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own question responses"
  ON public.interview_question_responses
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own question responses"
  ON public.interview_question_responses
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own question responses"
  ON public.interview_question_responses
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS policies for company_research
CREATE POLICY "Users can view own company research"
  ON public.company_research
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own company research"
  ON public.company_research
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own company research"
  ON public.company_research
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own company research"
  ON public.company_research
  FOR DELETE
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_question_responses_user_id ON public.interview_question_responses(user_id);
CREATE INDEX idx_question_responses_interview_id ON public.interview_question_responses(interview_id);
CREATE INDEX idx_question_responses_job_id ON public.interview_question_responses(job_id);
CREATE INDEX idx_company_research_user_id ON public.company_research(user_id);
CREATE INDEX idx_company_research_job_id ON public.company_research(job_id);
CREATE INDEX idx_company_research_interview_id ON public.company_research(interview_id);

-- Create trigger for updated_at
CREATE TRIGGER update_interview_question_responses_updated_at
  BEFORE UPDATE ON public.interview_question_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_company_research_updated_at
  BEFORE UPDATE ON public.company_research
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();