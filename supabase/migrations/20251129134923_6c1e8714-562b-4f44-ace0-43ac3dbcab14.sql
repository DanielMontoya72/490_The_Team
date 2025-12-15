-- Create table for invitation-based chat messages (for mentors without accounts)
CREATE TABLE public.mentor_invitation_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_id UUID NOT NULL REFERENCES public.mentor_invitations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentor_invitation_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages for their invitations
CREATE POLICY "Users can view invitation messages"
ON public.mentor_invitation_messages
FOR SELECT
USING (
  invitation_id IN (
    SELECT id FROM public.mentor_invitations WHERE user_id = auth.uid()
  )
);

-- Policy: Users can create messages for their invitations
CREATE POLICY "Users can create invitation messages"
ON public.mentor_invitation_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  invitation_id IN (
    SELECT id FROM public.mentor_invitations WHERE user_id = auth.uid()
  )
);

-- Policy: Users can delete messages for their invitations
CREATE POLICY "Users can delete invitation messages"
ON public.mentor_invitation_messages
FOR DELETE
USING (
  invitation_id IN (
    SELECT id FROM public.mentor_invitations WHERE user_id = auth.uid()
  )
);