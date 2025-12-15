
-- Add unique constraint for upsert to work properly
ALTER TABLE public.job_competitive_analysis 
ADD CONSTRAINT job_competitive_analysis_job_user_unique 
UNIQUE (job_id, user_id);
