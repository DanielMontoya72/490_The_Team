-- Add review_deadline column to mentor_feedback table
-- This allows mentors to set deadlines directly when giving feedback on materials
ALTER TABLE public.mentor_feedback 
ADD COLUMN review_deadline TIMESTAMP WITH TIME ZONE;