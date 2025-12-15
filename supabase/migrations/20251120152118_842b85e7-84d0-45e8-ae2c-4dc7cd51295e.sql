-- Add RLS policies to allow mentors to view mentee data based on permissions

-- Helper function to check if a user is a mentor of another user with specific permission
CREATE OR REPLACE FUNCTION public.is_mentor_with_permission(_mentor_id uuid, _mentee_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mentor_relationships
    WHERE mentor_id = _mentor_id
      AND mentee_id = _mentee_id
      AND status = 'active'
      AND permissions ? _permission
      AND (permissions ->> _permission)::boolean = true
  )
$$;

-- Jobs table: Allow mentors to view mentee jobs if permission granted
CREATE POLICY "Mentors can view mentee jobs with permission"
ON public.jobs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.mentor_relationships
    WHERE mentor_id = auth.uid()
      AND mentee_id = jobs.user_id
      AND status = 'active'
      AND permissions ? 'view_jobs'
      AND (permissions ->> 'view_jobs')::boolean = true
  )
);

-- Interviews table: Allow mentors to view mentee interviews if permission granted
CREATE POLICY "Mentors can view mentee interviews with permission"
ON public.interviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.mentor_relationships
    WHERE mentor_id = auth.uid()
      AND mentee_id = interviews.user_id
      AND status = 'active'
      AND permissions ? 'view_interviews'
      AND (permissions ->> 'view_interviews')::boolean = true
  )
);

-- Technical prep attempts table: Allow mentors to view mentee attempts if permission granted
CREATE POLICY "Mentors can view mentee technical prep with permission"
ON public.technical_prep_attempts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.mentor_relationships
    WHERE mentor_id = auth.uid()
      AND mentee_id = technical_prep_attempts.user_id
      AND status = 'active'
  )
);

-- Application materials: Allow mentors to view mentee materials if permission granted
CREATE POLICY "Mentors can view mentee application materials with permission"
ON public.application_materials
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.mentor_relationships
    WHERE mentor_id = auth.uid()
      AND mentee_id = application_materials.user_id
      AND status = 'active'
      AND permissions ? 'view_resume'
      AND (permissions ->> 'view_resume')::boolean = true
  )
);

-- Job match analyses: Allow mentors to view mentee analyses
CREATE POLICY "Mentors can view mentee job match analyses with permission"
ON public.job_match_analyses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.mentor_relationships
    WHERE mentor_id = auth.uid()
      AND mentee_id = job_match_analyses.user_id
      AND status = 'active'
      AND permissions ? 'view_jobs'
      AND (permissions ->> 'view_jobs')::boolean = true
  )
);