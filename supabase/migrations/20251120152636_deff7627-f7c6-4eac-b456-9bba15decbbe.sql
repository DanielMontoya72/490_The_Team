-- Create tables for contact discovery and networking opportunities

-- Table for storing suggested contacts
CREATE TABLE IF NOT EXISTS public.contact_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_name text NOT NULL,
  contact_title text,
  contact_company text,
  contact_location text,
  linkedin_url text,
  email text,
  phone text,
  connection_type text NOT NULL, -- 'second_degree', 'third_degree', 'alumni', 'industry_leader', 'speaker', 'mutual_interest'
  connection_path jsonb DEFAULT '[]'::jsonb, -- Array of connection nodes
  mutual_connections jsonb DEFAULT '[]'::jsonb,
  mutual_interests text[],
  suggestion_reason text,
  relevance_score integer DEFAULT 0, -- 0-100
  target_company text,
  target_role text,
  educational_institution text,
  diversity_inclusion_tags text[],
  status text DEFAULT 'suggested', -- 'suggested', 'contacted', 'connected', 'dismissed'
  contacted_at timestamptz,
  connected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT contact_suggestions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Table for networking opportunities
CREATE TABLE IF NOT EXISTS public.networking_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  opportunity_type text NOT NULL, -- 'conference', 'meetup', 'webinar', 'alumni_event', 'industry_event'
  event_name text NOT NULL,
  event_description text,
  event_date timestamptz,
  event_location text,
  event_url text,
  organizer text,
  speakers jsonb DEFAULT '[]'::jsonb,
  topics text[],
  industry text,
  relevance_score integer DEFAULT 0,
  potential_contacts jsonb DEFAULT '[]'::jsonb,
  diversity_focus boolean DEFAULT false,
  status text DEFAULT 'discovered', -- 'discovered', 'interested', 'registered', 'attended', 'dismissed'
  registered_at timestamptz,
  attended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT networking_opportunities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Table for tracking contact discovery metrics
CREATE TABLE IF NOT EXISTS public.contact_discovery_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  metric_date date DEFAULT CURRENT_DATE,
  suggestions_generated integer DEFAULT 0,
  contacts_reached_out integer DEFAULT 0,
  connections_made integer DEFAULT 0,
  response_rate numeric,
  avg_relevance_score numeric,
  connection_types jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT contact_discovery_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT contact_discovery_metrics_user_date_unique UNIQUE (user_id, metric_date)
);

-- Enable RLS
ALTER TABLE public.contact_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.networking_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_discovery_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contact_suggestions
CREATE POLICY "Users can view own contact suggestions"
ON public.contact_suggestions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own contact suggestions"
ON public.contact_suggestions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own contact suggestions"
ON public.contact_suggestions FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own contact suggestions"
ON public.contact_suggestions FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for networking_opportunities
CREATE POLICY "Users can view own networking opportunities"
ON public.networking_opportunities FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own networking opportunities"
ON public.networking_opportunities FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own networking opportunities"
ON public.networking_opportunities FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own networking opportunities"
ON public.networking_opportunities FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for contact_discovery_metrics
CREATE POLICY "Users can view own contact metrics"
ON public.contact_discovery_metrics FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own contact metrics"
ON public.contact_discovery_metrics FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own contact metrics"
ON public.contact_discovery_metrics FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_contact_suggestions_user_id ON public.contact_suggestions(user_id);
CREATE INDEX idx_contact_suggestions_status ON public.contact_suggestions(status);
CREATE INDEX idx_networking_opportunities_user_id ON public.networking_opportunities(user_id);
CREATE INDEX idx_networking_opportunities_event_date ON public.networking_opportunities(event_date);
CREATE INDEX idx_contact_discovery_metrics_user_id ON public.contact_discovery_metrics(user_id);

-- Trigger for updating updated_at
CREATE TRIGGER update_contact_suggestions_updated_at
BEFORE UPDATE ON public.contact_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_networking_opportunities_updated_at
BEFORE UPDATE ON public.networking_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();