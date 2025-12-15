-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Shared users can view progress" ON public.progress_shares;
DROP POLICY IF EXISTS "Users can view own shares" ON public.progress_shares;

-- Create combined SELECT policy that allows:
-- 1. Users to see their own shares
-- 2. Team members to see shares with visibility='team' or 'all' from other team members
CREATE POLICY "Users can view progress shares"
ON public.progress_shares
FOR SELECT
USING (
  auth.uid() = user_id
  OR auth.uid() = shared_with_id
  OR (
    visibility IN ('team', 'all')
    AND EXISTS (
      SELECT 1 FROM team_members tm1
      WHERE tm1.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM team_members tm2
        WHERE tm2.user_id = progress_shares.user_id
        AND tm2.team_id = tm1.team_id
      )
    )
  )
);