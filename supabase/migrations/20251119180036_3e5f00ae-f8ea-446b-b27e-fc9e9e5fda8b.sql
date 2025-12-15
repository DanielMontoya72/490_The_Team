-- Create interview follow-up tracking table
CREATE TABLE public.interview_follow_ups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  follow_up_type TEXT NOT NULL, -- 'thank_you', 'status_inquiry', 'feedback_request', 'networking'
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  response_received BOOLEAN DEFAULT false,
  response_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interview_follow_ups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own interview follow-ups"
  ON public.interview_follow_ups
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own interview follow-ups"
  ON public.interview_follow_ups
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own interview follow-ups"
  ON public.interview_follow_ups
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own interview follow-ups"
  ON public.interview_follow_ups
  FOR DELETE
  USING (user_id = auth.uid());

-- Create index for performance
CREATE INDEX idx_interview_follow_ups_user_id ON public.interview_follow_ups(user_id);
CREATE INDEX idx_interview_follow_ups_interview_id ON public.interview_follow_ups(interview_id);