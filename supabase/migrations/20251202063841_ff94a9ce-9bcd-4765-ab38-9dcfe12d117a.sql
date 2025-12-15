-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Anyone can view resumes with active shares" ON resumes;

-- The shared resume viewing will work through the existing owner policies
-- when the SharedResume component queries the resume directly