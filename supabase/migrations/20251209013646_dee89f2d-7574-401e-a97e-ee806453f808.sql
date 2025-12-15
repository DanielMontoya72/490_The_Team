-- Create table for response time predictions and tracking
CREATE TABLE public.response_time_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  predicted_min_days INTEGER NOT NULL,
  predicted_max_days INTEGER NOT NULL,
  predicted_avg_days INTEGER NOT NULL,
  confidence_level INTEGER DEFAULT 80,
  factors_used JSONB DEFAULT '{}',
  suggested_follow_up_date DATE,
  is_overdue BOOLEAN DEFAULT false,
  actual_response_days INTEGER,
  responded_at TIMESTAMP WITH TIME ZONE,
  prediction_accuracy NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id)
);

-- Create table for industry response benchmarks
CREATE TABLE public.industry_response_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  industry VARCHAR(100) NOT NULL,
  company_size VARCHAR(50),
  job_level VARCHAR(50),
  avg_response_days INTEGER NOT NULL,
  min_response_days INTEGER NOT NULL,
  max_response_days INTEGER NOT NULL,
  sample_size INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(industry, company_size, job_level)
);

-- Enable RLS
ALTER TABLE public.response_time_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_response_benchmarks ENABLE ROW LEVEL SECURITY;

-- RLS policies for response_time_predictions
CREATE POLICY "Users can view their own predictions" 
ON public.response_time_predictions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own predictions" 
ON public.response_time_predictions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own predictions" 
ON public.response_time_predictions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own predictions" 
ON public.response_time_predictions 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for industry benchmarks (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view benchmarks" 
ON public.industry_response_benchmarks 
FOR SELECT 
TO authenticated
USING (true);

-- Insert default industry benchmarks
INSERT INTO public.industry_response_benchmarks (industry, company_size, job_level, avg_response_days, min_response_days, max_response_days, sample_size) VALUES
('Technology', 'Startup', 'Entry', 5, 2, 10, 150),
('Technology', 'Startup', 'Mid', 7, 3, 14, 120),
('Technology', 'Startup', 'Senior', 10, 5, 21, 80),
('Technology', 'Medium', 'Entry', 7, 3, 14, 200),
('Technology', 'Medium', 'Mid', 10, 5, 21, 180),
('Technology', 'Medium', 'Senior', 14, 7, 28, 100),
('Technology', 'Large', 'Entry', 10, 5, 21, 300),
('Technology', 'Large', 'Mid', 14, 7, 28, 250),
('Technology', 'Large', 'Senior', 21, 10, 35, 150),
('Technology', 'Enterprise', 'Entry', 14, 7, 28, 400),
('Technology', 'Enterprise', 'Mid', 21, 10, 35, 350),
('Technology', 'Enterprise', 'Senior', 28, 14, 42, 200),
('Healthcare', 'Medium', 'Entry', 10, 5, 21, 100),
('Healthcare', 'Medium', 'Mid', 14, 7, 28, 80),
('Healthcare', 'Large', 'Entry', 14, 7, 28, 150),
('Healthcare', 'Large', 'Mid', 21, 10, 35, 120),
('Finance', 'Large', 'Entry', 14, 7, 28, 200),
('Finance', 'Large', 'Mid', 21, 10, 42, 180),
('Finance', 'Enterprise', 'Entry', 21, 10, 35, 250),
('Finance', 'Enterprise', 'Mid', 28, 14, 49, 200),
('Retail', 'Medium', 'Entry', 5, 2, 10, 100),
('Retail', 'Large', 'Entry', 7, 3, 14, 150),
('Manufacturing', 'Large', 'Entry', 10, 5, 21, 120),
('Manufacturing', 'Large', 'Mid', 14, 7, 28, 100),
('Education', 'Medium', 'Entry', 14, 7, 28, 80),
('Education', 'Large', 'Entry', 21, 10, 35, 100),
('Consulting', 'Medium', 'Mid', 10, 5, 21, 90),
('Consulting', 'Large', 'Mid', 14, 7, 28, 120);

-- Create trigger for updated_at
CREATE TRIGGER update_response_time_predictions_updated_at
BEFORE UPDATE ON public.response_time_predictions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();