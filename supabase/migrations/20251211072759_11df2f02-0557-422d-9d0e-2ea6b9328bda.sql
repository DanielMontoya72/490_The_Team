-- API Service Registry (defines all integrated services with rate limits)
CREATE TABLE public.api_service_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  base_url TEXT,
  rate_limit_requests INTEGER,
  rate_limit_period TEXT,
  daily_quota INTEGER,
  monthly_quota INTEGER,
  requires_api_key BOOLEAN DEFAULT false,
  is_free_tier BOOLEAN DEFAULT true,
  fallback_available BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- API Usage Logs (persistent tracking)
CREATE TABLE public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  service_name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT DEFAULT 'GET',
  status_code INTEGER,
  response_time_ms INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  fallback_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily API Usage Aggregates (for reporting)
CREATE TABLE public.api_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  date DATE NOT NULL,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  total_response_time_ms BIGINT DEFAULT 0,
  avg_response_time_ms INTEGER,
  p95_response_time_ms INTEGER,
  fallback_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(service_name, date)
);

-- API Alert Thresholds Configuration
CREATE TABLE public.api_alert_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  threshold_value INTEGER NOT NULL,
  threshold_unit TEXT,
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- API Alert History
CREATE TABLE public.api_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'warning',
  message TEXT NOT NULL,
  current_value NUMERIC,
  threshold_value NUMERIC,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Weekly Usage Reports
CREATE TABLE public.api_weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  report_data JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_service_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_alert_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_weekly_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow authenticated users to view all API data (admin dashboard)
CREATE POLICY "Authenticated users can view api_service_registry"
ON public.api_service_registry FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view api_usage_logs"
ON public.api_usage_logs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view api_usage_daily"
ON public.api_usage_daily FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view api_alerts"
ON public.api_alerts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view api_alert_thresholds"
ON public.api_alert_thresholds FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view api_weekly_reports"
ON public.api_weekly_reports FOR SELECT
TO authenticated
USING (true);

-- Seed API Service Registry with known services
INSERT INTO public.api_service_registry (service_name, display_name, base_url, rate_limit_requests, rate_limit_period, daily_quota, monthly_quota, requires_api_key, is_free_tier, fallback_available) VALUES
('gemini_ai', 'Gemini AI', 'https://generativelanguage.googleapis.com', 100, 'minute', 1000, NULL, false, true, false),
('bls_api', 'Bureau of Labor Statistics', 'https://api.bls.gov', 50, '10_seconds', NULL, NULL, false, true, true),
('nominatim', 'Nominatim (OpenStreetMap)', 'https://nominatim.openstreetmap.org', 1, 'second', 2000, NULL, false, true, true),
('timeapi', 'TimeAPI.io', 'https://timeapi.io', 10, 'second', NULL, NULL, false, true, true),
('osrm', 'OSRM Routing', 'https://router.project-osrm.org', 5, 'second', NULL, NULL, false, true, false),
('github_api', 'GitHub API', 'https://api.github.com', 5000, 'hour', 5000, NULL, true, true, false),
('gmail_api', 'Gmail API', 'https://gmail.googleapis.com', 250, 'day', 250, NULL, true, true, false),
('linkedin_api', 'LinkedIn API', 'https://api.linkedin.com', 100, 'day', 100, NULL, true, true, false),
('mapbox', 'Mapbox', 'https://api.mapbox.com', 100000, 'month', NULL, 100000, true, true, false);

-- Seed default alert thresholds
INSERT INTO public.api_alert_thresholds (service_name, alert_type, threshold_value, threshold_unit, notification_enabled) VALUES
('gemini_ai', 'quota_warning', 80, 'percent', true),
('gemini_ai', 'error_rate', 10, 'percent', true),
('bls_api', 'error_rate', 20, 'percent', true),
('nominatim', 'quota_warning', 80, 'percent', true),
('github_api', 'quota_warning', 80, 'percent', true),
('gmail_api', 'quota_warning', 80, 'percent', true),
('linkedin_api', 'quota_warning', 80, 'percent', true);

-- Create indexes for performance
CREATE INDEX idx_api_usage_logs_service_name ON public.api_usage_logs(service_name);
CREATE INDEX idx_api_usage_logs_created_at ON public.api_usage_logs(created_at);
CREATE INDEX idx_api_usage_daily_service_date ON public.api_usage_daily(service_name, date);
CREATE INDEX idx_api_alerts_service_name ON public.api_alerts(service_name);
CREATE INDEX idx_api_alerts_created_at ON public.api_alerts(created_at);