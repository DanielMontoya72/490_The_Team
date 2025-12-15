-- Enable realtime for mentor_communications table
ALTER TABLE public.mentor_communications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_communications;

-- Enable realtime for mentor_relationships table  
ALTER TABLE public.mentor_relationships REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_relationships;

-- Enable realtime for mentor_invitations table
ALTER TABLE public.mentor_invitations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_invitations;