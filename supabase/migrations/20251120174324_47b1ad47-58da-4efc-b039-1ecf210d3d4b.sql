-- Create relationship maintenance templates table
CREATE TABLE IF NOT EXISTS public.relationship_maintenance_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('birthday', 'congratulations', 'check_in', 'share_news', 'reconnect')),
  subject TEXT,
  content TEXT NOT NULL,
  is_system_template BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create relationship health tracking table
CREATE TABLE IF NOT EXISTS public.relationship_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.professional_contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  last_interaction_date TIMESTAMPTZ,
  interaction_frequency_days INTEGER,
  reciprocity_score INTEGER CHECK (reciprocity_score >= 0 AND reciprocity_score <= 100),
  engagement_level TEXT CHECK (engagement_level IN ('high', 'medium', 'low', 'dormant')),
  value_exchange_score INTEGER CHECK (value_exchange_score >= 0 AND value_exchange_score <= 100),
  opportunities_generated INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contact_id, user_id)
);

-- Create relationship maintenance reminders table (enhanced version of contact_reminders)
CREATE TABLE IF NOT EXISTS public.relationship_maintenance_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id UUID REFERENCES public.professional_contacts(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('periodic_check_in', 'birthday', 'work_anniversary', 'follow_up', 'share_news', 'reconnect')),
  reminder_date TIMESTAMPTZ NOT NULL,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  suggested_action TEXT,
  suggested_template_id UUID REFERENCES public.relationship_maintenance_templates(id),
  ai_generated_message TEXT,
  context_data JSONB DEFAULT '{}'::jsonb,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create relationship activities tracking table
CREATE TABLE IF NOT EXISTS public.relationship_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id UUID REFERENCES public.professional_contacts(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('email', 'call', 'meeting', 'message', 'shared_content', 'referral', 'collaboration')),
  activity_date TIMESTAMPTZ DEFAULT now(),
  direction TEXT CHECK (direction IN ('outbound', 'inbound', 'mutual')) DEFAULT 'outbound',
  value_provided TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create relationship strengthening suggestions table
CREATE TABLE IF NOT EXISTS public.relationship_strengthening_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id UUID REFERENCES public.professional_contacts(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('share_article', 'make_introduction', 'congratulate', 'offer_help', 'schedule_coffee', 'share_opportunity')),
  suggestion_title TEXT NOT NULL,
  suggestion_description TEXT NOT NULL,
  relevance_score INTEGER CHECK (relevance_score >= 0 AND relevance_score <= 100),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.relationship_maintenance_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_maintenance_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_strengthening_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for relationship_maintenance_templates
CREATE POLICY "Users can view own and system templates"
  ON public.relationship_maintenance_templates FOR SELECT
  USING (user_id = auth.uid() OR is_system_template = true);

CREATE POLICY "Users can create own templates"
  ON public.relationship_maintenance_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own templates"
  ON public.relationship_maintenance_templates FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own templates"
  ON public.relationship_maintenance_templates FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for relationship_health_metrics
CREATE POLICY "Users can view own health metrics"
  ON public.relationship_health_metrics FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own health metrics"
  ON public.relationship_health_metrics FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own health metrics"
  ON public.relationship_health_metrics FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own health metrics"
  ON public.relationship_health_metrics FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for relationship_maintenance_reminders
CREATE POLICY "Users can view own reminders"
  ON public.relationship_maintenance_reminders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own reminders"
  ON public.relationship_maintenance_reminders FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reminders"
  ON public.relationship_maintenance_reminders FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own reminders"
  ON public.relationship_maintenance_reminders FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for relationship_activities
CREATE POLICY "Users can view own activities"
  ON public.relationship_activities FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own activities"
  ON public.relationship_activities FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own activities"
  ON public.relationship_activities FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own activities"
  ON public.relationship_activities FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for relationship_strengthening_suggestions
CREATE POLICY "Users can view own suggestions"
  ON public.relationship_strengthening_suggestions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own suggestions"
  ON public.relationship_strengthening_suggestions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own suggestions"
  ON public.relationship_strengthening_suggestions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own suggestions"
  ON public.relationship_strengthening_suggestions FOR DELETE
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_relationship_health_metrics_contact ON public.relationship_health_metrics(contact_id);
CREATE INDEX idx_relationship_health_metrics_user ON public.relationship_health_metrics(user_id);
CREATE INDEX idx_relationship_maintenance_reminders_user_date ON public.relationship_maintenance_reminders(user_id, reminder_date);
CREATE INDEX idx_relationship_maintenance_reminders_contact ON public.relationship_maintenance_reminders(contact_id);
CREATE INDEX idx_relationship_activities_contact ON public.relationship_activities(contact_id);
CREATE INDEX idx_relationship_activities_user_date ON public.relationship_activities(user_id, activity_date);
CREATE INDEX idx_relationship_strengthening_suggestions_user_status ON public.relationship_strengthening_suggestions(user_id, status);

-- Insert some default system templates
INSERT INTO public.relationship_maintenance_templates (template_name, template_type, subject, content, is_system_template) VALUES
  ('Birthday Wishes', 'birthday', 'Happy Birthday!', 'Happy Birthday, {name}! 🎉\n\nWishing you a fantastic year ahead filled with success and happiness.\n\nBest regards,\n{user_name}', true),
  ('Congratulations', 'congratulations', 'Congratulations on {achievement}!', 'Hi {name},\n\nCongratulations on {achievement}! This is a well-deserved accomplishment.\n\nWishing you continued success!\n\nBest,\n{user_name}', true),
  ('Periodic Check-in', 'check_in', 'Checking in', 'Hi {name},\n\nI hope this message finds you well! It''s been a while since we last connected, and I wanted to check in to see how things are going.\n\nWould love to catch up when you have time.\n\nBest,\n{user_name}', true),
  ('Share Industry News', 'share_news', 'Thought you might find this interesting', 'Hi {name},\n\nI came across this article/news and immediately thought of you given your work in {industry}.\n\n{news_link}\n\nWould love to hear your thoughts on this!\n\nBest,\n{user_name}', true),
  ('Reconnect', 'reconnect', 'Long time no talk!', 'Hi {name},\n\nIt''s been too long! I was thinking about our last conversation about {topic} and wanted to reconnect.\n\nWould you be open to a quick coffee chat sometime?\n\nLooking forward to catching up,\n{user_name}', true);