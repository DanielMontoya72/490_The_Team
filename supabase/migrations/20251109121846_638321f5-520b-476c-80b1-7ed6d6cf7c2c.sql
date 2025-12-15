-- Create job_contacts table
CREATE TABLE IF NOT EXISTS public.job_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies - users can manage contacts for their own jobs
CREATE POLICY "Users can view contacts for their jobs"
  ON public.job_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_contacts.job_id
      AND jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert contacts for their jobs"
  ON public.job_contacts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_contacts.job_id
      AND jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update contacts for their jobs"
  ON public.job_contacts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_contacts.job_id
      AND jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete contacts for their jobs"
  ON public.job_contacts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_contacts.job_id
      AND jobs.user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_job_contacts_updated_at
  BEFORE UPDATE ON public.job_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();