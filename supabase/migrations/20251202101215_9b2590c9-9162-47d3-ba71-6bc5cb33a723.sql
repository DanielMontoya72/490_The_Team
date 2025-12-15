-- Drop existing policies that need updating
DROP POLICY IF EXISTS "Users can update own shares" ON public.progress_shares;
DROP POLICY IF EXISTS "Users can view celebrations" ON public.achievement_celebrations;

-- Allow users to update their own shares OR update reaction_count on team shares
CREATE POLICY "Users can update progress shares"
ON public.progress_shares
FOR UPDATE
USING (
  auth.uid() = user_id
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

-- Allow viewing celebrations on own shares, shared shares, and team shares
CREATE POLICY "Users can view celebrations"
ON public.achievement_celebrations
FOR SELECT
USING (
  auth.uid() = celebrated_by
  OR EXISTS (
    SELECT 1 FROM progress_shares ps
    WHERE ps.id = achievement_celebrations.progress_share_id
    AND (
      ps.user_id = auth.uid()
      OR ps.shared_with_id = auth.uid()
      OR (
        ps.visibility IN ('team', 'all')
        AND EXISTS (
          SELECT 1 FROM team_members tm1
          WHERE tm1.user_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM team_members tm2
            WHERE tm2.user_id = ps.user_id
            AND tm2.team_id = tm1.team_id
          )
        )
      )
    )
  )
);