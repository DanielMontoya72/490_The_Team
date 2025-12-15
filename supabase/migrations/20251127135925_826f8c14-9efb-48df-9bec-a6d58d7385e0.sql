-- Create peer support groups table
CREATE TABLE peer_support_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  group_name TEXT NOT NULL,
  group_description TEXT,
  group_type TEXT NOT NULL, -- 'industry', 'role', 'location', 'experience_level'
  industry TEXT,
  role_focus TEXT,
  location TEXT,
  experience_level TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  member_count INTEGER NOT NULL DEFAULT 0,
  privacy_level TEXT NOT NULL DEFAULT 'public', -- 'public', 'private', 'invite_only'
  group_rules TEXT,
  tags TEXT[] DEFAULT '{}',
  max_members INTEGER DEFAULT 100
);

-- Create peer support group members table
CREATE TABLE peer_support_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES peer_support_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'moderator', 'member'
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  notification_preferences JSONB DEFAULT '{"discussions": true, "challenges": true, "sessions": true}',
  participation_score INTEGER DEFAULT 0,
  UNIQUE(group_id, user_id)
);

-- Create peer support discussions table
CREATE TABLE peer_support_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES peer_support_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  post_type TEXT NOT NULL DEFAULT 'discussion', -- 'discussion', 'question', 'insight', 'strategy'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false
);

-- Create discussion comments table
CREATE TABLE peer_discussion_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES peer_support_discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  content TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  likes_count INTEGER DEFAULT 0
);

-- Create peer challenges table
CREATE TABLE peer_support_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES peer_support_groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  challenge_name TEXT NOT NULL,
  challenge_description TEXT NOT NULL,
  challenge_type TEXT NOT NULL, -- 'applications', 'networking', 'skills', 'interviews'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_metric TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  participants_count INTEGER DEFAULT 0
);

-- Create challenge participants table
CREATE TABLE peer_challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES peer_support_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(challenge_id, user_id)
);

-- Create peer success stories table
CREATE TABLE peer_success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES peer_support_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  story_title TEXT NOT NULL,
  story_content TEXT NOT NULL,
  success_type TEXT NOT NULL, -- 'job_offer', 'promotion', 'career_change', 'skill_mastery', 'networking_win'
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  company_name TEXT,
  role_title TEXT,
  timeframe_weeks INTEGER,
  key_learnings TEXT,
  advice_for_others TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0
);

-- Create peer referrals table
CREATE TABLE peer_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES peer_support_groups(id) ON DELETE CASCADE,
  posted_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  role_description TEXT,
  location TEXT,
  is_remote BOOLEAN DEFAULT false,
  salary_range TEXT,
  application_url TEXT,
  referral_contact TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  interested_count INTEGER DEFAULT 0
);

-- Create group sessions table
CREATE TABLE peer_group_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES peer_support_groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_type TEXT NOT NULL, -- 'coaching', 'webinar', 'workshop', 'q_and_a'
  session_title TEXT NOT NULL,
  session_description TEXT NOT NULL,
  facilitator_name TEXT,
  facilitator_bio TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  meeting_link TEXT,
  max_participants INTEGER,
  registered_count INTEGER DEFAULT 0,
  is_recorded BOOLEAN DEFAULT false,
  recording_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' -- 'scheduled', 'in_progress', 'completed', 'cancelled'
);

-- Create session registrations table
CREATE TABLE peer_session_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES peer_group_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attended BOOLEAN DEFAULT false,
  UNIQUE(session_id, user_id)
);

-- Create peer networking metrics table
CREATE TABLE peer_networking_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  groups_joined INTEGER DEFAULT 0,
  discussions_posted INTEGER DEFAULT 0,
  comments_made INTEGER DEFAULT 0,
  challenges_joined INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  sessions_attended INTEGER DEFAULT 0,
  referrals_received INTEGER DEFAULT 0,
  connections_made INTEGER DEFAULT 0,
  support_value_rating INTEGER, -- 1-5 scale
  UNIQUE(user_id, metric_date)
);

-- Enable RLS
ALTER TABLE peer_support_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_support_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_support_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_support_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_success_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_group_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_session_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_networking_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for peer_support_groups
CREATE POLICY "Public groups are viewable by everyone" ON peer_support_groups
  FOR SELECT USING (privacy_level = 'public' OR id IN (
    SELECT group_id FROM peer_support_group_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create groups" ON peer_support_groups
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Group creators and admins can update" ON peer_support_groups
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    id IN (SELECT group_id FROM peer_support_group_members WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for peer_support_group_members
CREATE POLICY "Members can view group membership" ON peer_support_group_members
  FOR SELECT USING (
    group_id IN (SELECT id FROM peer_support_groups WHERE privacy_level = 'public') OR
    group_id IN (SELECT group_id FROM peer_support_group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can join groups" ON peer_support_group_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own membership" ON peer_support_group_members
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can leave groups" ON peer_support_group_members
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for peer_support_discussions
CREATE POLICY "Members can view group discussions" ON peer_support_discussions
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM peer_support_group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can create discussions" ON peer_support_discussions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    group_id IN (SELECT group_id FROM peer_support_group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own discussions" ON peer_support_discussions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own discussions" ON peer_support_discussions
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for peer_discussion_comments
CREATE POLICY "Members can view comments" ON peer_discussion_comments
  FOR SELECT USING (
    discussion_id IN (
      SELECT id FROM peer_support_discussions WHERE group_id IN (
        SELECT group_id FROM peer_support_group_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can create comments" ON peer_discussion_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments" ON peer_discussion_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON peer_discussion_comments
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for peer_support_challenges
CREATE POLICY "Members can view group challenges" ON peer_support_challenges
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM peer_support_group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can create challenges" ON peer_support_challenges
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    group_id IN (SELECT group_id FROM peer_support_group_members WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- RLS Policies for peer_challenge_participants
CREATE POLICY "Participants can view challenge participation" ON peer_challenge_participants
  FOR SELECT USING (
    challenge_id IN (
      SELECT id FROM peer_support_challenges WHERE group_id IN (
        SELECT group_id FROM peer_support_group_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can join challenges" ON peer_challenge_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own participation" ON peer_challenge_participants
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for peer_success_stories
CREATE POLICY "Members can view success stories" ON peer_success_stories
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM peer_support_group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can create success stories" ON peer_success_stories
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    group_id IN (SELECT group_id FROM peer_support_group_members WHERE user_id = auth.uid())
  );

-- RLS Policies for peer_referrals
CREATE POLICY "Members can view referrals" ON peer_referrals
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM peer_support_group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can create referrals" ON peer_referrals
  FOR INSERT WITH CHECK (
    posted_by = auth.uid() AND
    group_id IN (SELECT group_id FROM peer_support_group_members WHERE user_id = auth.uid())
  );

-- RLS Policies for peer_group_sessions
CREATE POLICY "Members can view sessions" ON peer_group_sessions
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM peer_support_group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can create sessions" ON peer_group_sessions
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    group_id IN (SELECT group_id FROM peer_support_group_members WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- RLS Policies for peer_session_registrations
CREATE POLICY "Users can view session registrations" ON peer_session_registrations
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM peer_group_sessions WHERE group_id IN (
        SELECT group_id FROM peer_support_group_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can register for sessions" ON peer_session_registrations
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for peer_networking_metrics
CREATE POLICY "Users can view own metrics" ON peer_networking_metrics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own metrics" ON peer_networking_metrics
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own metrics" ON peer_networking_metrics
  FOR UPDATE USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_peer_support_groups_type ON peer_support_groups(group_type);
CREATE INDEX idx_peer_support_groups_active ON peer_support_groups(is_active);
CREATE INDEX idx_peer_support_group_members_user ON peer_support_group_members(user_id);
CREATE INDEX idx_peer_support_group_members_group ON peer_support_group_members(group_id);
CREATE INDEX idx_peer_support_discussions_group ON peer_support_discussions(group_id);
CREATE INDEX idx_peer_discussion_comments_discussion ON peer_discussion_comments(discussion_id);
CREATE INDEX idx_peer_support_challenges_group ON peer_support_challenges(group_id);
CREATE INDEX idx_peer_challenge_participants_challenge ON peer_challenge_participants(challenge_id);
CREATE INDEX idx_peer_success_stories_group ON peer_success_stories(group_id);
CREATE INDEX idx_peer_referrals_group ON peer_referrals(group_id);
CREATE INDEX idx_peer_group_sessions_group ON peer_group_sessions(group_id);
CREATE INDEX idx_peer_session_registrations_session ON peer_session_registrations(session_id);
CREATE INDEX idx_peer_networking_metrics_user ON peer_networking_metrics(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_peer_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_peer_support_groups_updated_at
  BEFORE UPDATE ON peer_support_groups
  FOR EACH ROW EXECUTE FUNCTION update_peer_updated_at_column();

CREATE TRIGGER update_peer_support_discussions_updated_at
  BEFORE UPDATE ON peer_support_discussions
  FOR EACH ROW EXECUTE FUNCTION update_peer_updated_at_column();

CREATE TRIGGER update_peer_support_challenges_updated_at
  BEFORE UPDATE ON peer_support_challenges
  FOR EACH ROW EXECUTE FUNCTION update_peer_updated_at_column();

CREATE TRIGGER update_peer_referrals_updated_at
  BEFORE UPDATE ON peer_referrals
  FOR EACH ROW EXECUTE FUNCTION update_peer_updated_at_column();

CREATE TRIGGER update_peer_group_sessions_updated_at
  BEFORE UPDATE ON peer_group_sessions
  FOR EACH ROW EXECUTE FUNCTION update_peer_updated_at_column();

-- Enable realtime for discussions
ALTER PUBLICATION supabase_realtime ADD TABLE peer_support_discussions;
ALTER PUBLICATION supabase_realtime ADD TABLE peer_discussion_comments;