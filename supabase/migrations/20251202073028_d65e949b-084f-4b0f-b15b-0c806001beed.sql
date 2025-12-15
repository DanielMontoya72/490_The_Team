
-- Drop the existing restrictive policies and create broader ones for team members
-- Allow team owners/admins/mentors to view ALL team members' data (not just candidates)

-- Update jobs policy
DROP POLICY IF EXISTS "Team admins and mentors can view candidate jobs" ON public.jobs;
CREATE POLICY "Team members can view teammate jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_members tm_viewer
    JOIN public.team_members tm_target ON tm_viewer.team_id = tm_target.team_id
    WHERE tm_viewer.user_id = auth.uid()
      AND tm_target.user_id = jobs.user_id
      AND tm_viewer.role IN ('owner', 'admin', 'mentor')
  )
);

-- Update interviews policy
DROP POLICY IF EXISTS "Team admins and mentors can view candidate interviews" ON public.interviews;
CREATE POLICY "Team members can view teammate interviews"
ON public.interviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_members tm_viewer
    JOIN public.team_members tm_target ON tm_viewer.team_id = tm_target.team_id
    WHERE tm_viewer.user_id = auth.uid()
      AND tm_target.user_id = interviews.user_id
      AND tm_viewer.role IN ('owner', 'admin', 'mentor')
  )
);

-- Update career_goals policy
DROP POLICY IF EXISTS "Team admins and mentors can view candidate goals" ON public.career_goals;
CREATE POLICY "Team members can view teammate goals"
ON public.career_goals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_members tm_viewer
    JOIN public.team_members tm_target ON tm_viewer.team_id = tm_target.team_id
    WHERE tm_viewer.user_id = auth.uid()
      AND tm_target.user_id = career_goals.user_id
      AND tm_viewer.role IN ('owner', 'admin', 'mentor')
  )
);

-- Update user_profiles policy
DROP POLICY IF EXISTS "Team admins and mentors can view candidate profiles" ON public.user_profiles;
CREATE POLICY "Team members can view teammate profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_members tm_viewer
    JOIN public.team_members tm_target ON tm_viewer.team_id = tm_target.team_id
    WHERE tm_viewer.user_id = auth.uid()
      AND tm_target.user_id = user_profiles.user_id
      AND tm_viewer.role IN ('owner', 'admin', 'mentor')
  )
);
