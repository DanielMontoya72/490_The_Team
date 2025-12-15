-- Create career path simulations table
CREATE TABLE public.career_path_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  simulation_name TEXT NOT NULL,
  starting_role TEXT,
  starting_salary NUMERIC,
  starting_industry TEXT,
  target_roles JSONB DEFAULT '[]',
  job_offer_ids UUID[] DEFAULT '{}',
  simulation_years INTEGER DEFAULT 5,
  custom_criteria JSONB DEFAULT '{}',
  trajectories JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '{}',
  probability_distributions JSONB DEFAULT '{}',
  lifetime_earnings JSONB DEFAULT '{}',
  decision_points JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.career_path_simulations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own simulations"
ON public.career_path_simulations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own simulations"
ON public.career_path_simulations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own simulations"
ON public.career_path_simulations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own simulations"
ON public.career_path_simulations FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_career_path_simulations_updated_at
BEFORE UPDATE ON public.career_path_simulations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();