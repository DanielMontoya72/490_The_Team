-- Create function to add group creator as admin member
CREATE OR REPLACE FUNCTION add_group_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO peer_support_group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically add creator as admin
CREATE TRIGGER add_creator_as_admin_trigger
  AFTER INSERT ON peer_support_groups
  FOR EACH ROW
  EXECUTE FUNCTION add_group_creator_as_admin();