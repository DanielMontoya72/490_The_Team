-- Create resume_shares table
CREATE TABLE IF NOT EXISTS public.resume_shares (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    resume_id uuid NOT NULL,
    user_id uuid NOT NULL,
    expires_at timestamp with time zone,
    is_active boolean NOT NULL DEFAULT true,
    allow_comments boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    review_deadline timestamp with time zone,
    approved_by uuid,
    approved_at timestamp with time zone,
    share_token text NOT NULL,
    privacy_level text NOT NULL DEFAULT 'anyone_with_link'::text,
    approval_status text DEFAULT 'pending'::text,
    approval_notes text
);

-- Enable RLS
ALTER TABLE public.resume_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own resume shares"
  ON public.resume_shares
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create resume shares"
  ON public.resume_shares
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resume shares"
  ON public.resume_shares
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resume shares"
  ON public.resume_shares
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_resume_shares_updated_at
  BEFORE UPDATE ON public.resume_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

