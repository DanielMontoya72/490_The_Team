-- Create mentor accountability milestones table
CREATE TABLE IF NOT EXISTS public.mentor_accountability_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  relationship_id UUID NOT NULL,
  mentee_id UUID NOT NULL,
  mentor_id UUID NOT NULL,
  milestone_title TEXT NOT NULL,
  milestone_description TEXT,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'missed')),
  completion_notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentor_accountability_milestones ENABLE ROW LEVEL SECURITY;

-- Mentors can create milestones for their mentees
CREATE POLICY "Mentors can create accountability milestones"
ON public.mentor_accountability_milestones
FOR INSERT
TO authenticated
WITH CHECK (
  mentor_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM mentor_relationships
    WHERE id = relationship_id
    AND mentor_id = auth.uid()
    AND status = 'active'
  )
);

-- Mentors can view milestones for their mentees
CREATE POLICY "Mentors can view accountability milestones"
ON public.mentor_accountability_milestones
FOR SELECT
TO authenticated
USING (
  mentor_id = auth.uid() OR
  mentee_id = auth.uid()
);

-- Mentors can update milestones
CREATE POLICY "Mentors can update accountability milestones"
ON public.mentor_accountability_milestones
FOR UPDATE
TO authenticated
USING (mentor_id = auth.uid());

-- Mentors can delete milestones
CREATE POLICY "Mentors can delete accountability milestones"
ON public.mentor_accountability_milestones
FOR DELETE
TO authenticated
USING (mentor_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_accountability_milestones_relationship ON public.mentor_accountability_milestones(relationship_id);
CREATE INDEX idx_accountability_milestones_mentee ON public.mentor_accountability_milestones(mentee_id);
CREATE INDEX idx_accountability_milestones_mentor ON public.mentor_accountability_milestones(mentor_id);

-- Add trigger for updated_at
CREATE TRIGGER update_accountability_milestones_updated_at
BEFORE UPDATE ON public.mentor_accountability_milestones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();