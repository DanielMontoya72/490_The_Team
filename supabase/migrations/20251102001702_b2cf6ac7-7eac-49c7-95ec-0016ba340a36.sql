-- Add new columns to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS headline TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS experience_level TEXT CHECK (experience_level IN ('Entry', 'Mid', 'Senior', 'Executive')),
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Add constraint for bio length
ALTER TABLE public.user_profiles
ADD CONSTRAINT bio_length_check CHECK (LENGTH(bio) <= 500);

-- Create employment_history table
CREATE TABLE IF NOT EXISTS public.employment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  job_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT job_description_length CHECK (LENGTH(job_description) <= 1000),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Create skills table
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  proficiency_level TEXT NOT NULL CHECK (proficiency_level IN ('Beginner', 'Intermediate', 'Advanced', 'Expert')),
  category TEXT NOT NULL CHECK (category IN ('Technical', 'Soft Skills', 'Languages', 'Industry-Specific')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_user_skill UNIQUE (user_id, skill_name)
);

-- Create education table
CREATE TABLE IF NOT EXISTS public.education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  institution_name TEXT NOT NULL,
  degree_type TEXT NOT NULL,
  field_of_study TEXT NOT NULL,
  graduation_date DATE,
  gpa DECIMAL(3,2),
  show_gpa BOOLEAN DEFAULT true,
  is_current BOOLEAN DEFAULT false,
  education_level TEXT NOT NULL CHECK (education_level IN ('High School', 'Associate', 'Bachelor', 'Master', 'PhD', 'Other')),
  achievements TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create certifications table
CREATE TABLE IF NOT EXISTS public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  certification_name TEXT NOT NULL,
  issuing_organization TEXT NOT NULL,
  date_earned DATE NOT NULL,
  expiration_date DATE,
  does_not_expire BOOLEAN DEFAULT false,
  certification_number TEXT,
  document_url TEXT,
  verification_status TEXT DEFAULT 'Unverified',
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  description TEXT NOT NULL,
  role TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  technologies TEXT[],
  project_url TEXT,
  repository_link TEXT,
  team_size INTEGER,
  outcomes TEXT,
  industry TEXT,
  project_type TEXT,
  status TEXT DEFAULT 'Completed' CHECK (status IN ('Completed', 'Ongoing', 'Planned')),
  media_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.employment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employment_history
CREATE POLICY "Users can view own employment history"
  ON public.employment_history FOR SELECT
  USING (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own employment history"
  ON public.employment_history FOR INSERT
  WITH CHECK (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own employment history"
  ON public.employment_history FOR UPDATE
  USING (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own employment history"
  ON public.employment_history FOR DELETE
  USING (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

-- RLS Policies for skills
CREATE POLICY "Users can view own skills"
  ON public.skills FOR SELECT
  USING (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own skills"
  ON public.skills FOR INSERT
  WITH CHECK (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own skills"
  ON public.skills FOR UPDATE
  USING (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own skills"
  ON public.skills FOR DELETE
  USING (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

-- RLS Policies for education
CREATE POLICY "Users can view own education"
  ON public.education FOR SELECT
  USING (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own education"
  ON public.education FOR INSERT
  WITH CHECK (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own education"
  ON public.education FOR UPDATE
  USING (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own education"
  ON public.education FOR DELETE
  USING (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

-- RLS Policies for certifications
CREATE POLICY "Users can view own certifications"
  ON public.certifications FOR SELECT
  USING (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own certifications"
  ON public.certifications FOR INSERT
  WITH CHECK (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own certifications"
  ON public.certifications FOR UPDATE
  USING (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own certifications"
  ON public.certifications FOR DELETE
  USING (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

-- RLS Policies for projects
CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (user_id = (SELECT user_id FROM public.user_profiles WHERE user_id = auth.uid()));

-- Create triggers for updated_at columns
CREATE TRIGGER update_employment_history_updated_at
  BEFORE UPDATE ON public.employment_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_skills_updated_at
  BEFORE UPDATE ON public.skills
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_education_updated_at
  BEFORE UPDATE ON public.education
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_certifications_updated_at
  BEFORE UPDATE ON public.certifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('certification-documents', 'certification-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-media', 'project-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile-pictures
CREATE POLICY "Anyone can view profile pictures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can upload own profile picture"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own profile picture"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-pictures' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own profile picture"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-pictures' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for certification-documents
CREATE POLICY "Users can view own certification documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'certification-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own certification documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'certification-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own certification documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'certification-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own certification documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'certification-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for project-media
CREATE POLICY "Anyone can view project media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-media');

CREATE POLICY "Users can upload own project media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own project media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own project media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );