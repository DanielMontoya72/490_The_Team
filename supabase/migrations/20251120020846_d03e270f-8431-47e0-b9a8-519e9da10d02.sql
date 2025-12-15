-- Add RLS policies for skill_gap_analyses table
-- Allow users to view their own skill gap analyses
CREATE POLICY "Users can view their own skill gap analyses"
ON skill_gap_analyses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to insert their own skill gap analyses
CREATE POLICY "Users can insert their own skill gap analyses"
ON skill_gap_analyses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own skill gap analyses
CREATE POLICY "Users can update their own skill gap analyses"
ON skill_gap_analyses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own skill gap analyses
CREATE POLICY "Users can delete their own skill gap analyses"
ON skill_gap_analyses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);