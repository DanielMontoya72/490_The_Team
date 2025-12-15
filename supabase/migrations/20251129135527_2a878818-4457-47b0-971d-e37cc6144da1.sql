-- Add column to track if message is from mentor
ALTER TABLE public.mentor_invitation_messages 
ADD COLUMN is_from_mentor boolean NOT NULL DEFAULT false;