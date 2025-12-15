
-- Add RLS policies for team admins and mentors to view candidate data within their teams

-- Policy for jobs: Team admins and mentors can view candidate jobs
CREATE POLICY "Team admins and mentors can view candidate jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_members tm_viewer
    JOIN public.team_members tm_candidate ON tm_viewer.team_id = tm_candidate.team_id
    WHERE tm_viewer.user_id = auth.uid()
      AND tm_candidate.user_id = jobs.user_id
      AND tm_viewer.role IN ('owner', 'admin', 'mentor')
      AND tm_candidate.role = 'candidate'
  )
);

-- Policy for interviews: Team admins and mentors can view candidate interviews
CREATE POLICY "Team admins and mentors can view candidate interviews"
ON public.interviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_members tm_viewer
    JOIN public.team_members tm_candidate ON tm_viewer.team_id = tm_candidate.team_id
    WHERE tm_viewer.user_id = auth.uid()
      AND tm_candidate.user_id = interviews.user_id
      AND tm_viewer.role IN ('owner', 'admin', 'mentor')
      AND tm_candidate.role = 'candidate'
  )
);

-- Policy for career_goals: Team admins and mentors can view candidate goals
CREATE POLICY "Team admins and mentors can view candidate goals"
ON public.career_goals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_members tm_viewer
    JOIN public.team_members tm_candidate ON tm_viewer.team_id = tm_candidate.team_id
    WHERE tm_viewer.user_id = auth.uid()
      AND tm_candidate.user_id = career_goals.user_id
      AND tm_viewer.role IN ('owner', 'admin', 'mentor')
      AND tm_candidate.role = 'candidate'
  )
);

-- Policy for user_profiles: Team admins and mentors can view candidate profiles
CREATE POLICY "Team admins and mentors can view candidate profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_members tm_viewer
    JOIN public.team_members tm_candidate ON tm_viewer.team_id = tm_candidate.team_id
    WHERE tm_viewer.user_id = auth.uid()
      AND tm_candidate.user_id = user_profiles.user_id
      AND tm_viewer.role IN ('owner', 'admin', 'mentor')
      AND tm_candidate.role = 'candidate'
  )
);
