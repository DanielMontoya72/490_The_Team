-- Create table for storing informational interview templates
CREATE TABLE IF NOT EXISTS informational_interview_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interview_id UUID NOT NULL REFERENCES informational_interviews(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE informational_interview_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own templates
CREATE POLICY "Users can view their own templates"
  ON informational_interview_templates
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own templates
CREATE POLICY "Users can insert their own templates"
  ON informational_interview_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own templates
CREATE POLICY "Users can update their own templates"
  ON informational_interview_templates
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own templates
CREATE POLICY "Users can delete their own templates"
  ON informational_interview_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_informational_interview_templates_user_id ON informational_interview_templates(user_id);
CREATE INDEX idx_informational_interview_templates_interview_id ON informational_interview_templates(interview_id);
