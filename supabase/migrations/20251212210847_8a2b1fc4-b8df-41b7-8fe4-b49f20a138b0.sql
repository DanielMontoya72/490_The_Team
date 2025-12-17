-- Add auto_import_enabled column to gmail_integrations
ALTER TABLE public.gmail_integrations 
ADD COLUMN IF NOT EXISTS auto_import_enabled boolean DEFAULT false;