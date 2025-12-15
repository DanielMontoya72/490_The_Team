-- UC-085: Interview Success Probability Scoring
CREATE TABLE IF NOT EXISTS public.interview_success_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  
  -- Probability scores
  overall_probability NUMERIC NOT NULL CHECK (overall_probability >= 0 AND overall_probability <= 100),
  confidence_level TEXT NOT NULL DEFAULT 'medium',
  
  -- Contributing factors
  preparation_score NUMERIC,
  role_match_score NUMERIC,
  company_research_score NUMERIC,
  practice_hours_score NUMERIC,
  
  -- Recommendations and insights
  improvement_recommendations JSONB DEFAULT '[]'::jsonb,
  prioritized_actions JSONB DEFAULT '[]'::jsonb,
  strength_areas JSONB DEFAULT '[]'::jsonb,
  weakness_areas JSONB DEFAULT '[]'::jsonb,
  
  -- Prediction tracking
  predicted_outcome TEXT,
  actual_outcome TEXT,
  prediction_accuracy NUMERIC,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS policies for interview_success_predictions
ALTER TABLE public.interview_success_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interview predictions"
  ON public.interview_success_predictions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own interview predictions"
  ON public.interview_success_predictions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own interview predictions"
  ON public.interview_success_predictions
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own interview predictions"
  ON public.interview_success_predictions
  FOR DELETE
  USING (user_id = auth.uid());

-- UC-086: Professional Contact Management
CREATE TABLE IF NOT EXISTS public.professional_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Basic information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  
  -- Professional details
  current_company TEXT,
  current_title TEXT,
  industry TEXT,
  location TEXT,
  
  -- Relationship details
  relationship_type TEXT, -- mentor, colleague, recruiter, referral, etc.
  relationship_strength TEXT DEFAULT 'weak', -- weak, moderate, strong
  how_we_met TEXT,
  
  -- Categories and tags
  tags TEXT[] DEFAULT '{}',
  
  -- Notes and interests
  professional_notes TEXT,
  personal_interests TEXT,
  
  -- Linked entities
  company_id UUID, -- Link to jobs table company
  job_opportunities TEXT[] DEFAULT '{}', -- Array of job IDs or descriptions
  mutual_connections TEXT[] DEFAULT '{}',
  
  -- Metadata
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  next_followup_date DATE,
  contact_frequency TEXT, -- monthly, quarterly, annually
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS policies for professional_contacts
ALTER TABLE public.professional_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts"
  ON public.professional_contacts
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own contacts"
  ON public.professional_contacts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own contacts"
  ON public.professional_contacts
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own contacts"
  ON public.professional_contacts
  FOR DELETE
  USING (user_id = auth.uid());

-- Contact interactions history
CREATE TABLE IF NOT EXISTS public.contact_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.professional_contacts(id) ON DELETE CASCADE,
  
  interaction_type TEXT NOT NULL, -- email, call, meeting, linkedin, coffee, etc.
  interaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  outcome TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS policies for contact_interactions
ALTER TABLE public.contact_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contact interactions"
  ON public.contact_interactions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own contact interactions"
  ON public.contact_interactions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own contact interactions"
  ON public.contact_interactions
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own contact interactions"
  ON public.contact_interactions
  FOR DELETE
  USING (user_id = auth.uid());

-- Contact reminders
CREATE TABLE IF NOT EXISTS public.contact_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.professional_contacts(id) ON DELETE CASCADE,
  
  reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_type TEXT NOT NULL DEFAULT 'followup', -- followup, birthday, checkin, etc.
  reminder_message TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS policies for contact_reminders
ALTER TABLE public.contact_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contact reminders"
  ON public.contact_reminders
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own contact reminders"
  ON public.contact_reminders
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own contact reminders"
  ON public.contact_reminders
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own contact reminders"
  ON public.contact_reminders
  FOR DELETE
  USING (user_id = auth.uid());

-- Indexes for better performance
CREATE INDEX idx_interview_predictions_user ON public.interview_success_predictions(user_id);
CREATE INDEX idx_interview_predictions_interview ON public.interview_success_predictions(interview_id);
CREATE INDEX idx_professional_contacts_user ON public.professional_contacts(user_id);
CREATE INDEX idx_professional_contacts_company ON public.professional_contacts(current_company);
CREATE INDEX idx_contact_interactions_contact ON public.contact_interactions(contact_id);
CREATE INDEX idx_contact_reminders_contact ON public.contact_reminders(contact_id);
CREATE INDEX idx_contact_reminders_date ON public.contact_reminders(reminder_date);