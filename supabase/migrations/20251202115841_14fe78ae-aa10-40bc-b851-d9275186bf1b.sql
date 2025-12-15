-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Users can view their own admin records" ON public.organization_admins;
DROP POLICY IF EXISTS "Admins can view co-admins" ON public.organization_admins;
DROP POLICY IF EXISTS "Users can insert their own admin record" ON public.organization_admins;
DROP POLICY IF EXISTS "Super admins can update organization admins" ON public.organization_admins;
DROP POLICY IF EXISTS "Super admins can delete organization admins" ON public.organization_admins;

-- Create a security definer function to get user's organization IDs
CREATE OR REPLACE FUNCTION public.get_user_organization_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_admins WHERE user_id = _user_id
$$;

-- Create a security definer function to check if user is super admin of an org
CREATE OR REPLACE FUNCTION public.is_org_super_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_admins
    WHERE user_id = _user_id 
      AND organization_id = _org_id 
      AND admin_role = 'super_admin'
  )
$$;

-- Simple policy: users can view their own admin records
CREATE POLICY "Users view own admin records"
ON public.organization_admins FOR SELECT
USING (auth.uid() = user_id);

-- Users can view co-admins using the security definer function
CREATE POLICY "Admins view co-admins"
ON public.organization_admins FOR SELECT
USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

-- Users can insert themselves as admin
CREATE POLICY "Users insert own admin record"
ON public.organization_admins FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Super admins can update admins in their orgs
CREATE POLICY "Super admins update admins"
ON public.organization_admins FOR UPDATE
USING (public.is_org_super_admin(auth.uid(), organization_id));

-- Super admins can delete admins in their orgs
CREATE POLICY "Super admins delete admins"
ON public.organization_admins FOR DELETE
USING (public.is_org_super_admin(auth.uid(), organization_id));