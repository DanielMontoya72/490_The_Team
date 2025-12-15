-- Allow team members to view each other's achievements
CREATE POLICY "Team members can view teammate achievements" 
ON public.goal_achievements
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM team_members tm_viewer
    JOIN team_members tm_target ON tm_viewer.team_id = tm_target.team_id
    WHERE tm_viewer.user_id = auth.uid()
      AND tm_target.user_id = goal_achievements.user_id
  )
);

-- Allow team members to view each other's resumes
CREATE POLICY "Team members can view teammate resumes" 
ON public.resumes
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM team_members tm_viewer
    JOIN team_members tm_target ON tm_viewer.team_id = tm_target.team_id
    WHERE tm_viewer.user_id = auth.uid()
      AND tm_target.user_id = resumes.user_id
  )
);