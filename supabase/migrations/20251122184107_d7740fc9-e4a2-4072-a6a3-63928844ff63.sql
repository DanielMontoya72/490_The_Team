-- Drop the existing foreign key constraint
ALTER TABLE industry_news_suggestions 
DROP CONSTRAINT IF EXISTS industry_news_suggestions_contact_id_fkey;

-- Make contact_id nullable to support both professional_contacts and contact_suggestions
-- Add a new column to track the source table
ALTER TABLE industry_news_suggestions 
ADD COLUMN IF NOT EXISTS contact_source TEXT DEFAULT 'professional_contacts' CHECK (contact_source IN ('professional_contacts', 'contact_suggestions'));