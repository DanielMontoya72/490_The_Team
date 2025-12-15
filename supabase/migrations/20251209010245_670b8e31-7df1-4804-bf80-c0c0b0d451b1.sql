-- Add contribution_data column to github_integrations
ALTER TABLE public.github_integrations 
ADD COLUMN IF NOT EXISTS contribution_data jsonb DEFAULT '{}'::jsonb;

-- Add created_at column to github_repositories if missing
ALTER TABLE public.github_repositories 
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();