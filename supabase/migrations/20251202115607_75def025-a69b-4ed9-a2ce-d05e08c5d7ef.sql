-- Drop the problematic policies on organization_admins
DROP POLICY IF EXISTS "Admins can view their organization admins" ON public.organization_admins;
DROP POLICY IF EXISTS "Super admins can manage organization admins" ON public.organization_admins;

-- Create new non-recursive policies for organization_admins
-- Users can view organization_admins rows where they are the admin
CREATE POLICY "Users can view their own admin records"
ON public.organization_admins FOR SELECT
USING (auth.uid() = user_id);

-- Users can view other admins in organizations they belong to
CREATE POLICY "Admins can view co-admins"
ON public.organization_admins FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_admins WHERE user_id = auth.uid()
  )
);

-- Users can insert themselves as admin (for org creation flow)
CREATE POLICY "Users can insert their own admin record"
ON public.organization_admins FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Super admins can update/delete in their orgs
CREATE POLICY "Super admins can update organization admins"
ON public.organization_admins FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_admins 
    WHERE user_id = auth.uid() AND admin_role = 'super_admin'
  )
);

CREATE POLICY "Super admins can delete organization admins"
ON public.organization_admins FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_admins 
    WHERE user_id = auth.uid() AND admin_role = 'super_admin'
  )
);