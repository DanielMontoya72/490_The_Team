-- Create cover letter templates table
CREATE TABLE IF NOT EXISTS public.cover_letter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('formal', 'creative', 'technical', 'sales', 'academic', 'startup')),
  industry TEXT,
  content_structure JSONB NOT NULL DEFAULT '{}'::jsonb,
  customization_settings JSONB DEFAULT '{}'::jsonb,
  is_system_template BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cover_letter_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view system templates and their own templates"
  ON public.cover_letter_templates
  FOR SELECT
  USING (is_system_template = true OR user_id = auth.uid() OR is_shared = true);

CREATE POLICY "Users can create their own templates"
  ON public.cover_letter_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.cover_letter_templates
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.cover_letter_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_cover_letter_templates_user_id ON public.cover_letter_templates(user_id);
CREATE INDEX idx_cover_letter_templates_type ON public.cover_letter_templates(template_type);
CREATE INDEX idx_cover_letter_templates_industry ON public.cover_letter_templates(industry);
CREATE INDEX idx_cover_letter_templates_system ON public.cover_letter_templates(is_system_template);

-- Trigger for updated_at
CREATE TRIGGER update_cover_letter_templates_updated_at
  BEFORE UPDATE ON public.cover_letter_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert system templates
INSERT INTO public.cover_letter_templates (template_name, template_type, industry, content_structure, is_system_template, is_shared) VALUES
('Professional Formal', 'formal', 'general', '{
  "opening": "Express genuine interest in the role and company",
  "body1": "Highlight relevant experience and achievements",
  "body2": "Demonstrate knowledge of company and fit",
  "closing": "Express enthusiasm and call-to-action"
}'::jsonb, true, true),
('Creative Portfolio', 'creative', 'design', '{
  "opening": "Start with a compelling hook or story",
  "body1": "Showcase creative projects and impact",
  "body2": "Explain creative process and collaboration",
  "closing": "Invite to view portfolio and discuss"
}'::jsonb, true, true),
('Technical Engineering', 'technical', 'technology', '{
  "opening": "Reference specific technical challenges",
  "body1": "Detail technical skills and projects",
  "body2": "Highlight problem-solving and teamwork",
  "closing": "Express interest in technical discussion"
}'::jsonb, true, true),
('Sales & Business Development', 'sales', 'sales', '{
  "opening": "Lead with impressive metrics or achievement",
  "body1": "Quantify sales results and strategies",
  "body2": "Demonstrate market knowledge and approach",
  "closing": "Confident call-to-action with next steps"
}'::jsonb, true, true),
('Academic Research', 'academic', 'education', '{
  "opening": "Express research interests and alignment",
  "body1": "Detail research experience and publications",
  "body2": "Explain teaching philosophy and mentorship",
  "closing": "Professional academic closing"
}'::jsonb, true, true),
('Startup & Entrepreneurial', 'startup', 'startup', '{
  "opening": "Show passion for startup mission/product",
  "body1": "Highlight adaptability and ownership mindset",
  "body2": "Demonstrate scrappiness and resourcefulness",
  "closing": "Emphasize alignment with startup values"
}'::jsonb, true, true);