-- Add deadline management for review completion
ALTER TABLE public.resume_shares 
ADD COLUMN IF NOT EXISTS review_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'revision_requested', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approval_notes text;

ALTER TABLE public.cover_letter_shares 
ADD COLUMN IF NOT EXISTS review_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'revision_requested', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approval_notes text;

-- Add feedback theme tracking
ALTER TABLE public.resume_feedback 
ADD COLUMN IF NOT EXISTS feedback_theme text,
ADD COLUMN IF NOT EXISTS implemented_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS implemented_in_version uuid;

ALTER TABLE public.cover_letter_feedback 
ADD COLUMN IF NOT EXISTS feedback_theme text,
ADD COLUMN IF NOT EXISTS implemented_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS implemented_in_version uuid;

-- Create table to track review impact on application success
CREATE TABLE IF NOT EXISTS public.material_review_impact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_type text NOT NULL CHECK (material_type IN ('resume', 'cover_letter')),
  material_id uuid NOT NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  was_reviewed boolean DEFAULT false,
  review_count integer DEFAULT 0,
  feedback_implemented_count integer DEFAULT 0,
  application_outcome text,
  submitted_at timestamp with time zone,
  outcome_recorded_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.material_review_impact ENABLE ROW LEVEL SECURITY;

-- RLS policies for material_review_impact
CREATE POLICY "Users can view own review impact"
ON public.material_review_impact FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own review impact"
ON public.material_review_impact FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own review impact"
ON public.material_review_impact FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own review impact"
ON public.material_review_impact FOR DELETE
USING (user_id = auth.uid());

-- Create function to update material_review_impact updated_at
CREATE OR REPLACE FUNCTION public.update_material_review_impact_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_material_review_impact_updated_at ON public.material_review_impact;
CREATE TRIGGER update_material_review_impact_updated_at
BEFORE UPDATE ON public.material_review_impact
FOR EACH ROW
EXECUTE FUNCTION public.update_material_review_impact_updated_at();