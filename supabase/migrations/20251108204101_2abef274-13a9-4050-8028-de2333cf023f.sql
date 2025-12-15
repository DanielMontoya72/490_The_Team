-- Create resume_templates table
CREATE TABLE public.resume_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('chronological', 'functional', 'hybrid')),
  is_default BOOLEAN DEFAULT false,
  is_system_template BOOLEAN DEFAULT false,
  customization_settings JSONB DEFAULT '{
    "primaryColor": "#2563eb",
    "fontFamily": "Inter",
    "fontSize": "medium",
    "spacing": "normal",
    "headerStyle": "classic"
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create resumes table
CREATE TABLE public.resumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.resume_templates(id) ON DELETE SET NULL,
  resume_name TEXT NOT NULL,
  version_number INTEGER DEFAULT 1,
  content JSONB DEFAULT '{}'::jsonb,
  customization_overrides JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resume_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

-- RLS policies for resume_templates
CREATE POLICY "Users can view system templates and own templates"
ON public.resume_templates FOR SELECT
USING (is_system_template = true OR user_id = auth.uid());

CREATE POLICY "Users can create own templates"
ON public.resume_templates FOR INSERT
WITH CHECK (user_id = auth.uid() AND is_system_template = false);

CREATE POLICY "Users can update own templates"
ON public.resume_templates FOR UPDATE
USING (user_id = auth.uid() AND is_system_template = false);

CREATE POLICY "Users can delete own templates"
ON public.resume_templates FOR DELETE
USING (user_id = auth.uid() AND is_system_template = false);

-- RLS policies for resumes
CREATE POLICY "Users can view own resumes"
ON public.resumes FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create own resumes"
ON public.resumes FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own resumes"
ON public.resumes FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own resumes"
ON public.resumes FOR DELETE
USING (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_resume_templates_updated_at
  BEFORE UPDATE ON public.resume_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_resumes_updated_at
  BEFORE UPDATE ON public.resumes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default system templates
INSERT INTO public.resume_templates (template_name, template_type, is_system_template, is_default, customization_settings) VALUES
('Classic Chronological', 'chronological', true, true, '{
  "primaryColor": "#2563eb",
  "fontFamily": "Inter",
  "fontSize": "medium",
  "spacing": "normal",
  "headerStyle": "classic"
}'::jsonb),
('Modern Chronological', 'chronological', true, false, '{
  "primaryColor": "#8b5cf6",
  "fontFamily": "Inter",
  "fontSize": "medium",
  "spacing": "comfortable",
  "headerStyle": "modern"
}'::jsonb),
('Skills-Based Functional', 'functional', true, false, '{
  "primaryColor": "#059669",
  "fontFamily": "Inter",
  "fontSize": "medium",
  "spacing": "normal",
  "headerStyle": "minimal"
}'::jsonb),
('Professional Hybrid', 'hybrid', true, false, '{
  "primaryColor": "#dc2626",
  "fontFamily": "Inter",
  "fontSize": "medium",
  "spacing": "compact",
  "headerStyle": "professional"
}'::jsonb);