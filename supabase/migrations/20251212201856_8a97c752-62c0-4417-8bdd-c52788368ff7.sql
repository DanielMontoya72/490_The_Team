-- Add INSERT policies for API monitoring tables

-- Allow authenticated users to insert api_usage_logs
CREATE POLICY "Authenticated users can insert api_usage_logs"
ON public.api_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to insert api_usage_daily
CREATE POLICY "Authenticated users can insert api_usage_daily"
ON public.api_usage_daily
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update api_usage_daily (for aggregation)
CREATE POLICY "Authenticated users can update api_usage_daily"
ON public.api_usage_daily
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to insert api_alerts
CREATE POLICY "Authenticated users can insert api_alerts"
ON public.api_alerts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update api_alerts (for resolving)
CREATE POLICY "Authenticated users can update api_alerts"
ON public.api_alerts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);