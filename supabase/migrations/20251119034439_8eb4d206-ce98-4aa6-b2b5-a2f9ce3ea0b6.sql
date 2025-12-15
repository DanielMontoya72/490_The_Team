-- Drop existing RLS policies for skills table
DROP POLICY IF EXISTS "Users can view own skills" ON public.skills;
DROP POLICY IF EXISTS "Users can insert own skills" ON public.skills;
DROP POLICY IF EXISTS "Users can update own skills" ON public.skills;
DROP POLICY IF EXISTS "Users can delete own skills" ON public.skills;

-- Create simplified RLS policies for skills table
CREATE POLICY "Users can view own skills"
  ON public.skills
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own skills"
  ON public.skills
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own skills"
  ON public.skills
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own skills"
  ON public.skills
  FOR DELETE
  USING (user_id = auth.uid());