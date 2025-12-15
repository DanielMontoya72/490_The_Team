-- Add timezone column to geocoded_locations if it doesn't exist
ALTER TABLE public.geocoded_locations 
ADD COLUMN IF NOT EXISTS timezone TEXT;