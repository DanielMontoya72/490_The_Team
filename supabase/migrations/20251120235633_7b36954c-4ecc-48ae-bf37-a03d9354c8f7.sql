-- Add birthday and additional tracking fields to professional_contacts
ALTER TABLE public.professional_contacts
ADD COLUMN IF NOT EXISTS birthday date,
ADD COLUMN IF NOT EXISTS shared_interests text[],
ADD COLUMN IF NOT EXISTS relationship_strength text DEFAULT 'weak',
ADD COLUMN IF NOT EXISTS opportunities_generated integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_opportunity_date timestamp with time zone;

-- Create table for relationship maintenance templates
CREATE TABLE IF NOT EXISTS public.relationship_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_type text NOT NULL,
  template_name text NOT NULL,
  subject_line text,
  message_body text NOT NULL,
  tone text DEFAULT 'professional',
  is_default boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT valid_template_type CHECK (template_type IN ('birthday', 'congratulations', 'check_in', 'industry_news', 'thank_you', 'update')),
  CONSTRAINT valid_tone CHECK (tone IN ('professional', 'casual', 'formal', 'friendly'))
);

-- Enable RLS on relationship_message_templates
ALTER TABLE public.relationship_message_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for relationship_message_templates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'relationship_message_templates' AND policyname = 'Users can view own templates'
  ) THEN
    CREATE POLICY "Users can view own templates"
      ON public.relationship_message_templates
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'relationship_message_templates' AND policyname = 'Users can create own templates'
  ) THEN
    CREATE POLICY "Users can create own templates"
      ON public.relationship_message_templates
      FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'relationship_message_templates' AND policyname = 'Users can update own templates'
  ) THEN
    CREATE POLICY "Users can update own templates"
      ON public.relationship_message_templates
      FOR UPDATE
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'relationship_message_templates' AND policyname = 'Users can delete own templates'
  ) THEN
    CREATE POLICY "Users can delete own templates"
      ON public.relationship_message_templates
      FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Add constraint to professional_contacts if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_relationship_strength'
  ) THEN
    ALTER TABLE public.professional_contacts
    ADD CONSTRAINT valid_relationship_strength CHECK (relationship_strength IN ('weak', 'moderate', 'strong', 'very_strong'));
  END IF;
END $$;

-- Create trigger to update updated_at on relationship_message_templates
CREATE OR REPLACE FUNCTION public.update_relationship_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_relationship_templates_timestamp ON public.relationship_message_templates;

CREATE TRIGGER update_relationship_templates_timestamp
  BEFORE UPDATE ON public.relationship_message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_relationship_templates_updated_at();