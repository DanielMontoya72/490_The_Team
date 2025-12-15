-- Drop the recursive policy
DROP POLICY IF EXISTS "Admins view co-admins" ON public.organization_admins;

-- The remaining policies are sufficient:
-- "Users view own admin records" - users see their own records
-- "Users insert own admin record" - users can insert themselves
-- "Super admins update admins" - uses security definer function
-- "Super admins delete admins" - uses security definer function