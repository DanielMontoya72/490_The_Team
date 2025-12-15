-- Allow authenticated users to view other users' basic profile information
-- This is needed for team invitations and collaboration features
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;

CREATE POLICY "Users can view all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);

-- Keep the other policies restrictive (only own profile)
-- Users can still only update/delete their own profile