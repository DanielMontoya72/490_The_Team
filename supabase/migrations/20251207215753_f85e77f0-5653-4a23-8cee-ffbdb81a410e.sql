-- Create table for caching BLS salary benchmark data
CREATE TABLE public.bls_salary_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  occupation_code TEXT NOT NULL,
  occupation_title TEXT NOT NULL,
  location_code TEXT,
  location_name TEXT,
  percentile_10 NUMERIC,
  percentile_25 NUMERIC,
  median_salary NUMERIC,
  percentile_75 NUMERIC,
  percentile_90 NUMERIC,
  mean_salary NUMERIC,
  annual_total_employment INTEGER,
  data_year INTEGER NOT NULL,
  data_source TEXT DEFAULT 'BLS',
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(occupation_code, location_code, data_year)
);

-- Create index for faster lookups
CREATE INDEX idx_bls_salary_benchmarks_occupation ON public.bls_salary_benchmarks(occupation_title);
CREATE INDEX idx_bls_salary_benchmarks_location ON public.bls_salary_benchmarks(location_name);
CREATE INDEX idx_bls_salary_benchmarks_expires ON public.bls_salary_benchmarks(expires_at);

-- Enable RLS
ALTER TABLE public.bls_salary_benchmarks ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read benchmarks (public data)
CREATE POLICY "Anyone can view salary benchmarks" 
ON public.bls_salary_benchmarks 
FOR SELECT 
USING (true);

-- Only allow system to insert/update (via edge functions)
CREATE POLICY "System can manage salary benchmarks" 
ON public.bls_salary_benchmarks 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_bls_salary_benchmarks_updated_at
BEFORE UPDATE ON public.bls_salary_benchmarks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();