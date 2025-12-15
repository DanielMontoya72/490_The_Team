-- Create a security definer function to check if a resume has an active share
CREATE OR REPLACE FUNCTION public.resume_has_active_share(_resume_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM resume_shares
    WHERE resume_id = _resume_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Now create a policy using the function (this avoids infinite recursion)
CREATE POLICY "Anyone can view resumes with active shares"
ON resumes FOR SELECT
TO anon, authenticated
USING (public.resume_has_active_share(id));