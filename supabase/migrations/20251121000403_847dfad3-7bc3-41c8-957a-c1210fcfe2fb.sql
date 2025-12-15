-- Add birthday column to contact_suggestions table
ALTER TABLE public.contact_suggestions
ADD COLUMN birthday date;