-- First, drop the constraint entirely
ALTER TABLE application_automation_rules 
DROP CONSTRAINT IF EXISTS application_automation_rules_rule_type_check;

-- Update any existing invalid rule_type values to 'package_generation'
UPDATE application_automation_rules 
SET rule_type = 'package_generation' 
WHERE rule_type NOT IN ('package_generation', 'status_update', 'follow_up', 'question_response');

-- Now add the constraint with all valid types
ALTER TABLE application_automation_rules 
ADD CONSTRAINT application_automation_rules_rule_type_check 
CHECK (rule_type IN ('package_generation', 'status_update', 'follow_up', 'question_response'));