-- Drop existing problematic policies on peer_support_group_members
DROP POLICY IF EXISTS "Users can view members of groups they belong to" ON public.peer_support_group_members;
DROP POLICY IF EXISTS "Users can view group members" ON public.peer_support_group_members;
DROP POLICY IF EXISTS "Members can view other members in their groups" ON public.peer_support_group_members;

-- Create simple, non-recursive policies
-- Allow users to view their own memberships
CREATE POLICY "Users can view own memberships"
ON public.peer_support_group_members
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to view memberships in any active group (public groups are browseable)
CREATE POLICY "Users can view all group memberships"
ON public.peer_support_group_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.peer_support_groups g
    WHERE g.id = group_id AND g.is_active = true
  )
);

-- Allow users to insert their own memberships
DROP POLICY IF EXISTS "Users can join groups" ON public.peer_support_group_members;
CREATE POLICY "Users can join groups"
ON public.peer_support_group_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own memberships
DROP POLICY IF EXISTS "Users can leave groups" ON public.peer_support_group_members;
CREATE POLICY "Users can leave groups"
ON public.peer_support_group_members
FOR DELETE
USING (auth.uid() = user_id);

-- Fix peer_support_groups policies to avoid recursion
DROP POLICY IF EXISTS "Users can view active groups" ON public.peer_support_groups;
CREATE POLICY "Users can view active groups"
ON public.peer_support_groups
FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Users can create groups" ON public.peer_support_groups;
CREATE POLICY "Users can create groups"
ON public.peer_support_groups
FOR INSERT
WITH CHECK (auth.uid() = created_by);