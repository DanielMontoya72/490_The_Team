-- Add social_media field to company_research table
ALTER TABLE company_research 
ADD COLUMN social_media jsonb DEFAULT '{}'::jsonb;