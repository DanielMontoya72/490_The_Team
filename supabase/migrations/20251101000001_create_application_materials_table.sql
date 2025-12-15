-- Create application_materials table (base table referenced by other tables)
CREATE TABLE IF NOT EXISTS public.application_materials (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    is_archived boolean DEFAULT false,
    material_type text NOT NULL,
    version_name text NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL
);

-- Enable RLS
ALTER TABLE public.application_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own application materials"
  ON public.application_materials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own application materials"
  ON public.application_materials
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own application materials"
  ON public.application_materials
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own application materials"
  ON public.application_materials
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER set_application_materials_updated_at
  BEFORE UPDATE ON public.application_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

