
-- Create table for A/B test experiments
CREATE TABLE public.material_ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  test_name TEXT NOT NULL,
  material_type TEXT NOT NULL CHECK (material_type IN ('resume', 'cover_letter')),
  variant_a_id UUID NOT NULL,
  variant_b_id UUID NOT NULL,
  variant_a_name TEXT NOT NULL,
  variant_b_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  winner TEXT CHECK (winner IN ('A', 'B', 'tie', 'insufficient_data')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for tracking applications in A/B tests
CREATE TABLE public.material_ab_test_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.material_ab_tests(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),
  material_id UUID NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  outcome TEXT CHECK (outcome IN ('pending', 'response', 'interview', 'rejection', 'offer', 'no_response')),
  outcome_date TIMESTAMP WITH TIME ZONE,
  response_time_hours INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(test_id, job_id)
);

-- Enable RLS
ALTER TABLE public.material_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_ab_test_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for material_ab_tests
CREATE POLICY "Users can view their own A/B tests"
  ON public.material_ab_tests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own A/B tests"
  ON public.material_ab_tests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own A/B tests"
  ON public.material_ab_tests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own A/B tests"
  ON public.material_ab_tests FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for material_ab_test_applications
CREATE POLICY "Users can view their own test applications"
  ON public.material_ab_test_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own test applications"
  ON public.material_ab_test_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test applications"
  ON public.material_ab_test_applications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own test applications"
  ON public.material_ab_test_applications FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_material_ab_tests_user_id ON public.material_ab_tests(user_id);
CREATE INDEX idx_material_ab_tests_status ON public.material_ab_tests(status);
CREATE INDEX idx_material_ab_test_applications_test_id ON public.material_ab_test_applications(test_id);
CREATE INDEX idx_material_ab_test_applications_user_id ON public.material_ab_test_applications(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_material_ab_tests_updated_at
  BEFORE UPDATE ON public.material_ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_ab_test_applications_updated_at
  BEFORE UPDATE ON public.material_ab_test_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
