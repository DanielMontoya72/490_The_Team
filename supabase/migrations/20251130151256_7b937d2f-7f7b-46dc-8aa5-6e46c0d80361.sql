-- Create a function that links mentor invitations to mentor relationships when a user registers
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
    '{"view_profile": false, "view_resume": false, "view_jobs": false, "view_interviews": false, "view_applications": false, "view_skills": false, "view_education": false, "view_employment": false, "view_certifications": false, "view_projects": false, "view_goals": false}'::jsonb as permissions
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

-- Create trigger on user_profiles for new profile creation
DROP TRIGGER IF EXISTS on_profile_created_link_mentor ON public.user_profiles;
CREATE TRIGGER on_profile_created_link_mentor
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.link_mentor_on_profile_create();

-- Also create a trigger for email updates (in case user updates their email)
DROP TRIGGER IF EXISTS on_profile_email_updated_link_mentor ON public.user_profiles;
CREATE TRIGGER on_profile_email_updated_link_mentor
  AFTER UPDATE OF email ON public.user_profiles
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.link_mentor_on_profile_create();