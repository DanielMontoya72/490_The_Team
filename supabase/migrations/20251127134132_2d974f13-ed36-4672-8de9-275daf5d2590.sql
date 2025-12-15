-- Create cover_letter_shares table
CREATE TABLE IF NOT EXISTS public.cover_letter_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cover_letter_id UUID NOT NULL REFERENCES public.application_materials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  privacy_level TEXT NOT NULL DEFAULT 'anyone_with_link' CHECK (privacy_level IN ('anyone_with_link', 'specific_people')),
  allow_comments BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create cover_letter_share_permissions table
CREATE TABLE IF NOT EXISTS public.cover_letter_share_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id UUID NOT NULL REFERENCES public.cover_letter_shares(id) ON DELETE CASCADE,
  reviewer_email TEXT NOT NULL,
  permission_level TEXT NOT NULL DEFAULT 'comment' CHECK (permission_level IN ('view', 'comment', 'edit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create cover_letter_feedback table
CREATE TABLE IF NOT EXISTS public.cover_letter_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cover_letter_id UUID NOT NULL REFERENCES public.application_materials(id) ON DELETE CASCADE,
  share_id UUID NOT NULL REFERENCES public.cover_letter_shares(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  section_reference TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cover_letter_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cover_letter_share_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cover_letter_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cover_letter_shares
CREATE POLICY "Users can manage their own cover letter shares"
  ON public.cover_letter_shares
  FOR ALL
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.application_materials
      WHERE application_materials.id = cover_letter_shares.cover_letter_id
      AND application_materials.user_id = auth.uid()
    )
  );

-- RLS Policies for cover_letter_share_permissions
CREATE POLICY "Users can manage permissions for their shares"
  ON public.cover_letter_share_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM cover_letter_shares
      JOIN application_materials ON application_materials.id = cover_letter_shares.cover_letter_id
      WHERE cover_letter_shares.id = cover_letter_share_permissions.share_id
      AND application_materials.user_id = auth.uid()
    )
  );

-- RLS Policies for cover_letter_feedback
CREATE POLICY "Anyone can view feedback for active shares"
  ON public.cover_letter_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cover_letter_shares
      WHERE cover_letter_shares.id = cover_letter_feedback.share_id
      AND cover_letter_shares.is_active = true
    ) OR
    EXISTS (
      SELECT 1 FROM application_materials
      WHERE application_materials.id = cover_letter_feedback.cover_letter_id
      AND application_materials.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can add feedback to active shares with comments enabled"
  ON public.cover_letter_feedback
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cover_letter_shares
      WHERE cover_letter_shares.id = cover_letter_feedback.share_id
      AND cover_letter_shares.is_active = true
      AND cover_letter_shares.allow_comments = true
      AND (cover_letter_shares.expires_at IS NULL OR cover_letter_shares.expires_at > now())
    )
  );

CREATE POLICY "Cover letter owners can update feedback status"
  ON public.cover_letter_feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM application_materials
      WHERE application_materials.id = cover_letter_feedback.cover_letter_id
      AND application_materials.user_id = auth.uid()
    )
  );

CREATE POLICY "Cover letter owners can delete feedback"
  ON public.cover_letter_feedback
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM application_materials
      WHERE application_materials.id = cover_letter_feedback.cover_letter_id
      AND application_materials.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_cover_letter_shares_token ON public.cover_letter_shares(share_token);
CREATE INDEX idx_cover_letter_shares_cover_letter_id ON public.cover_letter_shares(cover_letter_id);
CREATE INDEX idx_cover_letter_share_permissions_share_id ON public.cover_letter_share_permissions(share_id);
CREATE INDEX idx_cover_letter_feedback_cover_letter_id ON public.cover_letter_feedback(cover_letter_id);
CREATE INDEX idx_cover_letter_feedback_share_id ON public.cover_letter_feedback(share_id);

-- Add triggers for updated_at
CREATE TRIGGER update_cover_letter_shares_updated_at
  BEFORE UPDATE ON public.cover_letter_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_cover_letter_feedback_updated_at
  BEFORE UPDATE ON public.cover_letter_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for feedback
ALTER PUBLICATION supabase_realtime ADD TABLE public.cover_letter_feedback;