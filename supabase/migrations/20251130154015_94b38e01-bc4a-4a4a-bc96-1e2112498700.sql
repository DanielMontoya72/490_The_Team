-- Add RLS policy for mentors to view mentee interviews (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'interviews' 
    AND policyname = 'Mentors can view mentee interviews with permission'
  ) THEN
    CREATE POLICY "Mentors can view mentee interviews with permission"
    ON public.interviews
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.mentor_relationships mr
        WHERE mr.mentor_id = auth.uid()
        AND mr.mentee_id = interviews.user_id
        AND mr.status = 'active'
        AND (
          (mr.permissions->>'view_interviews')::boolean = true
          OR (mr.permissions->>'can_view_interviews')::boolean = true
        )
      )
    );
  END IF;
END $$;

-- Add RLS policy for mentors to view mentee technical_prep_attempts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'technical_prep_attempts' 
    AND policyname = 'Mentors can view mentee tech prep with permission'
  ) THEN
    CREATE POLICY "Mentors can view mentee tech prep with permission"
    ON public.technical_prep_attempts
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.mentor_relationships mr
        WHERE mr.mentor_id = auth.uid()
        AND mr.mentee_id = technical_prep_attempts.user_id
        AND mr.status = 'active'
      )
    );
  END IF;
END $$;