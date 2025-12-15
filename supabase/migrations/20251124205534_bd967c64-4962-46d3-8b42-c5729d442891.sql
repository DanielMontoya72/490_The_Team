-- Career Goals Tables
CREATE TABLE IF NOT EXISTS public.career_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_title TEXT NOT NULL,
  goal_description TEXT,
  goal_type TEXT NOT NULL DEFAULT 'short_term', -- short_term, long_term, milestone
  category TEXT, -- job_search, skill_development, networking, career_advancement
  target_date DATE,
  specific_metric TEXT, -- SMART goal specific metric
  measurable_criteria JSONB DEFAULT '[]'::jsonb,
  achievable_steps JSONB DEFAULT '[]'::jsonb,
  relevant_to TEXT, -- How it relates to career
  time_bound_milestones JSONB DEFAULT '[]'::jsonb,
  priority TEXT DEFAULT 'medium', -- low, medium, high, critical
  status TEXT NOT NULL DEFAULT 'active', -- active, in_progress, completed, cancelled, on_hold
  progress_percentage INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.goal_progress_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.career_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  update_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  progress_percentage INTEGER NOT NULL,
  milestone_completed TEXT,
  notes TEXT,
  reflection TEXT,
  challenges TEXT,
  next_steps TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.goal_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.career_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  achievement_title TEXT NOT NULL,
  achievement_description TEXT,
  achievement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  celebration_notes TEXT,
  impact_on_career TEXT,
  lessons_learned TEXT,
  related_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.goal_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL, -- success_pattern, adjustment_recommendation, motivation, accountability
  insight_title TEXT NOT NULL,
  insight_description TEXT NOT NULL,
  related_goals JSONB DEFAULT '[]'::jsonb, -- Array of goal IDs
  action_items JSONB DEFAULT '[]'::jsonb,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.career_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_progress_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for career_goals
CREATE POLICY "Users can view own career goals"
  ON public.career_goals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own career goals"
  ON public.career_goals FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own career goals"
  ON public.career_goals FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own career goals"
  ON public.career_goals FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for goal_progress_tracking
CREATE POLICY "Users can view own goal progress"
  ON public.goal_progress_tracking FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own goal progress"
  ON public.goal_progress_tracking FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own goal progress"
  ON public.goal_progress_tracking FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own goal progress"
  ON public.goal_progress_tracking FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for goal_achievements
CREATE POLICY "Users can view own goal achievements"
  ON public.goal_achievements FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own goal achievements"
  ON public.goal_achievements FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own goal achievements"
  ON public.goal_achievements FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own goal achievements"
  ON public.goal_achievements FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for goal_insights
CREATE POLICY "Users can view own goal insights"
  ON public.goal_insights FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own goal insights"
  ON public.goal_insights FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own goal insights"
  ON public.goal_insights FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own goal insights"
  ON public.goal_insights FOR DELETE
  USING (user_id = auth.uid());

-- Mentors can view mentee goals with permission
CREATE POLICY "Mentors can view mentee career goals with permission"
  ON public.career_goals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM mentor_relationships
    WHERE mentor_relationships.mentor_id = auth.uid()
    AND mentor_relationships.mentee_id = career_goals.user_id
    AND mentor_relationships.status = 'active'
    AND mentor_relationships.permissions ? 'view_goals'
    AND (mentor_relationships.permissions->>'view_goals')::boolean = true
  ));

CREATE POLICY "Mentors can view mentee goal progress with permission"
  ON public.goal_progress_tracking FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM mentor_relationships
    WHERE mentor_relationships.mentor_id = auth.uid()
    AND mentor_relationships.mentee_id = goal_progress_tracking.user_id
    AND mentor_relationships.status = 'active'
    AND mentor_relationships.permissions ? 'view_goals'
    AND (mentor_relationships.permissions->>'view_goals')::boolean = true
  ));

CREATE POLICY "Mentors can view mentee goal achievements with permission"
  ON public.goal_achievements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM mentor_relationships
    WHERE mentor_relationships.mentor_id = auth.uid()
    AND mentor_relationships.mentee_id = goal_achievements.user_id
    AND mentor_relationships.status = 'active'
    AND mentor_relationships.permissions ? 'view_goals'
    AND (mentor_relationships.permissions->>'view_goals')::boolean = true
  ));

-- Create indexes for performance
CREATE INDEX idx_career_goals_user_id ON public.career_goals(user_id);
CREATE INDEX idx_career_goals_status ON public.career_goals(status);
CREATE INDEX idx_career_goals_target_date ON public.career_goals(target_date);
CREATE INDEX idx_goal_progress_goal_id ON public.goal_progress_tracking(goal_id);
CREATE INDEX idx_goal_achievements_goal_id ON public.goal_achievements(goal_id);
CREATE INDEX idx_goal_insights_user_id ON public.goal_insights(user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_career_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER career_goals_updated_at
  BEFORE UPDATE ON public.career_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_career_goals_updated_at();