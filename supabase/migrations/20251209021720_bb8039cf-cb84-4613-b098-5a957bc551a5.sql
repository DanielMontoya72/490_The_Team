
-- Create table for external skill platform connections
CREATE TABLE public.external_skill_platforms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform_name TEXT NOT NULL, -- 'hackerrank', 'leetcode', 'codecademy'
  username TEXT NOT NULL,
  profile_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  profile_data JSONB DEFAULT '{}', -- Stores fetched profile info
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform_name)
);

-- Create table for external certifications/badges
CREATE TABLE public.external_certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform_id UUID REFERENCES public.external_skill_platforms(id) ON DELETE CASCADE,
  platform_name TEXT NOT NULL,
  certification_name TEXT NOT NULL,
  certification_type TEXT, -- 'badge', 'certificate', 'course', 'skill'
  score TEXT,
  ranking TEXT,
  completion_date DATE,
  expiration_date DATE,
  verification_url TEXT,
  badge_image_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'manual', 'expired'
  metadata JSONB DEFAULT '{}',
  show_on_profile BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_skill_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_certifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for external_skill_platforms
CREATE POLICY "Users can view their own platforms"
  ON public.external_skill_platforms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own platforms"
  ON public.external_skill_platforms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own platforms"
  ON public.external_skill_platforms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own platforms"
  ON public.external_skill_platforms FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for external_certifications
CREATE POLICY "Users can view their own certifications"
  ON public.external_certifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own certifications"
  ON public.external_certifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own certifications"
  ON public.external_certifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own certifications"
  ON public.external_certifications FOR DELETE
  USING (auth.uid() = user_id);

-- Public viewing policy for profile display
CREATE POLICY "Public can view visible certifications"
  ON public.external_certifications FOR SELECT
  USING (show_on_profile = true);

-- Indexes
CREATE INDEX idx_external_platforms_user_id ON public.external_skill_platforms(user_id);
CREATE INDEX idx_external_certifications_user_id ON public.external_certifications(user_id);
CREATE INDEX idx_external_certifications_platform_id ON public.external_certifications(platform_id);

-- Triggers
CREATE TRIGGER update_external_skill_platforms_updated_at
  BEFORE UPDATE ON public.external_skill_platforms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_external_certifications_updated_at
  BEFORE UPDATE ON public.external_certifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
