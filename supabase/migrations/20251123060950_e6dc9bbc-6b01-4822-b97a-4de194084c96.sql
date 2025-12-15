-- UC-089: Add LinkedIn profile fields to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS linkedin_headline TEXT,
ADD COLUMN IF NOT EXISTS linkedin_profile_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_profile_picture_url TEXT;

-- UC-090: Create informational_interviews table
CREATE TABLE IF NOT EXISTS informational_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  candidate_name TEXT NOT NULL,
  candidate_title TEXT,
  candidate_company TEXT,
  candidate_linkedin_url TEXT,
  candidate_email TEXT,
  request_status TEXT DEFAULT 'pending' CHECK (request_status IN ('pending', 'accepted', 'completed', 'declined')),
  request_date TIMESTAMPTZ DEFAULT now(),
  interview_date TIMESTAMPTZ,
  notes TEXT,
  preparation_notes TEXT,
  follow_up_completed BOOLEAN DEFAULT false,
  follow_up_date TIMESTAMPTZ,
  outcomes TEXT,
  insights TEXT,
  relationship_impact TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on informational_interviews
ALTER TABLE informational_interviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for informational_interviews
CREATE POLICY "Users can view their own informational interviews"
  ON informational_interviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own informational interviews"
  ON informational_interviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own informational interviews"
  ON informational_interviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own informational interviews"
  ON informational_interviews FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_informational_interviews_user_id 
  ON informational_interviews(user_id);

-- Update trigger for informational_interviews
CREATE TRIGGER update_informational_interviews_updated_at
  BEFORE UPDATE ON informational_interviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();