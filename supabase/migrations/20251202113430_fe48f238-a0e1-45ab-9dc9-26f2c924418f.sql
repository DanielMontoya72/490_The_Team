-- UC-113: Family and Personal Support Integration

-- Table for family/personal supporters
CREATE TABLE public.family_supporters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  supporter_name TEXT NOT NULL,
  supporter_email TEXT,
  relationship_type TEXT NOT NULL DEFAULT 'family', -- family, friend, partner, other
  invite_status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined
  invite_token TEXT UNIQUE,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for privacy/sharing settings per supporter
CREATE TABLE public.family_sharing_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  supporter_id UUID NOT NULL REFERENCES public.family_supporters(id) ON DELETE CASCADE,
  share_application_count BOOLEAN DEFAULT true,
  share_interview_count BOOLEAN DEFAULT true,
  share_milestones BOOLEAN DEFAULT true,
  share_mood_status BOOLEAN DEFAULT false,
  share_detailed_progress BOOLEAN DEFAULT false,
  hide_company_names BOOLEAN DEFAULT true,
  hide_salary_info BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, supporter_id)
);

-- Table for milestone celebrations shared with family
CREATE TABLE public.family_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  milestone_type TEXT NOT NULL, -- interview_scheduled, offer_received, application_sent, goal_achieved, first_response
  milestone_title TEXT NOT NULL,
  milestone_description TEXT,
  celebration_message TEXT,
  is_public_to_supporters BOOLEAN DEFAULT true,
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for wellbeing and stress tracking
CREATE TABLE public.wellbeing_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tracking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood_score INTEGER CHECK (mood_score >= 1 AND mood_score <= 5), -- 1=very low, 5=great
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 5), -- 1=low, 5=high
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  motivation_level INTEGER CHECK (motivation_level >= 1 AND motivation_level <= 5),
  emotional_support_received BOOLEAN DEFAULT false,
  support_impact_rating INTEGER CHECK (support_impact_rating >= 1 AND support_impact_rating <= 5),
  notes TEXT,
  activities_completed JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tracking_date)
);

-- Table for family communication/updates
CREATE TABLE public.family_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  update_type TEXT NOT NULL DEFAULT 'general', -- general, milestone, weekly_summary, request_support
  update_title TEXT NOT NULL,
  update_content TEXT NOT NULL,
  is_auto_generated BOOLEAN DEFAULT false,
  shared_with_all BOOLEAN DEFAULT true,
  specific_supporters UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for boundary settings
CREATE TABLE public.support_boundaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  preferred_contact_frequency TEXT DEFAULT 'weekly', -- daily, weekly, milestone_only
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  topics_off_limits TEXT[] DEFAULT '{}',
  preferred_support_types TEXT[] DEFAULT '{"emotional", "practical"}',
  allow_unsolicited_advice BOOLEAN DEFAULT true,
  communication_preferences JSONB DEFAULT '{"text": true, "call": false, "in_person": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for support resources (educational content for family)
CREATE TABLE public.family_support_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_title TEXT NOT NULL,
  resource_description TEXT,
  resource_type TEXT NOT NULL, -- article, video, guide, tip
  resource_category TEXT NOT NULL, -- understanding_job_search, emotional_support, practical_help, communication_tips
  resource_url TEXT,
  resource_content TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.family_supporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_sharing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellbeing_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_boundaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_support_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for family_supporters
CREATE POLICY "Users can manage their own supporters"
  ON public.family_supporters FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Supporters can view their invitation via token"
  ON public.family_supporters FOR SELECT
  USING (invite_token IS NOT NULL);

-- RLS Policies for family_sharing_settings
CREATE POLICY "Users can manage their sharing settings"
  ON public.family_sharing_settings FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for family_milestones
CREATE POLICY "Users can manage their milestones"
  ON public.family_milestones FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Public milestones viewable by supporters"
  ON public.family_milestones FOR SELECT
  USING (is_public_to_supporters = true);

-- RLS Policies for wellbeing_tracking
CREATE POLICY "Users can manage their wellbeing data"
  ON public.wellbeing_tracking FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for family_updates
CREATE POLICY "Users can manage their updates"
  ON public.family_updates FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for support_boundaries
CREATE POLICY "Users can manage their boundaries"
  ON public.support_boundaries FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for family_support_resources (public read)
CREATE POLICY "Anyone can view active resources"
  ON public.family_support_resources FOR SELECT
  USING (is_active = true);

-- Insert default educational resources for family members
INSERT INTO public.family_support_resources (resource_title, resource_description, resource_type, resource_category, resource_content, display_order) VALUES
('Understanding the Modern Job Search', 'Learn how job searching has evolved and what your loved one is experiencing.', 'guide', 'understanding_job_search', 'The job search process today involves multiple stages: researching companies, tailoring applications, networking, interviews (often multiple rounds), and negotiation. It can take 3-6 months on average. Your patience and understanding during this time is invaluable.', 1),
('How to Provide Emotional Support', 'Practical tips for supporting someone through their job search journey.', 'guide', 'emotional_support', 'Listen without judgment, celebrate small wins, avoid asking "any news?" too frequently, acknowledge their efforts (not just outcomes), and remind them of their strengths and past successes.', 2),
('What NOT to Say During a Job Search', 'Common well-meaning phrases that can be discouraging and better alternatives.', 'tip', 'communication_tips', 'Avoid: "Just apply everywhere", "Have you tried...?", "My friend got a job easily", "When I was job searching...". Instead try: "I believe in you", "What can I help with today?", "Your hard work will pay off".', 3),
('Practical Ways to Help', 'Concrete actions you can take to support your loved one.', 'guide', 'practical_help', 'Offer to review their resume or cover letter, help with household tasks to free up their time, be a practice interview partner, share relevant job postings you come across, or simply provide a quiet space for them to work.', 4),
('Recognizing Job Search Burnout', 'Signs that your loved one may need extra support or a break.', 'article', 'emotional_support', 'Watch for: withdrawal from activities, changes in sleep or appetite, increased irritability, loss of confidence, or avoiding job search activities. Encourage breaks, self-care, and professional support if needed.', 5),
('Celebrating Progress, Not Just Outcomes', 'Why acknowledging effort matters more than waiting for "the job".', 'tip', 'emotional_support', 'Celebrate: submitting applications, getting interviews, improving their resume, learning new skills, expanding their network. Every step forward deserves recognition.', 6);

-- Trigger to update timestamps
CREATE TRIGGER update_family_supporters_updated_at
  BEFORE UPDATE ON public.family_supporters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_family_sharing_settings_updated_at
  BEFORE UPDATE ON public.family_sharing_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wellbeing_tracking_updated_at
  BEFORE UPDATE ON public.wellbeing_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_boundaries_updated_at
  BEFORE UPDATE ON public.support_boundaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();