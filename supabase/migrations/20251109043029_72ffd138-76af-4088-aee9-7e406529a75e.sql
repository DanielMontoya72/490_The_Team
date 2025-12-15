-- Add version management fields to resumes table
ALTER TABLE public.resumes
ADD COLUMN version_description TEXT,
ADD COLUMN parent_resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
ADD COLUMN is_default BOOLEAN DEFAULT false;

-- Create indexes for better performance
CREATE INDEX idx_resumes_parent_id ON public.resumes(parent_resume_id);
CREATE INDEX idx_resumes_is_default ON public.resumes(user_id, is_default);

-- Function to ensure only one default resume per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_resume()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Set all other resumes for this user to not default
    UPDATE public.resumes
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to maintain single default resume
CREATE TRIGGER trigger_ensure_single_default_resume
  BEFORE INSERT OR UPDATE OF is_default ON public.resumes
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_default_resume();