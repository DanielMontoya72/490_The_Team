-- Create competitive_benchmarks table for storing peer comparison data
CREATE TABLE IF NOT EXISTS public.competitive_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  industry TEXT NOT NULL,
  experience_level TEXT NOT NULL,
  benchmark_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create competitive_analysis table for storing analysis results
CREATE TABLE IF NOT EXISTS public.competitive_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  analysis_date TIMESTAMPTZ DEFAULT now(),
  competitive_positioning JSONB,
  skill_gaps JSONB,
  peer_comparison JSONB,
  differentiation_strategies JSONB,
  recommendations JSONB,
  market_positioning JSONB,
  performance_metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competitive_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitive_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competitive_benchmarks
CREATE POLICY "Users can view their own benchmarks"
  ON public.competitive_benchmarks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own benchmarks"
  ON public.competitive_benchmarks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own benchmarks"
  ON public.competitive_benchmarks
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own benchmarks"
  ON public.competitive_benchmarks
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for competitive_analysis
CREATE POLICY "Users can view their own analysis"
  ON public.competitive_analysis
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analysis"
  ON public.competitive_analysis
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analysis"
  ON public.competitive_analysis
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analysis"
  ON public.competitive_analysis
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_competitive_benchmarks_user_id ON public.competitive_benchmarks(user_id);
CREATE INDEX idx_competitive_analysis_user_id ON public.competitive_analysis(user_id);
CREATE INDEX idx_competitive_analysis_date ON public.competitive_analysis(analysis_date DESC);