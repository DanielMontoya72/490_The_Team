-- Create cover letter performance tracking table
CREATE TABLE public.cover_letter_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.application_materials(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  template_style TEXT,
  approach_type TEXT,
  word_count INTEGER,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  response_received BOOLEAN DEFAULT false,
  response_date TIMESTAMP WITH TIME ZONE,
  outcome TEXT,
  time_to_response_hours INTEGER,
  effectiveness_score INTEGER CHECK (effectiveness_score >= 0 AND effectiveness_score <= 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cover_letter_performance ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own cover letter performance"
ON public.cover_letter_performance
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own cover letter performance"
ON public.cover_letter_performance
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cover letter performance"
ON public.cover_letter_performance
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own cover letter performance"
ON public.cover_letter_performance
FOR DELETE
USING (user_id = auth.uid());

-- Create indexes for better query performance
CREATE INDEX idx_cover_letter_performance_user_id ON public.cover_letter_performance(user_id);
CREATE INDEX idx_cover_letter_performance_material_id ON public.cover_letter_performance(material_id);
CREATE INDEX idx_cover_letter_performance_job_id ON public.cover_letter_performance(job_id);
CREATE INDEX idx_cover_letter_performance_template_style ON public.cover_letter_performance(template_style);

-- Create trigger for updated_at
CREATE TRIGGER update_cover_letter_performance_updated_at
BEFORE UPDATE ON public.cover_letter_performance
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();