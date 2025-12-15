-- Create interview response library table
CREATE TABLE public.interview_response_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('behavioral', 'technical', 'situational')),
  current_response TEXT,
  tags TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  companies_used_for TEXT[] DEFAULT '{}',
  experiences_referenced TEXT[] DEFAULT '{}',
  success_count INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  effectiveness_score NUMERIC(3,2) DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create response versions table for edit history
CREATE TABLE public.interview_response_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES public.interview_response_library(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  response_text TEXT NOT NULL,
  ai_feedback TEXT,
  feedback_score NUMERIC(3,2),
  outcome TEXT CHECK (outcome IN ('offer', 'next_round', 'rejected', 'pending', NULL)),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create response practice sessions table
CREATE TABLE public.response_practice_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  response_id UUID REFERENCES public.interview_response_library(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL,
  practice_response TEXT NOT NULL,
  ai_feedback TEXT,
  scores JSON,
  time_spent_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interview_response_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_response_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_practice_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for interview_response_library
CREATE POLICY "Users can view their own responses" 
ON public.interview_response_library 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own responses" 
ON public.interview_response_library 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own responses" 
ON public.interview_response_library 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own responses" 
ON public.interview_response_library 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for interview_response_versions
CREATE POLICY "Users can view their response versions" 
ON public.interview_response_versions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.interview_response_library 
  WHERE id = response_id AND user_id = auth.uid()
));

CREATE POLICY "Users can create response versions" 
ON public.interview_response_versions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.interview_response_library 
  WHERE id = response_id AND user_id = auth.uid()
));

CREATE POLICY "Users can update their response versions" 
ON public.interview_response_versions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.interview_response_library 
  WHERE id = response_id AND user_id = auth.uid()
));

CREATE POLICY "Users can delete their response versions" 
ON public.interview_response_versions 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.interview_response_library 
  WHERE id = response_id AND user_id = auth.uid()
));

-- RLS policies for response_practice_sessions
CREATE POLICY "Users can view their practice sessions" 
ON public.response_practice_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create practice sessions" 
ON public.response_practice_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_interview_response_library_updated_at
BEFORE UPDATE ON public.interview_response_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_response_library_user_id ON public.interview_response_library(user_id);
CREATE INDEX idx_response_library_question_type ON public.interview_response_library(question_type);
CREATE INDEX idx_response_versions_response_id ON public.interview_response_versions(response_id);
CREATE INDEX idx_practice_sessions_user_id ON public.response_practice_sessions(user_id);