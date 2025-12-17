-- Create app_cache table for persistent caching
CREATE TABLE IF NOT EXISTS public.app_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for expired cache cleanup
CREATE INDEX IF NOT EXISTS idx_app_cache_expires ON public.app_cache(expires_at);

-- Enable RLS
ALTER TABLE public.app_cache ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write cache (shared cache)
CREATE POLICY "Authenticated users can manage cache"
ON public.app_cache
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Add composite indexes for common query patterns (only for columns that exist)
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON public.jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_user_created ON public.jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_materials_user_type ON public.application_materials(user_id, material_type);

-- Partial index for active jobs only
CREATE INDEX IF NOT EXISTS idx_jobs_active ON public.jobs(user_id) 
WHERE status NOT IN ('Rejected', 'Withdrawn');

-- Index for application emails user lookup
CREATE INDEX IF NOT EXISTS idx_application_emails_user ON public.application_emails(user_id, received_at DESC);

-- Index for professional contacts
CREATE INDEX IF NOT EXISTS idx_professional_contacts_user ON public.professional_contacts(user_id, created_at DESC);