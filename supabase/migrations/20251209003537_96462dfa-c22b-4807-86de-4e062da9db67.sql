-- Create enum for email types
CREATE TYPE email_type AS ENUM (
  'recruiter_outreach',
  'interview_invitation', 
  'rejection',
  'offer',
  'status_update',
  'follow_up',
  'other'
);

-- Create enum for scan frequency
CREATE TYPE scan_frequency AS ENUM (
  'hourly',
  'daily',
  'manual'
);

-- Create gmail_integrations table
CREATE TABLE public.gmail_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_email TEXT,
  gmail_access_token TEXT,
  gmail_refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scanning_enabled BOOLEAN DEFAULT false,
  scan_frequency scan_frequency DEFAULT 'daily',
  last_scan_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create application_emails table
CREATE TABLE public.application_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  from_email TEXT,
  from_name TEXT,
  subject TEXT,
  snippet TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  email_type email_type DEFAULT 'other',
  suggested_status TEXT,
  is_processed BOOLEAN DEFAULT false,
  raw_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, gmail_message_id)
);

-- Enable RLS
ALTER TABLE public.gmail_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_emails ENABLE ROW LEVEL SECURITY;

-- RLS policies for gmail_integrations
CREATE POLICY "Users can view their own gmail integration"
  ON public.gmail_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gmail integration"
  ON public.gmail_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gmail integration"
  ON public.gmail_integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gmail integration"
  ON public.gmail_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for application_emails
CREATE POLICY "Users can view their own application emails"
  ON public.application_emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own application emails"
  ON public.application_emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own application emails"
  ON public.application_emails FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own application emails"
  ON public.application_emails FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_gmail_integrations_user_id ON public.gmail_integrations(user_id);
CREATE INDEX idx_application_emails_user_id ON public.application_emails(user_id);
CREATE INDEX idx_application_emails_job_id ON public.application_emails(job_id);
CREATE INDEX idx_application_emails_received_at ON public.application_emails(received_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_gmail_integrations_updated_at
  BEFORE UPDATE ON public.gmail_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_application_emails_updated_at
  BEFORE UPDATE ON public.application_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();