-- Allow public access to cover letter shares by token
CREATE POLICY "Anyone can view active cover letter shares by token"
ON public.cover_letter_shares
FOR SELECT
USING (is_active = true);

-- Security definer function to check if a cover letter has an active share
CREATE OR REPLACE FUNCTION public.cover_letter_has_active_share(
  _cover_letter_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cover_letter_shares
    WHERE cover_letter_id = _cover_letter_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Allow public access to application materials (cover letters) that have active shares
CREATE POLICY "Anyone can view cover letters with active shares"
ON public.application_materials
FOR SELECT
USING (
  material_type = 'cover_letter' 
  AND public.cover_letter_has_active_share(id)
);

-- Security definer function to check if comments are allowed on a share
CREATE OR REPLACE FUNCTION public.cover_letter_share_allows_comments(
  _share_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cover_letter_shares
    WHERE id = _share_id
      AND is_active = true
      AND allow_comments = true
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Allow anyone to view feedback on shares
CREATE POLICY "Anyone can view feedback on shared cover letters"
ON public.cover_letter_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.cover_letter_shares
    WHERE id = share_id
      AND is_active = true
  )
);

-- Allow anyone to insert feedback if comments are allowed
CREATE POLICY "Anyone can add feedback to shared cover letters with comments enabled"
ON public.cover_letter_feedback
FOR INSERT
WITH CHECK (
  public.cover_letter_share_allows_comments(share_id)
);

-- Allow feedback authors and owners to update feedback status
CREATE POLICY "Feedback management for shared cover letters"
ON public.cover_letter_feedback
FOR UPDATE
USING (
  -- Either the cover letter owner
  EXISTS (
    SELECT 1
    FROM public.cover_letter_shares cs
    JOIN public.application_materials am ON cs.cover_letter_id = am.id
    WHERE cs.id = share_id
      AND am.user_id = auth.uid()
  )
  -- Or updating only your own feedback
  OR (reviewer_email = auth.jwt()->>'email')
);