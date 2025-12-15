-- Create github_repositories table for storing user's GitHub repos
CREATE TABLE public.github_repositories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  repo_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  html_url TEXT NOT NULL,
  language TEXT,
  stargazers_count INTEGER DEFAULT 0,
  forks_count INTEGER DEFAULT 0,
  watchers_count INTEGER DEFAULT 0,
  open_issues_count INTEGER DEFAULT 0,
  is_fork BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  topics TEXT[],
  pushed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, repo_id)
);

-- Create github_integrations table for storing OAuth tokens
CREATE TABLE public.github_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  github_username TEXT,
  github_avatar_url TEXT,
  access_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'bearer',
  scope TEXT,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_integrations ENABLE ROW LEVEL SECURITY;

-- RLS policies for github_repositories
CREATE POLICY "Users can view their own repos" ON public.github_repositories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own repos" ON public.github_repositories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own repos" ON public.github_repositories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own repos" ON public.github_repositories
  FOR DELETE USING (auth.uid() = user_id);

-- Public can view featured repos for profile display
CREATE POLICY "Anyone can view featured repos" ON public.github_repositories
  FOR SELECT USING (is_featured = true);

-- RLS policies for github_integrations
CREATE POLICY "Users can view their own integration" ON public.github_integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integration" ON public.github_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integration" ON public.github_integrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integration" ON public.github_integrations
  FOR DELETE USING (auth.uid() = user_id);