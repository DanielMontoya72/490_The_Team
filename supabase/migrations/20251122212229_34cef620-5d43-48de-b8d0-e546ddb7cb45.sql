-- Create networking campaigns table
CREATE TABLE public.networking_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'industry', -- 'industry', 'company', 'role', 'custom'
  target_companies TEXT[] DEFAULT '{}',
  target_industries TEXT[] DEFAULT '{}',
  target_roles TEXT[] DEFAULT '{}',
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  goals JSONB DEFAULT '{}', -- {outreach_target: 50, response_target: 20, connection_target: 10}
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'completed', 'archived'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign outreach tracking table
CREATE TABLE public.campaign_outreach (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.networking_campaigns(id) ON DELETE CASCADE,
  contact_id UUID, -- Can reference professional_contacts or contact_suggestions
  contact_source TEXT NOT NULL DEFAULT 'professional_contacts', -- 'professional_contacts', 'contact_suggestions'
  contact_name TEXT NOT NULL,
  contact_company TEXT,
  contact_title TEXT,
  outreach_type TEXT NOT NULL DEFAULT 'message', -- 'message', 'email', 'linkedin', 'call'
  message_variant TEXT, -- For A/B testing: 'A', 'B', 'C', etc.
  message_content TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  response_received BOOLEAN DEFAULT false,
  response_date TIMESTAMP WITH TIME ZONE,
  response_content TEXT,
  outcome TEXT, -- 'connected', 'interested', 'not_interested', 'no_response', 'meeting_scheduled'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign metrics table for daily/weekly tracking
CREATE TABLE public.campaign_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.networking_campaigns(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  outreach_sent INTEGER DEFAULT 0,
  responses_received INTEGER DEFAULT 0,
  response_rate NUMERIC,
  connections_made INTEGER DEFAULT 0,
  meetings_scheduled INTEGER DEFAULT 0,
  opportunities_generated INTEGER DEFAULT 0,
  variant_a_sent INTEGER DEFAULT 0,
  variant_a_responses INTEGER DEFAULT 0,
  variant_b_sent INTEGER DEFAULT 0,
  variant_b_responses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, metric_date)
);

-- Create campaign job links table
CREATE TABLE public.campaign_job_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.networking_campaigns(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  outcome TEXT, -- 'interview', 'offer', 'referral', 'information', 'no_outcome'
  notes TEXT,
  UNIQUE(campaign_id, job_id)
);

-- Enable RLS
ALTER TABLE public.networking_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_job_links ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for networking_campaigns
CREATE POLICY "Users can view own campaigns"
  ON public.networking_campaigns FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own campaigns"
  ON public.networking_campaigns FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own campaigns"
  ON public.networking_campaigns FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own campaigns"
  ON public.networking_campaigns FOR DELETE
  USING (user_id = auth.uid());

-- Create RLS policies for campaign_outreach
CREATE POLICY "Users can view own campaign outreach"
  ON public.campaign_outreach FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own campaign outreach"
  ON public.campaign_outreach FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own campaign outreach"
  ON public.campaign_outreach FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own campaign outreach"
  ON public.campaign_outreach FOR DELETE
  USING (user_id = auth.uid());

-- Create RLS policies for campaign_metrics
CREATE POLICY "Users can view own campaign metrics"
  ON public.campaign_metrics FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own campaign metrics"
  ON public.campaign_metrics FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own campaign metrics"
  ON public.campaign_metrics FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own campaign metrics"
  ON public.campaign_metrics FOR DELETE
  USING (user_id = auth.uid());

-- Create RLS policies for campaign_job_links
CREATE POLICY "Users can view own campaign job links"
  ON public.campaign_job_links FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own campaign job links"
  ON public.campaign_job_links FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own campaign job links"
  ON public.campaign_job_links FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own campaign job links"
  ON public.campaign_job_links FOR DELETE
  USING (user_id = auth.uid());

-- Create indexes for better query performance
CREATE INDEX idx_networking_campaigns_user_id ON public.networking_campaigns(user_id);
CREATE INDEX idx_networking_campaigns_status ON public.networking_campaigns(status);
CREATE INDEX idx_campaign_outreach_campaign_id ON public.campaign_outreach(campaign_id);
CREATE INDEX idx_campaign_outreach_user_id ON public.campaign_outreach(user_id);
CREATE INDEX idx_campaign_metrics_campaign_id ON public.campaign_metrics(campaign_id);
CREATE INDEX idx_campaign_job_links_campaign_id ON public.campaign_job_links(campaign_id);

-- Create function to update campaign metrics
CREATE OR REPLACE FUNCTION public.update_campaign_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update metrics when outreach is added or updated
  INSERT INTO public.campaign_metrics (
    user_id,
    campaign_id,
    metric_date,
    outreach_sent,
    responses_received,
    response_rate
  )
  VALUES (
    NEW.user_id,
    NEW.campaign_id,
    CURRENT_DATE,
    1,
    CASE WHEN NEW.response_received THEN 1 ELSE 0 END,
    0
  )
  ON CONFLICT (campaign_id, metric_date)
  DO UPDATE SET
    outreach_sent = campaign_metrics.outreach_sent + 1,
    responses_received = campaign_metrics.responses_received + CASE WHEN NEW.response_received THEN 1 ELSE 0 END,
    response_rate = CASE 
      WHEN campaign_metrics.outreach_sent + 1 > 0 
      THEN (campaign_metrics.responses_received + CASE WHEN NEW.response_received THEN 1 ELSE 0 END)::NUMERIC / (campaign_metrics.outreach_sent + 1)
      ELSE 0 
    END,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic metrics updates
CREATE TRIGGER update_campaign_metrics_trigger
AFTER INSERT OR UPDATE ON public.campaign_outreach
FOR EACH ROW
EXECUTE FUNCTION public.update_campaign_metrics();