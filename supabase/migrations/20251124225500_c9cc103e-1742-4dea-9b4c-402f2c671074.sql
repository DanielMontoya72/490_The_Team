-- Check and fix RLS policies for company_growth_tracking table

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own company growth data" ON public.company_growth_tracking;
DROP POLICY IF EXISTS "Users can insert their own company growth data" ON public.company_growth_tracking;
DROP POLICY IF EXISTS "Users can update their own company growth data" ON public.company_growth_tracking;
DROP POLICY IF EXISTS "Users can delete their own company growth data" ON public.company_growth_tracking;

-- Enable RLS
ALTER TABLE public.company_growth_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for company_growth_tracking
CREATE POLICY "Users can view their own company growth data"
  ON public.company_growth_tracking
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company growth data"
  ON public.company_growth_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company growth data"
  ON public.company_growth_tracking
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own company growth data"
  ON public.company_growth_tracking
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);