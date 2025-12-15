-- Enable RLS policies for professional_contacts table
-- Users can view their own contacts
CREATE POLICY "Users can view own professional contacts"
ON public.professional_contacts
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own contacts
CREATE POLICY "Users can insert own professional contacts"
ON public.professional_contacts
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own contacts
CREATE POLICY "Users can update own professional contacts"
ON public.professional_contacts
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own contacts
CREATE POLICY "Users can delete own professional contacts"
ON public.professional_contacts
FOR DELETE
USING (user_id = auth.uid());