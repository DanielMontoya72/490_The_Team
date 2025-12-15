-- UC-087: Referral Request Management
CREATE TABLE public.referral_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.professional_contacts(id) ON DELETE CASCADE,
  request_message TEXT,
  request_template_type TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'successful', 'no_response')),
  requested_at TIMESTAMP WITH TIME ZONE,
  followed_up_at TIMESTAMP WITH TIME ZONE,
  response_received_at TIMESTAMP WITH TIME ZONE,
  outcome TEXT,
  outcome_notes TEXT,
  gratitude_expressed BOOLEAN DEFAULT false,
  gratitude_sent_at TIMESTAMP WITH TIME ZONE,
  referral_effectiveness_score INTEGER CHECK (referral_effectiveness_score >= 1 AND referral_effectiveness_score <= 10),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own referral requests"
ON public.referral_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own referral requests"
ON public.referral_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own referral requests"
ON public.referral_requests FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own referral requests"
ON public.referral_requests FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_referral_requests_updated_at
BEFORE UPDATE ON public.referral_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- UC-088: Networking Event Management (extending existing table)
-- Add goals and follow-up tracking tables

CREATE TABLE public.networking_event_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.networking_opportunities(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('connections', 'job_leads', 'learning', 'visibility', 'partnerships', 'mentorship')),
  goal_description TEXT NOT NULL,
  target_value INTEGER,
  actual_value INTEGER,
  is_achieved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.networking_event_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own event goals"
ON public.networking_event_goals FOR ALL
USING (auth.uid() = user_id);

CREATE TRIGGER update_networking_event_goals_updated_at
BEFORE UPDATE ON public.networking_event_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.networking_event_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.networking_opportunities(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.professional_contacts(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_title TEXT,
  contact_company TEXT,
  contact_email TEXT,
  contact_linkedin TEXT,
  conversation_notes TEXT,
  follow_up_completed BOOLEAN DEFAULT false,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  relationship_value TEXT CHECK (relationship_value IN ('high', 'medium', 'low')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.networking_event_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own event connections"
ON public.networking_event_connections FOR ALL
USING (auth.uid() = user_id);

CREATE TRIGGER update_networking_event_connections_updated_at
BEFORE UPDATE ON public.networking_event_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_referral_requests_user_id ON public.referral_requests(user_id);
CREATE INDEX idx_referral_requests_job_id ON public.referral_requests(job_id);
CREATE INDEX idx_referral_requests_contact_id ON public.referral_requests(contact_id);
CREATE INDEX idx_referral_requests_status ON public.referral_requests(status);
CREATE INDEX idx_networking_event_goals_user_id ON public.networking_event_goals(user_id);
CREATE INDEX idx_networking_event_goals_event_id ON public.networking_event_goals(event_id);
CREATE INDEX idx_networking_event_connections_user_id ON public.networking_event_connections(user_id);
CREATE INDEX idx_networking_event_connections_event_id ON public.networking_event_connections(event_id);