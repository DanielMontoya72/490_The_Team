-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view feedback for active shares" ON resume_feedback;
DROP POLICY IF EXISTS "Anyone can submit feedback if share allows comments" ON resume_feedback;
DROP POLICY IF EXISTS "Anyone can view resumes with active shares" ON resumes;
DROP POLICY IF EXISTS "Anyone can view active shares" ON resume_shares;

-- Allow anyone with a valid share link to view resume feedback
CREATE POLICY "Anyone can view feedback for active shares"
ON resume_feedback FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM resume_shares
    WHERE resume_shares.id = resume_feedback.share_id
    AND resume_shares.is_active = true
    AND (resume_shares.expires_at IS NULL OR resume_shares.expires_at > now())
  )
);

-- Allow anyone to submit feedback if comments are allowed on the share
CREATE POLICY "Anyone can submit feedback if share allows comments"
ON resume_feedback FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM resume_shares
    WHERE resume_shares.id = share_id
    AND resume_shares.is_active = true
    AND resume_shares.allow_comments = true
    AND (resume_shares.expires_at IS NULL OR resume_shares.expires_at > now())
  )
);

-- Allow anyone to view resumes that have active shares
CREATE POLICY "Anyone can view resumes with active shares"
ON resumes FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM resume_shares
    WHERE resume_shares.resume_id = resumes.id
    AND resume_shares.is_active = true
    AND (resume_shares.expires_at IS NULL OR resume_shares.expires_at > now())
  )
);

-- Allow anyone to view active resume shares
CREATE POLICY "Anyone can view active shares"
ON resume_shares FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND (expires_at IS NULL OR expires_at > now())
);