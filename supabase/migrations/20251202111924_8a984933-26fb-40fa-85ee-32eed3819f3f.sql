-- Drop ALL policies on peer_support_group_members to start fresh
DROP POLICY IF EXISTS "Allow authenticated users to view all memberships" ON public.peer_support_group_members;
DROP POLICY IF EXISTS "Members can view group membership" ON public.peer_support_group_members;
DROP POLICY IF EXISTS "Users can delete own membership" ON public.peer_support_group_members;
DROP POLICY IF EXISTS "Users can insert own membership" ON public.peer_support_group_members;
DROP POLICY IF EXISTS "Users can update own membership" ON public.peer_support_group_members;

-- Drop ALL policies on peer_support_groups to start fresh
DROP POLICY IF EXISTS "Group creators and admins can update" ON public.peer_support_groups;
DROP POLICY IF EXISTS "Public groups are viewable by everyone" ON public.peer_support_groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.peer_support_groups;
DROP POLICY IF EXISTS "Users can view active groups" ON public.peer_support_groups;

-- Create simple policies for peer_support_groups (NO reference to members table)
CREATE POLICY "Anyone can view active groups"
ON public.peer_support_groups
FOR SELECT
USING (is_active = true);

CREATE POLICY "Authenticated users can create groups"
ON public.peer_support_groups
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their groups"
ON public.peer_support_groups
FOR UPDATE
USING (auth.uid() = created_by);

-- Create simple policies for peer_support_group_members (NO reference to groups table)
CREATE POLICY "Authenticated can view memberships"
ON public.peer_support_group_members
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can join groups"
ON public.peer_support_group_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups"
ON public.peer_support_group_members
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own membership"
ON public.peer_support_group_members
FOR UPDATE
USING (auth.uid() = user_id);