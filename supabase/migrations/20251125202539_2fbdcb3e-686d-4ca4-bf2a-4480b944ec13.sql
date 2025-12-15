-- UC-111: Progress Sharing and Accountability Tables

-- Privacy settings for progress sharing
CREATE TABLE IF NOT EXISTS public.progress_sharing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_goals BOOLEAN DEFAULT true,
  share_achievements BOOLEAN DEFAULT true,
  share_job_applications BOOLEAN DEFAULT false,
  share_interviews BOOLEAN DEFAULT false,
  share_resume_updates BOOLEAN DEFAULT false,
  share_technical_prep BOOLEAN DEFAULT false,
  allowed_viewers JSONB DEFAULT '[]'::jsonb, -- Array of user IDs who can view
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Accountability partner relationships
CREATE TABLE IF NOT EXISTS public.accountability_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'peer', -- peer, mentor, coach
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, inactive
  check_in_frequency TEXT DEFAULT 'weekly', -- daily, weekly, biweekly, monthly
  last_interaction_at TIMESTAMPTZ,
  engagement_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, partner_id)
);

-- Progress share history
CREATE TABLE IF NOT EXISTS public.progress_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL, -- report, achievement, milestone, update
  content JSONB NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'specific', -- specific, team, public
  view_count INTEGER DEFAULT 0,
  reaction_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Achievement celebrations
CREATE TABLE IF NOT EXISTS public.achievement_celebrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id UUID REFERENCES public.goal_achievements(id) ON DELETE CASCADE,
  progress_share_id UUID REFERENCES public.progress_shares(id) ON DELETE CASCADE,
  celebrated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  celebration_type TEXT NOT NULL, -- congrats, like, cheer, support
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Engagement tracking
CREATE TABLE IF NOT EXISTS public.accountability_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_relationship_id UUID NOT NULL REFERENCES public.accountability_partners(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- message, feedback, check_in, encouragement
  interaction_data JSONB,
  impact_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.progress_sharing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_celebrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_engagement ENABLE ROW LEVEL SECURITY;

-- RLS Policies for progress_sharing_settings
CREATE POLICY "Users can view own sharing settings"
  ON public.progress_sharing_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sharing settings"
  ON public.progress_sharing_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sharing settings"
  ON public.progress_sharing_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for accountability_partners
CREATE POLICY "Users can view own partnerships"
  ON public.accountability_partners FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can create partnerships"
  ON public.accountability_partners FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own partnerships"
  ON public.accountability_partners FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can delete own partnerships"
  ON public.accountability_partners FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for progress_shares
CREATE POLICY "Users can view own shares"
  ON public.progress_shares FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Shared users can view progress"
  ON public.progress_shares FOR SELECT
  USING (
    auth.uid() = shared_with_id OR
    (visibility = 'team' AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = progress_shares.team_id AND user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create shares"
  ON public.progress_shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shares"
  ON public.progress_shares FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for achievement_celebrations
CREATE POLICY "Users can view celebrations"
  ON public.achievement_celebrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.progress_shares ps
      WHERE ps.id = progress_share_id AND (ps.user_id = auth.uid() OR ps.shared_with_id = auth.uid())
    )
  );

CREATE POLICY "Users can create celebrations"
  ON public.achievement_celebrations FOR INSERT
  WITH CHECK (auth.uid() = celebrated_by);

-- RLS Policies for accountability_engagement
CREATE POLICY "Partners can view engagement"
  ON public.accountability_engagement FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.accountability_partners ap
      WHERE ap.id = partner_relationship_id AND (ap.user_id = auth.uid() OR ap.partner_id = auth.uid())
    )
  );

CREATE POLICY "Users can create engagement records"
  ON public.accountability_engagement FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accountability_partners ap
      WHERE ap.id = partner_relationship_id AND (ap.user_id = auth.uid() OR ap.partner_id = auth.uid())
    )
  );