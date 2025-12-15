-- Add is_archived column to application_materials table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'application_materials' 
    AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE public.application_materials ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create index for faster queries on archived materials (if not exists)
CREATE INDEX IF NOT EXISTS idx_application_materials_archived ON public.application_materials(user_id, is_archived, material_type);
