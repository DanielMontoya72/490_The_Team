-- Create industry news suggestions table
CREATE TABLE IF NOT EXISTS public.industry_news_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id UUID REFERENCES public.professional_contacts(id) ON DELETE CASCADE,
  news_headline TEXT NOT NULL,
  news_url TEXT,
  news_summary TEXT,
  relevance_reason TEXT,
  suggested_talking_points JSONB DEFAULT '[]'::jsonb,
  shared_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create relationship strengthening suggestions table  
CREATE TABLE IF NOT EXISTS public.relationship_strengthening_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id UUID REFERENCES public.professional_contacts(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL,
  suggestion_text TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  action_items JSONB DEFAULT '[]'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.industry_news_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_strengthening_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for industry_news_suggestions
CREATE POLICY "Users can view own news suggestions"
  ON public.industry_news_suggestions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own news suggestions"
  ON public.industry_news_suggestions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own news suggestions"
  ON public.industry_news_suggestions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own news suggestions"
  ON public.industry_news_suggestions FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for relationship_strengthening_suggestions
CREATE POLICY "Users can view own strengthening suggestions"
  ON public.relationship_strengthening_suggestions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own strengthening suggestions"
  ON public.relationship_strengthening_suggestions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own strengthening suggestions"
  ON public.relationship_strengthening_suggestions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own strengthening suggestions"
  ON public.relationship_strengthening_suggestions FOR DELETE
  USING (user_id = auth.uid());