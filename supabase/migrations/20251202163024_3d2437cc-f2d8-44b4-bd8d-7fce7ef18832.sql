-- Add LinkedIn profile columns to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS linkedin_access_token TEXT,
ADD COLUMN IF NOT EXISTS linkedin_profile_id TEXT,
ADD COLUMN IF NOT EXISTS linkedin_profile_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_headline TEXT,
ADD COLUMN IF NOT EXISTS linkedin_picture_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_name TEXT;