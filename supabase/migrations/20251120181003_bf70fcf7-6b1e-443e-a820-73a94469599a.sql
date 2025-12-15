-- Add columns to relationship_maintenance_reminders for templates and categories
ALTER TABLE relationship_maintenance_reminders 
ADD COLUMN IF NOT EXISTS template_type TEXT,
ADD COLUMN IF NOT EXISTS template_content TEXT;

-- Add columns to relationship_health_metrics for reciprocity and value exchange
ALTER TABLE relationship_health_metrics
ADD COLUMN IF NOT EXISTS reciprocity_score NUMERIC,
ADD COLUMN IF NOT EXISTS value_exchange_score NUMERIC,
ADD COLUMN IF NOT EXISTS interaction_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_interaction_date TIMESTAMP WITH TIME ZONE;

-- Create relationship_templates table
CREATE TABLE IF NOT EXISTS relationship_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- Nullable for system templates
  template_type TEXT NOT NULL, -- birthday, congratulations, check_in, industry_news, etc.
  template_name TEXT NOT NULL,
  subject_line TEXT,
  message_template TEXT NOT NULL,
  is_system_template BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE relationship_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for relationship_templates
CREATE POLICY "Users can view own and system templates"
  ON relationship_templates FOR SELECT
  USING (user_id = auth.uid() OR is_system_template = true);

CREATE POLICY "Users can create own templates"
  ON relationship_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own templates"
  ON relationship_templates FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own templates"
  ON relationship_templates FOR DELETE
  USING (user_id = auth.uid());

-- Create relationship_impact_metrics table
CREATE TABLE IF NOT EXISTS relationship_impact_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id UUID REFERENCES professional_contacts(id) ON DELETE CASCADE,
  metric_date DATE DEFAULT CURRENT_DATE,
  outreach_sent INTEGER DEFAULT 0,
  responses_received INTEGER DEFAULT 0,
  opportunities_generated INTEGER DEFAULT 0,
  referrals_received INTEGER DEFAULT 0,
  meetings_scheduled INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE relationship_impact_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for relationship_impact_metrics
CREATE POLICY "Users can view own impact metrics"
  ON relationship_impact_metrics FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own impact metrics"
  ON relationship_impact_metrics FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own impact metrics"
  ON relationship_impact_metrics FOR UPDATE
  USING (user_id = auth.uid());

-- Insert system templates (user_id is NULL for system templates)
INSERT INTO relationship_templates (user_id, template_type, template_name, subject_line, message_template, is_system_template) VALUES
(NULL, 'birthday', 'Birthday Wishes', 'Happy Birthday, {first_name}!', 'Hi {first_name},\n\nWishing you a wonderful birthday! I hope this year brings you great success and happiness.\n\nBest regards', true),
(NULL, 'congratulations', 'Job Promotion Congratulations', 'Congratulations on your new role!', 'Hi {first_name},\n\nI saw your update about {occasion}. Congratulations! This is well-deserved and I''m excited to see what you accomplish in this new role.\n\nLet''s catch up soon!\n\nBest regards', true),
(NULL, 'check_in', 'Periodic Check-in', 'Let''s catch up!', 'Hi {first_name},\n\nIt''s been a while since we last connected. I''d love to hear what you''ve been working on lately.\n\nAre you available for a quick coffee chat or call next week?\n\nBest regards', true),
(NULL, 'industry_news', 'Industry News Share', 'Thought you''d find this interesting', 'Hi {first_name},\n\nI came across this article about {topic} and immediately thought of you given your work in {industry}.\n\n{article_link}\n\nWould love to hear your thoughts on this!\n\nBest regards', true),
(NULL, 'referral_request', 'Referral Request', 'Quick question about {company}', 'Hi {first_name},\n\nI hope you''re doing well! I''m currently exploring opportunities at {company} and noticed you have connections there.\n\nWould you be comfortable making an introduction or sharing any insights about the company culture?\n\nNo pressure at all - I appreciate any guidance you can offer!\n\nBest regards', true)
ON CONFLICT DO NOTHING;