-- Drop the problematic policy
DROP POLICY IF EXISTS "Invited mentors can view their invitations" ON mentor_invitations;
DROP POLICY IF EXISTS "Invited mentors can accept invitations" ON mentor_invitations;

-- Recreate with correct auth.email() function
CREATE POLICY "Invited mentors can view their invitations"
ON mentor_invitations
FOR SELECT
TO authenticated
USING (mentor_email = auth.email());

CREATE POLICY "Invited mentors can accept invitations"
ON mentor_invitations
FOR UPDATE
TO authenticated
USING (mentor_email = auth.email());