-- Add missing RLS policies for market intelligence tables

-- Skill Demand Trends missing UPDATE and DELETE
CREATE POLICY "Users can update their own skill demand trends"
ON public.skill_demand_trends
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skill demand trends"
ON public.skill_demand_trends
FOR DELETE
USING (auth.uid() = user_id);

-- Market Trends missing UPDATE and DELETE  
CREATE POLICY "Users can update their own market trends"
ON public.market_trends
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own market trends"
ON public.market_trends
FOR DELETE
USING (auth.uid() = user_id);

-- Market Insights missing DELETE
CREATE POLICY "Users can delete their own market insights"
ON public.market_insights
FOR DELETE
USING (auth.uid() = user_id);