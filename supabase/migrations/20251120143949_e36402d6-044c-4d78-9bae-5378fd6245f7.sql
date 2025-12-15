-- Allow users to delete mentor relationships where they are the mentee
CREATE POLICY "Users can delete relationships where they are mentee"
ON public.mentor_relationships
FOR DELETE
TO authenticated
USING (mentee_id = auth.uid());

-- Allow users to delete mentor relationships where they are the mentor
CREATE POLICY "Users can delete relationships where they are mentor"
ON public.mentor_relationships
FOR DELETE
TO authenticated
USING (mentor_id = auth.uid());