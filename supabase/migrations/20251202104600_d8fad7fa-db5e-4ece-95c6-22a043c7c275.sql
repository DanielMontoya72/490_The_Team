-- Allow team members to view each other's privacy settings
-- This is needed so the profile viewer can check what the member is sharing

CREATE POLICY "Team members can view teammate sharing settings" 
ON public.progress_sharing_settings
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM team_members tm_viewer
    JOIN team_members tm_target ON tm_viewer.team_id = tm_target.team_id
    WHERE tm_viewer.user_id = auth.uid()
      AND tm_target.user_id = progress_sharing_settings.user_id
  )
);