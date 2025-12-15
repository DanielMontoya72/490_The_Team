-- Update team roles to match UC-108 specification
-- Add new role values to the enum
ALTER TYPE public.team_member_role ADD VALUE IF NOT EXISTS 'mentor';
ALTER TYPE public.team_member_role ADD VALUE IF NOT EXISTS 'candidate';

-- Note: We keep 'owner' and 'admin' for backward compatibility
-- 'mentor' = career coach/mentor who can support multiple candidates
-- 'candidate' = person being coached/mentored
-- 'admin' = team administrator
-- 'owner' = team owner (creator)