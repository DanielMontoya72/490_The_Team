-- Populate initial status history for existing jobs
-- This creates a baseline record for each job showing when it entered its current status
INSERT INTO public.job_status_history (job_id, user_id, from_status, to_status, changed_at)
SELECT 
  id as job_id,
  user_id,
  NULL as from_status,
  status as to_status,
  created_at as changed_at
FROM public.jobs
WHERE NOT EXISTS (
  SELECT 1 FROM public.job_status_history 
  WHERE job_status_history.job_id = jobs.id
);
