-- Add follow-up tracking columns to referral_requests
ALTER TABLE public.referral_requests 
ADD COLUMN IF NOT EXISTS follow_up_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_follow_up_message text;