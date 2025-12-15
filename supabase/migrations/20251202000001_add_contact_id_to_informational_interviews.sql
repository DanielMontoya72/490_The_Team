-- Add contact_id column to informational_interviews table
ALTER TABLE informational_interviews 
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES professional_contacts(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_informational_interviews_contact_id 
  ON informational_interviews(contact_id);
