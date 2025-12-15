-- Drop ALL existing policies on organization_admins
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'organization_admins' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.organization_admins', pol.policyname);
    END LOOP;
END $$;

-- Create only simple, non-recursive policies
-- SELECT: Users can only see their own admin records
CREATE POLICY "org_admins_select_own"
ON public.organization_admins FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Users can insert themselves as admin
CREATE POLICY "org_admins_insert_own"
ON public.organization_admins FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own records
CREATE POLICY "org_admins_update_own"
ON public.organization_admins FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE: Users can delete their own records  
CREATE POLICY "org_admins_delete_own"
ON public.organization_admins FOR DELETE
USING (auth.uid() = user_id);