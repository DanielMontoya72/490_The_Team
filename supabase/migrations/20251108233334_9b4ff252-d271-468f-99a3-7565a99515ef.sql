-- Create app_role enum for team member roles
CREATE TYPE public.team_member_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_members table (many-to-many relationship)
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role team_member_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Add team_id to resume_templates for sharing
ALTER TABLE public.resume_templates 
ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check team membership
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_id = _team_id
      AND user_id = _user_id
  )
$$;

-- Create security definer function to check team role
CREATE OR REPLACE FUNCTION public.has_team_role(_user_id UUID, _team_id UUID, _role team_member_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_id = _team_id
      AND user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to check if user is team admin or owner
CREATE OR REPLACE FUNCTION public.is_team_admin_or_owner(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_id = _team_id
      AND user_id = _user_id
      AND role IN ('admin', 'owner')
  )
$$;

-- RLS Policies for teams table
CREATE POLICY "Users can view teams they are members of"
  ON public.teams FOR SELECT
  USING (public.is_team_member(auth.uid(), id));

CREATE POLICY "Users can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team admins and owners can update teams"
  ON public.teams FOR UPDATE
  USING (public.is_team_admin_or_owner(auth.uid(), id));

CREATE POLICY "Team owners can delete teams"
  ON public.teams FOR DELETE
  USING (public.has_team_role(auth.uid(), id, 'owner'));

-- RLS Policies for team_members table
CREATE POLICY "Users can view members of their teams"
  ON public.team_members FOR SELECT
  USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Team admins and owners can add members"
  ON public.team_members FOR INSERT
  WITH CHECK (public.is_team_admin_or_owner(auth.uid(), team_id));

CREATE POLICY "Team admins and owners can update member roles"
  ON public.team_members FOR UPDATE
  USING (public.is_team_admin_or_owner(auth.uid(), team_id));

CREATE POLICY "Team admins and owners can remove members"
  ON public.team_members FOR DELETE
  USING (public.is_team_admin_or_owner(auth.uid(), team_id));

CREATE POLICY "Users can remove themselves from teams"
  ON public.team_members FOR DELETE
  USING (auth.uid() = user_id);

-- Update resume_templates RLS to allow team access
DROP POLICY IF EXISTS "Users can view system templates and own templates" ON public.resume_templates;

CREATE POLICY "Users can view system templates, own templates, and team templates"
  ON public.resume_templates FOR SELECT
  USING (
    is_system_template = true 
    OR user_id = auth.uid()
    OR (team_id IS NOT NULL AND public.is_team_member(auth.uid(), team_id))
  );

-- Trigger to automatically add creator as team owner
CREATE OR REPLACE FUNCTION public.add_creator_as_team_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.add_creator_as_team_owner();

-- Add updated_at trigger for teams
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for better performance
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_resume_templates_team_id ON public.resume_templates(team_id);