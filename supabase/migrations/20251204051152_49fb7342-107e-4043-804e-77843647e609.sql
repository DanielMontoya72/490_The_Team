-- Create table for sharing job postings with teams
CREATE TABLE public.team_shared_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, job_id)
);

-- Create table for comments on shared jobs
CREATE TABLE public.team_job_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_job_id UUID NOT NULL REFERENCES public.team_shared_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_shared_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_job_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_shared_jobs
CREATE POLICY "Team members can view shared jobs"
ON public.team_shared_jobs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.team_id = team_shared_jobs.team_id 
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Team members can share jobs"
ON public.team_shared_jobs FOR INSERT
WITH CHECK (
  auth.uid() = shared_by AND
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.team_id = team_shared_jobs.team_id 
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Sharers can delete shared jobs"
ON public.team_shared_jobs FOR DELETE
USING (auth.uid() = shared_by);

-- RLS policies for team_job_comments
CREATE POLICY "Team members can view comments"
ON public.team_job_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_shared_jobs tsj
    JOIN public.team_members tm ON tm.team_id = tsj.team_id
    WHERE tsj.id = team_job_comments.shared_job_id 
    AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Team members can add comments"
ON public.team_job_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.team_shared_jobs tsj
    JOIN public.team_members tm ON tm.team_id = tsj.team_id
    WHERE tsj.id = team_job_comments.shared_job_id 
    AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own comments"
ON public.team_job_comments FOR DELETE
USING (auth.uid() = user_id);