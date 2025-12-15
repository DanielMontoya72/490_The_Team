-- Add RLS policies for mentors to view mentee skills
CREATE POLICY "Mentors can view mentee skills with permission"
ON public.skills
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mentor_relationships mr
    WHERE mr.mentor_id = auth.uid()
    AND mr.mentee_id = skills.user_id
    AND mr.status = 'active'
    AND (
      (mr.permissions->>'view_skills')::boolean = true
      OR (mr.permissions->>'can_view_skills')::boolean = true
    )
  )
);

-- Add RLS policies for mentors to view mentee education
CREATE POLICY "Mentors can view mentee education with permission"
ON public.education
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mentor_relationships mr
    WHERE mr.mentor_id = auth.uid()
    AND mr.mentee_id = education.user_id
    AND mr.status = 'active'
    AND (
      (mr.permissions->>'view_education')::boolean = true
      OR (mr.permissions->>'can_view_education')::boolean = true
    )
  )
);

-- Add RLS policies for mentors to view mentee employment history
CREATE POLICY "Mentors can view mentee employment with permission"
ON public.employment_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mentor_relationships mr
    WHERE mr.mentor_id = auth.uid()
    AND mr.mentee_id = employment_history.user_id
    AND mr.status = 'active'
    AND (
      (mr.permissions->>'view_employment')::boolean = true
      OR (mr.permissions->>'can_view_employment')::boolean = true
    )
  )
);

-- Add RLS policies for mentors to view mentee certifications
CREATE POLICY "Mentors can view mentee certifications with permission"
ON public.certifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mentor_relationships mr
    WHERE mr.mentor_id = auth.uid()
    AND mr.mentee_id = certifications.user_id
    AND mr.status = 'active'
    AND (
      (mr.permissions->>'view_certifications')::boolean = true
      OR (mr.permissions->>'can_view_certifications')::boolean = true
    )
  )
);

-- Add RLS policies for mentors to view mentee projects
CREATE POLICY "Mentors can view mentee projects with permission"
ON public.projects
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mentor_relationships mr
    WHERE mr.mentor_id = auth.uid()
    AND mr.mentee_id = projects.user_id
    AND mr.status = 'active'
    AND (
      (mr.permissions->>'view_projects')::boolean = true
      OR (mr.permissions->>'can_view_projects')::boolean = true
    )
  )
);

-- Add RLS policies for mentors to view mentee user profiles
CREATE POLICY "Mentors can view mentee profile with permission"
ON public.user_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mentor_relationships mr
    WHERE mr.mentor_id = auth.uid()
    AND mr.mentee_id = user_profiles.user_id
    AND mr.status = 'active'
    AND (
      (mr.permissions->>'view_profile')::boolean = true
      OR (mr.permissions->>'can_view_profile')::boolean = true
    )
  )
);

-- Add RLS policies for mentors to view mentee career goals
CREATE POLICY "Mentors can view mentee goals with permission"
ON public.career_goals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mentor_relationships mr
    WHERE mr.mentor_id = auth.uid()
    AND mr.mentee_id = career_goals.user_id
    AND mr.status = 'active'
    AND (
      (mr.permissions->>'view_goals')::boolean = true
      OR (mr.permissions->>'can_view_goals')::boolean = true
    )
  )
);

-- Add RLS policies for mentors to view mentee application materials
CREATE POLICY "Mentors can view mentee materials with permission"
ON public.application_materials
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mentor_relationships mr
    WHERE mr.mentor_id = auth.uid()
    AND mr.mentee_id = application_materials.user_id
    AND mr.status = 'active'
    AND (
      (mr.permissions->>'view_resume')::boolean = true
      OR (mr.permissions->>'view_materials')::boolean = true
      OR (mr.permissions->>'can_view_resumes')::boolean = true
    )
  )
);