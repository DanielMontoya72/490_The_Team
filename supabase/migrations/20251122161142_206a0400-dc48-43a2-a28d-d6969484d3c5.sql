-- Remove foreign key constraint that only allows professional_contacts
ALTER TABLE relationship_health_metrics 
DROP CONSTRAINT IF EXISTS relationship_health_metrics_contact_id_fkey;

-- Add a comment to document that contact_id can reference either professional_contacts or contact_suggestions
COMMENT ON COLUMN relationship_health_metrics.contact_id IS 'References either professional_contacts.id or contact_suggestions.id';