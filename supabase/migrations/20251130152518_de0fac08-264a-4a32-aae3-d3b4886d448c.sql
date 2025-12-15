-- Update the trigger function to set reasonable default permissions (true instead of false)
CREATE OR REPLACE FUNCTION public.link_mentor_on_profile_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check for any accepted mentor invitations matching this user's email
  INSERT INTO public.mentor_relationships (mentee_id, mentor_id, status, relationship_type, permissions)
  SELECT 
    mi.user_id as mentee_id,
    NEW.user_id as mentor_id,
    'active' as status,
    'mentor' as relationship_type,
    '{"view_profile": true, "view_resume": true, "view_jobs": true, "view_interviews": true, "view_applications": true, "view_skills": true, "view_education": true, "view_employment": true, "view_certifications": true, "view_projects": true, "view_goals": true, "can_view_profile": true, "can_view_jobs": true, "can_view_resumes": true, "can_provide_feedback": true}'::jsonb as permissions
  FROM public.mentor_invitations mi
  WHERE mi.mentor_email = NEW.email
    AND mi.status = 'accepted'
    AND NOT EXISTS (
      -- Don't create duplicate relationships
      SELECT 1 FROM public.mentor_relationships mr
      WHERE mr.mentee_id = mi.user_id AND mr.mentor_id = NEW.user_id
    );

  RETURN NEW;
END;
$$;

-- Also update existing relationships that have all false permissions
UPDATE public.mentor_relationships
SET permissions = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    jsonb_set(
                      COALESCE(permissions, '{}'::jsonb),
                      '{view_profile}', 'true'::jsonb
                    ),
                    '{view_resume}', 'true'::jsonb
                  ),
                  '{view_jobs}', 'true'::jsonb
                ),
                '{view_interviews}', 'true'::jsonb
              ),
              '{view_skills}', 'true'::jsonb
            ),
            '{view_education}', 'true'::jsonb
          ),
          '{view_employment}', 'true'::jsonb
        ),
        '{view_certifications}', 'true'::jsonb
      ),
      '{view_projects}', 'true'::jsonb
    ),
    '{view_goals}', 'true'::jsonb
  ),
  '{view_materials}', 'true'::jsonb
)
WHERE (permissions->>'view_profile')::boolean = false 
   OR (permissions->>'view_jobs')::boolean = false;