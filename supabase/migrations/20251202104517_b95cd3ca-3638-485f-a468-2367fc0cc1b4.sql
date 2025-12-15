-- Drop the restrictive team policies and replace with ones that allow all team members
-- The privacy filtering happens at the application level via progress_sharing_settings

-- Update jobs policy
DROP POLICY IF EXISTS "Team members can view teammate jobs" ON public.jobs;
CREATE POLICY "Team members can view teammate jobs" ON public.jobs
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM team_members tm_viewer
    JOIN team_members tm_target ON tm_viewer.team_id = tm_target.team_id
    WHERE tm_viewer.user_id = auth.uid()
      AND tm_target.user_id = jobs.user_id
  )
);

-- Update interviews policy
DROP POLICY IF EXISTS "Team members can view teammate interviews" ON public.interviews;
CREATE POLICY "Team members can view teammate interviews" ON public.interviews
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM team_members tm_viewer
    JOIN team_members tm_target ON tm_viewer.team_id = tm_target.team_id
    WHERE tm_viewer.user_id = auth.uid()
      AND tm_target.user_id = interviews.user_id
  )
);

-- Update career_goals policy
DROP POLICY IF EXISTS "Team members can view teammate goals" ON public.career_goals;
CREATE POLICY "Team members can view teammate goals" ON public.career_goals
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM team_members tm_viewer
    JOIN team_members tm_target ON tm_viewer.team_id = tm_target.team_id
    WHERE tm_viewer.user_id = auth.uid()
      AND tm_target.user_id = career_goals.user_id
  )
);