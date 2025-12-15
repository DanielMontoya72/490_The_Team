-- Add start_date column to education table
ALTER TABLE public.education
ADD COLUMN IF NOT EXISTS start_date DATE;
