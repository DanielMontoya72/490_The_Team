-- Create table for user section presets
CREATE TABLE public.resume_section_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  preset_name TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resume_section_presets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own presets"
  ON public.resume_section_presets
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own presets"
  ON public.resume_section_presets
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own presets"
  ON public.resume_section_presets
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own presets"
  ON public.resume_section_presets
  FOR DELETE
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_resume_section_presets_updated_at
  BEFORE UPDATE ON public.resume_section_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();