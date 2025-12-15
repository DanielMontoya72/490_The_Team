-- Drop existing package_status check constraint if it exists
ALTER TABLE application_packages 
DROP CONSTRAINT IF EXISTS application_packages_package_status_check;

-- Add updated constraint with all valid package status values
ALTER TABLE application_packages 
ADD CONSTRAINT application_packages_package_status_check 
CHECK (package_status IN ('draft', 'generating', 'ready', 'sent', 'scheduled', 'error'));