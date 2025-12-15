-- Create professional_references table
CREATE TABLE public.professional_references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reference_name TEXT NOT NULL,
  reference_title TEXT,
  reference_company TEXT,
  reference_email TEXT,
  reference_phone TEXT,
  linkedin_url TEXT,
  relationship_type TEXT NOT NULL DEFAULT 'professional', -- professional, academic, personal
  relationship_duration TEXT,
  how_you_know TEXT,
  reference_strength TEXT DEFAULT 'strong', -- strong, moderate, developing
  availability_status TEXT DEFAULT 'available', -- available, busy, unavailable
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  notes TEXT,
  talking_points JSONB DEFAULT '[]'::jsonb,
  skills_they_can_speak_to JSONB DEFAULT '[]'::jsonb,
  preferred_contact_method TEXT DEFAULT 'email',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reference_requests table for tracking reference usage
CREATE TABLE public.reference_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reference_id UUID NOT NULL REFERENCES public.professional_references(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  request_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  request_status TEXT DEFAULT 'pending', -- pending, sent, confirmed, completed, declined
  request_type TEXT DEFAULT 'job_application', -- job_application, academic, character, general
  company_name TEXT,
  role_title TEXT,
  deadline DATE,
  preparation_materials JSONB DEFAULT '{}'::jsonb,
  talking_points_sent JSONB DEFAULT '[]'::jsonb,
  reference_feedback TEXT,
  feedback_received_at TIMESTAMP WITH TIME ZONE,
  outcome TEXT, -- positive, negative, unknown
  outcome_notes TEXT,
  thank_you_sent BOOLEAN DEFAULT false,
  thank_you_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reference_appreciation table for relationship maintenance
CREATE TABLE public.reference_appreciation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reference_id UUID NOT NULL REFERENCES public.professional_references(id) ON DELETE CASCADE,
  appreciation_type TEXT NOT NULL, -- thank_you_note, gift, update, recommendation
  appreciation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message_content TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reference_portfolios table for different career goals
CREATE TABLE public.reference_portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  portfolio_name TEXT NOT NULL,
  career_goal TEXT,
  description TEXT,
  reference_ids JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.professional_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_appreciation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_portfolios ENABLE ROW LEVEL SECURITY;

-- RLS policies for professional_references
CREATE POLICY "Users can view own references" ON public.professional_references FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own references" ON public.professional_references FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own references" ON public.professional_references FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own references" ON public.professional_references FOR DELETE USING (user_id = auth.uid());

-- RLS policies for reference_requests
CREATE POLICY "Users can view own reference requests" ON public.reference_requests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own reference requests" ON public.reference_requests FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own reference requests" ON public.reference_requests FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own reference requests" ON public.reference_requests FOR DELETE USING (user_id = auth.uid());

-- RLS policies for reference_appreciation
CREATE POLICY "Users can view own appreciation" ON public.reference_appreciation FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own appreciation" ON public.reference_appreciation FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own appreciation" ON public.reference_appreciation FOR DELETE USING (user_id = auth.uid());

-- RLS policies for reference_portfolios
CREATE POLICY "Users can view own portfolios" ON public.reference_portfolios FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own portfolios" ON public.reference_portfolios FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own portfolios" ON public.reference_portfolios FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own portfolios" ON public.reference_portfolios FOR DELETE USING (user_id = auth.uid());

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_professional_references_updated_at
  BEFORE UPDATE ON public.professional_references
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reference_requests_updated_at
  BEFORE UPDATE ON public.reference_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reference_portfolios_updated_at
  BEFORE UPDATE ON public.reference_portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();