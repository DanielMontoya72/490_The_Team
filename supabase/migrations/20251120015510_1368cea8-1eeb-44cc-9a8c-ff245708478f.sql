-- Create mentor relationships and collaboration tables

-- Mentor invitations table
CREATE TABLE public.mentor_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mentor_email TEXT NOT NULL,
  mentor_name TEXT,
  invitation_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mentor relationships table (active mentorships)
CREATE TABLE public.mentor_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id UUID NOT NULL,
  mentor_id UUID NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'mentor',
  status TEXT NOT NULL DEFAULT 'active',
  permissions JSONB NOT NULL DEFAULT '{"view_profile": true, "view_jobs": true, "view_resumes": false, "view_interviews": false}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mentee_id, mentor_id)
);

-- Mentor feedback table
CREATE TABLE public.mentor_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.mentor_relationships(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL,
  mentee_id UUID NOT NULL,
  feedback_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  feedback_text TEXT NOT NULL,
  related_item_type TEXT,
  related_item_id UUID,
  priority TEXT DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  implemented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mentor progress reports table
CREATE TABLE public.mentor_progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.mentor_relationships(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL,
  report_period_start TIMESTAMPTZ NOT NULL,
  report_period_end TIMESTAMPTZ NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  viewed_by_mentor_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mentor communications table (secure messaging)
CREATE TABLE public.mentor_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.mentor_relationships(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message_text TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentor_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_progress_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_communications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mentor_invitations
CREATE POLICY "Users can create own invitations"
  ON public.mentor_invitations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own invitations"
  ON public.mentor_invitations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own invitations"
  ON public.mentor_invitations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Invited mentors can view their invitations"
  ON public.mentor_invitations FOR SELECT
  TO authenticated
  USING (mentor_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Invited mentors can accept invitations"
  ON public.mentor_invitations FOR UPDATE
  TO authenticated
  USING (mentor_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- RLS Policies for mentor_relationships
CREATE POLICY "Mentees can view own relationships"
  ON public.mentor_relationships FOR SELECT
  TO authenticated
  USING (mentee_id = auth.uid());

CREATE POLICY "Mentors can view their relationships"
  ON public.mentor_relationships FOR SELECT
  TO authenticated
  USING (mentor_id = auth.uid());

CREATE POLICY "Mentees can create relationships"
  ON public.mentor_relationships FOR INSERT
  TO authenticated
  WITH CHECK (mentee_id = auth.uid());

CREATE POLICY "Mentees can update own relationships"
  ON public.mentor_relationships FOR UPDATE
  TO authenticated
  USING (mentee_id = auth.uid());

CREATE POLICY "Mentees can delete own relationships"
  ON public.mentor_relationships FOR DELETE
  TO authenticated
  USING (mentee_id = auth.uid());

-- RLS Policies for mentor_feedback
CREATE POLICY "Mentors can create feedback"
  ON public.mentor_feedback FOR INSERT
  TO authenticated
  WITH CHECK (mentor_id = auth.uid());

CREATE POLICY "Mentees can view feedback for them"
  ON public.mentor_feedback FOR SELECT
  TO authenticated
  USING (mentee_id = auth.uid());

CREATE POLICY "Mentors can view feedback they created"
  ON public.mentor_feedback FOR SELECT
  TO authenticated
  USING (mentor_id = auth.uid());

CREATE POLICY "Mentees can update feedback status"
  ON public.mentor_feedback FOR UPDATE
  TO authenticated
  USING (mentee_id = auth.uid());

-- RLS Policies for mentor_progress_reports
CREATE POLICY "Mentees can view own reports"
  ON public.mentor_progress_reports FOR SELECT
  TO authenticated
  USING (mentee_id = auth.uid());

CREATE POLICY "Mentors can view mentee reports"
  ON public.mentor_progress_reports FOR SELECT
  TO authenticated
  USING (relationship_id IN (
    SELECT id FROM public.mentor_relationships
    WHERE mentor_id = auth.uid()
  ));

CREATE POLICY "System can create reports"
  ON public.mentor_progress_reports FOR INSERT
  TO authenticated
  WITH CHECK (mentee_id = auth.uid());

CREATE POLICY "Mentors can update report view time"
  ON public.mentor_progress_reports FOR UPDATE
  TO authenticated
  USING (relationship_id IN (
    SELECT id FROM public.mentor_relationships
    WHERE mentor_id = auth.uid()
  ));

-- RLS Policies for mentor_communications
CREATE POLICY "Users can view messages where they are sender or receiver"
  ON public.mentor_communications FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages in their relationships"
  ON public.mentor_communications FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    relationship_id IN (
      SELECT id FROM public.mentor_relationships
      WHERE mentee_id = auth.uid() OR mentor_id = auth.uid()
    )
  );

CREATE POLICY "Receivers can mark messages as read"
  ON public.mentor_communications FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_mentor_invitations_user_id ON public.mentor_invitations(user_id);
CREATE INDEX idx_mentor_invitations_mentor_email ON public.mentor_invitations(mentor_email);
CREATE INDEX idx_mentor_invitations_token ON public.mentor_invitations(invitation_token);
CREATE INDEX idx_mentor_relationships_mentee ON public.mentor_relationships(mentee_id);
CREATE INDEX idx_mentor_relationships_mentor ON public.mentor_relationships(mentor_id);
CREATE INDEX idx_mentor_feedback_relationship ON public.mentor_feedback(relationship_id);
CREATE INDEX idx_mentor_feedback_mentee ON public.mentor_feedback(mentee_id);
CREATE INDEX idx_mentor_progress_reports_relationship ON public.mentor_progress_reports(relationship_id);
CREATE INDEX idx_mentor_communications_relationship ON public.mentor_communications(relationship_id);
CREATE INDEX idx_mentor_communications_receiver ON public.mentor_communications(receiver_id);

-- Trigger for updated_at
CREATE TRIGGER update_mentor_invitations_updated_at
  BEFORE UPDATE ON public.mentor_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_mentor_relationships_updated_at
  BEFORE UPDATE ON public.mentor_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_mentor_feedback_updated_at
  BEFORE UPDATE ON public.mentor_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();