-- Add overall_score column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS overall_score INTEGER DEFAULT 0;

-- Create function to update user overall score from competitive analysis
CREATE OR REPLACE FUNCTION update_user_overall_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user_profiles overall_score with the latest competitive analysis score
  UPDATE public.user_profiles
  SET overall_score = COALESCE(
    (NEW.competitive_positioning->>'overall_score')::INTEGER,
    0
  )
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update user overall score when competitive analysis is inserted or updated
DROP TRIGGER IF EXISTS trigger_update_user_overall_score ON public.competitive_analysis;
CREATE TRIGGER trigger_update_user_overall_score
  AFTER INSERT OR UPDATE ON public.competitive_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_user_overall_score();

-- Backfill existing competitive analysis data to user profiles
UPDATE public.user_profiles up
SET overall_score = COALESCE(
  (
    SELECT (ca.competitive_positioning->>'overall_score')::INTEGER
    FROM public.competitive_analysis ca
    WHERE ca.user_id = up.user_id
    ORDER BY ca.created_at DESC
    LIMIT 1
  ),
  0
)
WHERE EXISTS (
  SELECT 1 FROM public.competitive_analysis ca
  WHERE ca.user_id = up.user_id
);
