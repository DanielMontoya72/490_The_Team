-- External advisors/coaches table
CREATE TABLE public.external_advisors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  advisor_name TEXT NOT NULL,
  advisor_email TEXT NOT NULL,
  advisor_type TEXT NOT NULL DEFAULT 'career_coach', -- career_coach, resume_expert, interview_coach, industry_advisor
  specialization TEXT,
  company TEXT,
  bio TEXT,
  hourly_rate DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, inactive
  invite_token TEXT,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Advisor access permissions
CREATE TABLE public.advisor_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id UUID NOT NULL REFERENCES public.external_advisors(id) ON DELETE CASCADE,
  view_profile BOOLEAN DEFAULT true,
  view_resume BOOLEAN DEFAULT false,
  view_cover_letters BOOLEAN DEFAULT false,
  view_jobs BOOLEAN DEFAULT false,
  view_interviews BOOLEAN DEFAULT false,
  view_goals BOOLEAN DEFAULT false,
  view_skills BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Advisor sessions for scheduling
CREATE TABLE public.advisor_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id UUID NOT NULL REFERENCES public.external_advisors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'coaching', -- coaching, review, strategy, mock_interview
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show
  meeting_link TEXT,
  notes TEXT,
  session_summary TEXT,
  amount_charged DECIMAL(10,2),
  payment_status TEXT DEFAULT 'pending', -- pending, paid, waived
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Advisor recommendations
CREATE TABLE public.advisor_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id UUID NOT NULL REFERENCES public.external_advisors(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.advisor_sessions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  recommendation_type TEXT NOT NULL, -- resume, interview, networking, career_path, skill_development
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium', -- low, medium, high
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, dismissed
  implemented_at TIMESTAMPTZ,
  impact_rating INTEGER, -- 1-5 scale
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Advisor feedback/evaluations
CREATE TABLE public.advisor_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id UUID NOT NULL REFERENCES public.external_advisors(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.advisor_sessions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  expertise_rating INTEGER CHECK (expertise_rating >= 1 AND expertise_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  feedback TEXT,
  would_recommend BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Advisor messages (secure communication)
CREATE TABLE public.advisor_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id UUID NOT NULL REFERENCES public.external_advisors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  sender_type TEXT NOT NULL, -- user, advisor
  message_content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shared materials with advisors
CREATE TABLE public.advisor_shared_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id UUID NOT NULL REFERENCES public.external_advisors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  material_type TEXT NOT NULL, -- resume, cover_letter, job, goal, progress_update
  material_id UUID,
  material_title TEXT NOT NULL,
  notes TEXT,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_advisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_shared_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for external_advisors
CREATE POLICY "Users can view their own advisors" ON public.external_advisors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create advisors" ON public.external_advisors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own advisors" ON public.external_advisors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own advisors" ON public.external_advisors FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for advisor_permissions
CREATE POLICY "Users can manage advisor permissions" ON public.advisor_permissions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.external_advisors WHERE id = advisor_id AND user_id = auth.uid())
);

-- RLS Policies for advisor_sessions
CREATE POLICY "Users can manage their sessions" ON public.advisor_sessions FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for advisor_recommendations
CREATE POLICY "Users can manage their recommendations" ON public.advisor_recommendations FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for advisor_evaluations
CREATE POLICY "Users can manage their evaluations" ON public.advisor_evaluations FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for advisor_messages
CREATE POLICY "Users can manage their messages" ON public.advisor_messages FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for advisor_shared_materials
CREATE POLICY "Users can manage their shared materials" ON public.advisor_shared_materials FOR ALL USING (auth.uid() = user_id);

-- Update trigger for timestamps
CREATE TRIGGER update_external_advisors_updated_at BEFORE UPDATE ON public.external_advisors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_advisor_permissions_updated_at BEFORE UPDATE ON public.advisor_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_advisor_sessions_updated_at BEFORE UPDATE ON public.advisor_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_advisor_recommendations_updated_at BEFORE UPDATE ON public.advisor_recommendations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();