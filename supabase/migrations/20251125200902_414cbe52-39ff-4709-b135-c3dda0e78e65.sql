-- Create team_communication table for team notes and messages
CREATE TABLE IF NOT EXISTS public.team_communication (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_communication ENABLE ROW LEVEL SECURITY;

-- Allow team members to view team communication
CREATE POLICY "Team members can view team communication"
  ON public.team_communication
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_communication.team_id
        AND team_members.user_id = auth.uid()
    )
  );

-- Allow team members to insert team communication
CREATE POLICY "Team members can create team communication"
  ON public.team_communication
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_communication.team_id
        AND team_members.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Allow creators to delete their own messages
CREATE POLICY "Users can delete their own team messages"
  ON public.team_communication
  FOR DELETE
  USING (created_by = auth.uid());

-- Create index for performance
CREATE INDEX idx_team_communication_team_id ON public.team_communication(team_id);
CREATE INDEX idx_team_communication_created_at ON public.team_communication(created_at DESC);