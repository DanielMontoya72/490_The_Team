-- Add is_archived column to application_materials table for cover letter archiving
ALTER TABLE public.application_materials 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;