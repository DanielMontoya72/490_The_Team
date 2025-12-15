-- Cache geocoding results to minimize API usage
CREATE TABLE public.geocoded_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_string TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  display_name TEXT,
  country TEXT,
  country_code TEXT,
  timezone TEXT,
  geocoded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(location_string)
);

-- User home address for commute calculations
CREATE TABLE public.user_home_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  timezone TEXT,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Job commute cache
CREATE TABLE public.job_commute_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  distance_km DOUBLE PRECISION,
  duration_minutes INTEGER,
  route_geometry TEXT,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, user_id)
);

-- Enable RLS
ALTER TABLE public.geocoded_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_home_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_commute_cache ENABLE ROW LEVEL SECURITY;

-- Geocoded locations are public read (cache shared across users)
CREATE POLICY "Anyone can read geocoded locations"
  ON public.geocoded_locations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert geocoded locations"
  ON public.geocoded_locations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- User home addresses - user only
CREATE POLICY "Users can manage their own home address"
  ON public.user_home_addresses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Job commute cache - user only
CREATE POLICY "Users can manage their own commute cache"
  ON public.job_commute_cache FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update trigger for home addresses
CREATE TRIGGER update_user_home_addresses_updated_at
  BEFORE UPDATE ON public.user_home_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();