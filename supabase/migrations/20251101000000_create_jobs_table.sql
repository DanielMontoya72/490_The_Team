-- Create handle_updated_at function first (needed for triggers)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create jobs table (base table that many other tables reference)
CREATE TABLE IF NOT EXISTS public.jobs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    application_deadline timestamp with time zone,
    applied_date timestamp with time zone,
    is_bookmarked boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    match_score integer,
    company_name text NOT NULL,
    position_title text NOT NULL,
    location text,
    job_type text,
    salary_range text,
    job_description text,
    requirements text,
    company_website text,
    job_url text,
    status text NOT NULL DEFAULT 'saved'::text,
    notes text,
    remote_type text,
    experience_level text,
    industry text
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jobs table
CREATE POLICY "Users can view own jobs"
  ON public.jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON public.jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON public.jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs"
  ON public.jobs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create updated_at trigger for jobs
CREATE TRIGGER set_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

