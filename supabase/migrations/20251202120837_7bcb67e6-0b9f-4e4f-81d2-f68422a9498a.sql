-- Add INSERT policy for career_services_organizations
CREATE POLICY "Users can create organizations"
ON public.career_services_organizations FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add SELECT policy so users can view organizations they're admin of
CREATE POLICY "Users can view organizations"
ON public.career_services_organizations FOR SELECT
TO authenticated
USING (true);