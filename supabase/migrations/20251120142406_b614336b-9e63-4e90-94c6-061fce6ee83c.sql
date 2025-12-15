-- Allow users to delete invitations they sent
CREATE POLICY "Users can delete invitations they sent"
ON public.mentor_invitations
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Allow invited mentors to delete invitations they received
CREATE POLICY "Invited mentors can delete invitations they received"
ON public.mentor_invitations
FOR DELETE
TO authenticated
USING (mentor_email = auth.email());