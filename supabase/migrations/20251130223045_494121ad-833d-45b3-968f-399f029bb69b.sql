-- Add columns to informational_interviews table for enhanced tracking
ALTER TABLE informational_interviews
ADD COLUMN IF NOT EXISTS interview_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS outcome TEXT,
ADD COLUMN IF NOT EXISTS key_insights TEXT,
ADD COLUMN IF NOT EXISTS follow_up_notes TEXT,
ADD COLUMN IF NOT EXISTS relationship_strength TEXT CHECK (relationship_strength IN ('weak', 'moderate', 'strong')),
ADD COLUMN IF NOT EXISTS job_opportunities_discussed TEXT[],
ADD COLUMN IF NOT EXISTS impact_score INTEGER CHECK (impact_score >= 0 AND impact_score <= 10);

COMMENT ON COLUMN informational_interviews.interview_date IS 'Scheduled date/time for the interview';
COMMENT ON COLUMN informational_interviews.completed_at IS 'When the interview was completed';
COMMENT ON COLUMN informational_interviews.outcome IS 'Outcome of the interview (e.g., went well, no response, rescheduled)';
COMMENT ON COLUMN informational_interviews.key_insights IS 'Key insights and learnings from the conversation';
COMMENT ON COLUMN informational_interviews.follow_up_notes IS 'Notes about follow-up actions and relationship maintenance';
COMMENT ON COLUMN informational_interviews.relationship_strength IS 'Current strength of the relationship';
COMMENT ON COLUMN informational_interviews.job_opportunities_discussed IS 'Array of job opportunities or leads discussed';
COMMENT ON COLUMN informational_interviews.impact_score IS 'Impact score on job search (0-10)';

-- Create table for tracking follow-ups
CREATE TABLE IF NOT EXISTS informational_interview_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  interview_id UUID NOT NULL REFERENCES informational_interviews(id) ON DELETE CASCADE,
  follow_up_type TEXT NOT NULL CHECK (follow_up_type IN ('thank_you', 'check_in', 'update', 'opportunity_share', 'relationship_maintenance')),
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  template_content TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  response_received BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE informational_interview_follow_ups IS 'Tracks follow-up communications after informational interviews';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_follow_ups_user_id ON informational_interview_follow_ups(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_interview_id ON informational_interview_follow_ups(interview_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled_date ON informational_interview_follow_ups(scheduled_date);

-- Enable RLS
ALTER TABLE informational_interview_follow_ups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own follow-ups"
  ON informational_interview_follow_ups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own follow-ups"
  ON informational_interview_follow_ups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own follow-ups"
  ON informational_interview_follow_ups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own follow-ups"
  ON informational_interview_follow_ups FOR DELETE
  USING (auth.uid() = user_id);

-- Create table for linking interviews to job opportunities
CREATE TABLE IF NOT EXISTS informational_interview_job_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  interview_id UUID NOT NULL REFERENCES informational_interviews(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL CHECK (connection_type IN ('referral', 'recommendation', 'insider_info', 'direct_lead', 'industry_insight')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(interview_id, job_id)
);

COMMENT ON TABLE informational_interview_job_links IS 'Links informational interviews to job opportunities';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_interview_job_links_user_id ON informational_interview_job_links(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_job_links_interview_id ON informational_interview_job_links(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_job_links_job_id ON informational_interview_job_links(job_id);

-- Enable RLS
ALTER TABLE informational_interview_job_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own interview-job links"
  ON informational_interview_job_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interview-job links"
  ON informational_interview_job_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interview-job links"
  ON informational_interview_job_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interview-job links"
  ON informational_interview_job_links FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_informational_interview_follow_ups_updated_at
  BEFORE UPDATE ON informational_interview_follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();