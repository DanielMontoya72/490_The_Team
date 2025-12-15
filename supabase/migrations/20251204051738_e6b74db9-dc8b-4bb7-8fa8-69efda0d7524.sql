-- Create table for sharing external job links with teams
CREATE TABLE public.team_shared_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL,
  job_title TEXT NOT NULL,
  company_name TEXT,
  job_url TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for comments on shared links
CREATE TABLE public.team_link_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_link_id UUID NOT NULL REFERENCES public.team_shared_links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_shared_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_link_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_shared_links
CREATE POLICY "Team members can view shared links"
ON public.team_shared_links FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.team_id = team_shared_links.team_id 
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Team members can share links"
ON public.team_shared_links FOR INSERT
WITH CHECK (
  auth.uid() = shared_by AND
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.team_id = team_shared_links.team_id 
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Sharers can delete shared links"
ON public.team_shared_links FOR DELETE
USING (auth.uid() = shared_by);

-- RLS policies for team_link_comments
CREATE POLICY "Team members can view link comments"
ON public.team_link_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_shared_links tsl
    JOIN public.team_members tm ON tm.team_id = tsl.team_id
    WHERE tsl.id = team_link_comments.shared_link_id 
    AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Team members can add link comments"
ON public.team_link_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.team_shared_links tsl
    JOIN public.team_members tm ON tm.team_id = tsl.team_id
    WHERE tsl.id = team_link_comments.shared_link_id 
    AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own link comments"
ON public.team_link_comments FOR DELETE
USING (auth.uid() = user_id);