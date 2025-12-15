-- Create application automation rules table
CREATE TABLE IF NOT EXISTS public.application_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('auto_package', 'follow_up', 'status_update')),
  conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create application question templates table
CREATE TABLE IF NOT EXISTS public.application_question_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create application checklists table
CREATE TABLE IF NOT EXISTS public.application_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checklist_items JSONB NOT NULL DEFAULT '[]',
  completion_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create application packages table
CREATE TABLE IF NOT EXISTS public.application_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES public.application_materials(id),
  cover_letter_id UUID REFERENCES public.application_materials(id),
  portfolio_urls TEXT[] DEFAULT '{}',
  scheduled_send_date TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  package_status TEXT DEFAULT 'draft' CHECK (package_status IN ('draft', 'scheduled', 'sent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.application_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_question_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_packages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for application_automation_rules
CREATE POLICY "Users can view own automation rules"
  ON public.application_automation_rules FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own automation rules"
  ON public.application_automation_rules FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own automation rules"
  ON public.application_automation_rules FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own automation rules"
  ON public.application_automation_rules FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for application_question_templates
CREATE POLICY "Users can view own question templates"
  ON public.application_question_templates FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own question templates"
  ON public.application_question_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own question templates"
  ON public.application_question_templates FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own question templates"
  ON public.application_question_templates FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for application_checklists
CREATE POLICY "Users can view own checklists"
  ON public.application_checklists FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own checklists"
  ON public.application_checklists FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own checklists"
  ON public.application_checklists FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own checklists"
  ON public.application_checklists FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for application_packages
CREATE POLICY "Users can view own application packages"
  ON public.application_packages FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own application packages"
  ON public.application_packages FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own application packages"
  ON public.application_packages FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own application packages"
  ON public.application_packages FOR DELETE
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_automation_rules_user_id ON public.application_automation_rules(user_id);
CREATE INDEX idx_automation_rules_is_active ON public.application_automation_rules(is_active);
CREATE INDEX idx_question_templates_user_id ON public.application_question_templates(user_id);
CREATE INDEX idx_checklists_job_id ON public.application_checklists(job_id);
CREATE INDEX idx_checklists_user_id ON public.application_checklists(user_id);
CREATE INDEX idx_packages_job_id ON public.application_packages(job_id);
CREATE INDEX idx_packages_user_id ON public.application_packages(user_id);
CREATE INDEX idx_packages_scheduled_send ON public.application_packages(scheduled_send_date);

-- Create trigger for updated_at
CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.application_automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_question_templates_updated_at
  BEFORE UPDATE ON public.application_question_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_checklists_updated_at
  BEFORE UPDATE ON public.application_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON public.application_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();