-- UC-114: Corporate Career Services Integration

-- Table for career services organizations (enterprise accounts)
CREATE TABLE public.career_services_organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_name TEXT NOT NULL,
  organization_type TEXT NOT NULL DEFAULT 'university', -- university, bootcamp, staffing_agency, nonprofit, corporate
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  website_url TEXT,
  subscription_tier TEXT DEFAULT 'basic', -- basic, professional, enterprise
  max_users INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{"notifications": true, "allow_data_export": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for organization administrators
CREATE TABLE public.organization_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.career_services_organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  admin_role TEXT NOT NULL DEFAULT 'admin', -- super_admin, admin, coordinator, viewer
  permissions JSONB DEFAULT '{"manage_users": true, "view_analytics": true, "manage_cohorts": true, "export_data": false}'::jsonb,
  invited_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Table for cohorts (groups of job seekers)
CREATE TABLE public.organization_cohorts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.career_services_organizations(id) ON DELETE CASCADE,
  cohort_name TEXT NOT NULL,
  cohort_description TEXT,
  program_type TEXT, -- career_transition, new_grad, upskilling, outplacement
  start_date DATE,
  end_date DATE,
  target_placement_rate NUMERIC(5,2),
  status TEXT DEFAULT 'active', -- planning, active, completed, archived
  settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for cohort members
CREATE TABLE public.cohort_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort_id UUID NOT NULL REFERENCES public.organization_cohorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active', -- active, completed, withdrawn, placed
  placement_date DATE,
  placement_company TEXT,
  placement_role TEXT,
  placement_salary_range TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cohort_id, user_id)
);

-- Table for organization branding (white-label)
CREATE TABLE public.organization_branding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.career_services_organizations(id) ON DELETE CASCADE UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  secondary_color TEXT DEFAULT '#8b5cf6',
  accent_color TEXT DEFAULT '#22c55e',
  custom_domain TEXT,
  custom_email_from TEXT,
  email_footer_text TEXT,
  landing_page_title TEXT,
  landing_page_description TEXT,
  hide_lovable_branding BOOLEAN DEFAULT false,
  custom_css TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for program analytics snapshots
CREATE TABLE public.program_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.career_services_organizations(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.organization_cohorts(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  total_applications INTEGER DEFAULT 0,
  total_interviews INTEGER DEFAULT 0,
  placements INTEGER DEFAULT 0,
  placement_rate NUMERIC(5,2),
  avg_time_to_placement_days INTEGER,
  avg_applications_per_user NUMERIC(8,2),
  avg_interviews_per_user NUMERIC(8,2),
  engagement_score NUMERIC(5,2),
  metrics_breakdown JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for bulk onboarding batches
CREATE TABLE public.bulk_onboarding_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.career_services_organizations(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.organization_cohorts(id) ON DELETE SET NULL,
  batch_name TEXT,
  total_users INTEGER DEFAULT 0,
  successful_imports INTEGER DEFAULT 0,
  failed_imports INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  import_data JSONB,
  error_log JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Table for compliance audit logs
CREATE TABLE public.compliance_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.career_services_organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- user_access, data_export, settings_change, user_deletion, report_generation
  action_description TEXT,
  performed_by UUID,
  affected_user_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for program outcome tracking (ROI)
CREATE TABLE public.program_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.career_services_organizations(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.organization_cohorts(id) ON DELETE SET NULL,
  outcome_period_start DATE,
  outcome_period_end DATE,
  total_participants INTEGER DEFAULT 0,
  placed_participants INTEGER DEFAULT 0,
  avg_starting_salary NUMERIC(12,2),
  salary_increase_percentage NUMERIC(5,2),
  retention_rate_90_days NUMERIC(5,2),
  participant_satisfaction_score NUMERIC(3,2),
  employer_satisfaction_score NUMERIC(3,2),
  program_cost NUMERIC(12,2),
  cost_per_placement NUMERIC(12,2),
  roi_percentage NUMERIC(8,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.career_services_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_onboarding_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_outcomes ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is org admin
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_admins
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- RLS Policies for career_services_organizations
CREATE POLICY "Org admins can view their organization"
  ON public.career_services_organizations FOR SELECT
  USING (public.is_org_admin(auth.uid(), id));

CREATE POLICY "Super admins can manage organization"
  ON public.career_services_organizations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_admins
      WHERE user_id = auth.uid() AND organization_id = career_services_organizations.id AND admin_role = 'super_admin'
    )
  );

-- RLS Policies for organization_admins
CREATE POLICY "Org admins can view admins in their org"
  ON public.organization_admins FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Super admins can manage admins"
  ON public.organization_admins FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_admins oa
      WHERE oa.user_id = auth.uid() AND oa.organization_id = organization_admins.organization_id AND oa.admin_role = 'super_admin'
    )
  );

-- RLS Policies for organization_cohorts
CREATE POLICY "Org admins can manage cohorts"
  ON public.organization_cohorts FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id));

-- RLS Policies for cohort_members
CREATE POLICY "Org admins can manage cohort members"
  ON public.cohort_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_cohorts oc
      JOIN public.organization_admins oa ON oa.organization_id = oc.organization_id
      WHERE oc.id = cohort_members.cohort_id AND oa.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own cohort membership"
  ON public.cohort_members FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policies for organization_branding
CREATE POLICY "Org admins can manage branding"
  ON public.organization_branding FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id));

-- RLS Policies for program_analytics
CREATE POLICY "Org admins can view analytics"
  ON public.program_analytics FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "System can insert analytics"
  ON public.program_analytics FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- RLS Policies for bulk_onboarding_batches
CREATE POLICY "Org admins can manage onboarding batches"
  ON public.bulk_onboarding_batches FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id));

-- RLS Policies for compliance_audit_logs
CREATE POLICY "Org admins can view audit logs"
  ON public.compliance_audit_logs FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "System can insert audit logs"
  ON public.compliance_audit_logs FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- RLS Policies for program_outcomes
CREATE POLICY "Org admins can manage outcomes"
  ON public.program_outcomes FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Triggers for updated_at
CREATE TRIGGER update_career_services_organizations_updated_at
  BEFORE UPDATE ON public.career_services_organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_admins_updated_at
  BEFORE UPDATE ON public.organization_admins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_cohorts_updated_at
  BEFORE UPDATE ON public.organization_cohorts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cohort_members_updated_at
  BEFORE UPDATE ON public.cohort_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_branding_updated_at
  BEFORE UPDATE ON public.organization_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_program_outcomes_updated_at
  BEFORE UPDATE ON public.program_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();