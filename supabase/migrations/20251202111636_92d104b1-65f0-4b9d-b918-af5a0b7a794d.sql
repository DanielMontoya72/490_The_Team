-- Drop ALL existing policies on peer_support_group_members
DROP POLICY IF EXISTS "Users can view own memberships" ON public.peer_support_group_members;
DROP POLICY IF EXISTS "Users can view all group memberships" ON public.peer_support_group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.peer_support_group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.peer_support_group_members;

-- Create ultra-simple policies with NO cross-table references
CREATE POLICY "Allow authenticated users to view all memberships"
ON public.peer_support_group_members
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own membership"
ON public.peer_support_group_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own membership"
ON public.peer_support_group_members
FOR DELETE
USING (auth.uid() = user_id);