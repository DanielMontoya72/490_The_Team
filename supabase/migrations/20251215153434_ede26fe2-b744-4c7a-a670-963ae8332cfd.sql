-- Document the existing dashboard_general_todos table
-- This is a documentation-only migration - table already exists

-- Create table only if it doesn't exist (should already exist)
CREATE TABLE IF NOT EXISTS public.dashboard_general_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard_general_todos ENABLE ROW LEVEL SECURITY;

-- Create policy if not exists (uses DO block for conditional creation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dashboard_general_todos' 
    AND policyname = 'Users can manage their own general todos'
  ) THEN
    CREATE POLICY "Users can manage their own general todos"
      ON public.dashboard_general_todos FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Add index for user lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_dashboard_general_todos_user_id 
  ON public.dashboard_general_todos(user_id);

COMMENT ON TABLE public.dashboard_general_todos IS 'Stores general todos for the dashboard. Users can only access their own todos.';