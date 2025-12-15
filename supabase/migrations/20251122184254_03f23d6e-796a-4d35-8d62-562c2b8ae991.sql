-- Add RLS policies for industry_news_suggestions table
CREATE POLICY "Users can view their own industry news suggestions"
ON industry_news_suggestions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own industry news suggestions"
ON industry_news_suggestions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own industry news suggestions"
ON industry_news_suggestions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own industry news suggestions"
ON industry_news_suggestions
FOR DELETE
USING (auth.uid() = user_id);