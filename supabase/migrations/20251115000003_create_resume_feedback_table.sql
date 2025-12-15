-- Create resume_feedback table
CREATE TABLE IF NOT EXISTS public.resume_feedback (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    resume_id uuid NOT NULL,
    share_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    resolved_at timestamp with time zone,
    resolved_by uuid,
    implemented_at timestamp with time zone,
    implemented_in_version uuid,
    reviewer_email text NOT NULL,
    reviewer_name text NOT NULL,
    comment_text text NOT NULL,
    section_reference text,
    item_reference text,
    status text NOT NULL DEFAULT 'open'::text,
    feedback_theme text
);

-- Enable RLS
ALTER TABLE public.resume_feedback ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER set_resume_feedback_updated_at
  BEFORE UPDATE ON public.resume_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

