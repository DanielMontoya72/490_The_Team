-- Create table for mock interview sessions
CREATE TABLE IF NOT EXISTS public.mock_interview_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  interview_id UUID REFERENCES public.interviews(id) ON DELETE SET NULL,
  session_name TEXT NOT NULL,
  interview_format TEXT NOT NULL, -- behavioral, technical, case_study, mixed
  status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress, completed, reviewed
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  performance_summary JSONB,
  overall_score NUMERIC,
  duration_minutes INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for response coaching feedback
CREATE TABLE IF NOT EXISTS public.response_coaching_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_response_id UUID REFERENCES public.interview_question_responses(id) ON DELETE CASCADE,
  mock_session_id UUID REFERENCES public.mock_interview_sessions(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  feedback JSONB NOT NULL,
  scores JSONB NOT NULL,
  improvement_suggestions JSONB,
  alternative_approaches JSONB,
  star_adherence JSONB,
  practice_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mock_interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_coaching_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for mock_interview_sessions
CREATE POLICY "Users can view own mock sessions"
  ON public.mock_interview_sessions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own mock sessions"
  ON public.mock_interview_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own mock sessions"
  ON public.mock_interview_sessions
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own mock sessions"
  ON public.mock_interview_sessions
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS policies for response_coaching_feedback
CREATE POLICY "Users can view own coaching feedback"
  ON public.response_coaching_feedback
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own coaching feedback"
  ON public.response_coaching_feedback
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own coaching feedback"
  ON public.response_coaching_feedback
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own coaching feedback"
  ON public.response_coaching_feedback
  FOR DELETE
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_mock_sessions_user_id ON public.mock_interview_sessions(user_id);
CREATE INDEX idx_mock_sessions_job_id ON public.mock_interview_sessions(job_id);
CREATE INDEX idx_mock_sessions_status ON public.mock_interview_sessions(status);
CREATE INDEX idx_coaching_feedback_user_id ON public.response_coaching_feedback(user_id);
CREATE INDEX idx_coaching_feedback_question_id ON public.response_coaching_feedback(question_response_id);
CREATE INDEX idx_coaching_feedback_session_id ON public.response_coaching_feedback(mock_session_id);

-- Create triggers for updated_at
CREATE TRIGGER update_mock_sessions_updated_at
  BEFORE UPDATE ON public.mock_interview_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_coaching_feedback_updated_at
  BEFORE UPDATE ON public.response_coaching_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();