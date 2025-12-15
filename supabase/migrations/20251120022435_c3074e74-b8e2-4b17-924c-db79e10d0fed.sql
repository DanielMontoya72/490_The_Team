-- Enable RLS on mentor_invitations table
ALTER TABLE mentor_invitations ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own invitations
CREATE POLICY "Users can view their own invitations"
ON mentor_invitations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow users to insert their own invitations
CREATE POLICY "Users can create invitations"
ON mentor_invitations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow users to update their own invitations
CREATE POLICY "Users can update their own invitations"
ON mentor_invitations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());