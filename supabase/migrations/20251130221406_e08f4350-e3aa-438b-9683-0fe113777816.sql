-- Add LinkedIn profile fields to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS linkedin_profile_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_headline TEXT,
ADD COLUMN IF NOT EXISTS linkedin_picture_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_name TEXT;

-- Add LinkedIn profile URL to jobs table for linking applications
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS linkedin_profile_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.user_profiles.linkedin_profile_url IS 'Public LinkedIn profile URL imported from LinkedIn OAuth';
COMMENT ON COLUMN public.user_profiles.linkedin_headline IS 'Professional headline from LinkedIn profile';
COMMENT ON COLUMN public.user_profiles.linkedin_picture_url IS 'Profile picture URL from LinkedIn';
COMMENT ON COLUMN public.user_profiles.linkedin_name IS 'Full name from LinkedIn for comparison/import';
COMMENT ON COLUMN public.jobs.linkedin_profile_url IS 'LinkedIn profile URL to reference for this job application';