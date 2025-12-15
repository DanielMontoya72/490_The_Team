
-- Create table for application timing analytics
CREATE TABLE public.application_timing_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  submission_day_of_week INTEGER, -- 0=Sunday, 6=Saturday
  submission_hour INTEGER, -- 0-23
  submission_timezone TEXT,
  industry TEXT,
  company_size TEXT,
  is_remote BOOLEAN DEFAULT false,
  response_received BOOLEAN DEFAULT false,
  response_time_hours INTEGER,
  outcome TEXT, -- 'interview', 'rejected', 'no_response', 'offer'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for scheduled application submissions
CREATE TABLE public.scheduled_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
  recommendation_reason TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for timing A/B test results
CREATE TABLE public.timing_ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  test_name TEXT NOT NULL,
  variant_a_description TEXT NOT NULL,
  variant_b_description TEXT NOT NULL,
  variant_a_submissions INTEGER DEFAULT 0,
  variant_a_responses INTEGER DEFAULT 0,
  variant_b_submissions INTEGER DEFAULT 0,
  variant_b_responses INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  winner TEXT,
  statistical_significance NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.application_timing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timing_ab_tests ENABLE ROW LEVEL SECURITY;

-- RLS policies for application_timing_analytics
CREATE POLICY "Users can view their own timing analytics"
  ON public.application_timing_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own timing analytics"
  ON public.application_timing_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timing analytics"
  ON public.application_timing_analytics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timing analytics"
  ON public.application_timing_analytics FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for scheduled_applications
CREATE POLICY "Users can view their own scheduled applications"
  ON public.scheduled_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled applications"
  ON public.scheduled_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled applications"
  ON public.scheduled_applications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled applications"
  ON public.scheduled_applications FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for timing_ab_tests
CREATE POLICY "Users can view their own timing AB tests"
  ON public.timing_ab_tests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own timing AB tests"
  ON public.timing_ab_tests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timing AB tests"
  ON public.timing_ab_tests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timing AB tests"
  ON public.timing_ab_tests FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_timing_analytics_user_id ON public.application_timing_analytics(user_id);
CREATE INDEX idx_timing_analytics_industry ON public.application_timing_analytics(industry);
CREATE INDEX idx_scheduled_applications_user_id ON public.scheduled_applications(user_id);
CREATE INDEX idx_scheduled_applications_status ON public.scheduled_applications(status);
CREATE INDEX idx_timing_ab_tests_user_id ON public.timing_ab_tests(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_application_timing_analytics_updated_at
  BEFORE UPDATE ON public.application_timing_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_applications_updated_at
  BEFORE UPDATE ON public.scheduled_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_timing_ab_tests_updated_at
  BEFORE UPDATE ON public.timing_ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
