-- Create company follows table for news alerts
CREATE TABLE IF NOT EXISTS public.company_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own follows"
  ON public.company_follows FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own follows"
  ON public.company_follows FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own follows"
  ON public.company_follows FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own follows"
  ON public.company_follows FOR DELETE
  USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_company_follows_user_company ON public.company_follows(user_id, company_name);

-- Trigger for updated_at
CREATE TRIGGER update_company_follows_updated_at
  BEFORE UPDATE ON public.company_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();