-- Fix mentor_relationships RLS policy to allow mentors to create relationships when accepting invitations
DROP POLICY IF EXISTS "Mentees can create relationships" ON public.mentor_relationships;

-- Allow both mentees and mentors to create relationships
CREATE POLICY "Users can create relationships where they are mentee or mentor"
ON public.mentor_relationships
FOR INSERT
TO authenticated
WITH CHECK (
  mentee_id = auth.uid() OR mentor_id = auth.uid()
);