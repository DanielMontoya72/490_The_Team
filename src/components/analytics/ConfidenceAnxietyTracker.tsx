import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Brain, TrendingUp, TrendingDown, Minus, Heart, AlertCircle } from "lucide-react";

interface ConfidenceAnxietyTrackerProps {
  data: any;
}

export function ConfidenceAnxietyTracker({ data }: ConfidenceAnxietyTrackerProps) {
  const predictions = data?.predictions || [];
  const mockSessions = data?.mockSessions || [];
  
  // Calculate confidence metrics from predictions
  const predictionConfidence = predictions.map((p: any) => ({
    date: new Date(p.created_at),
    confidence: p.overall_probability || 0,
    preparedness: p.preparation_score || 0,
    type: 'prediction'
  }));
  
  // Calculate confidence from mock sessions (using overall_score as proxy)
  const sessionConfidence = mockSessions.map((s: any) => ({
    date: new Date(s.created_at),
    confidence: s.overall_score || 0,
    preparedness: s.overall_score || 0,
    type: 'practice'
  }));
  
  // Combine and sort by date
  const allData = [...predictionConfidence, ...sessionConfidence]
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Group by week for trend analysis
  const weeklyData: Record<string, { confidence: number[]; preparedness: number[] }> = {};
  
  allData.forEach((item) => {
    const weekStart = new Date(item.date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekKey = `${weekStart.getFullYear()}-W${Math.ceil((weekStart.getMonth() * 4.33) + (weekStart.getDate() / 7))}`;
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { confidence: [], preparedness: [] };
    }
    weeklyData[weekKey].confidence.push(item.confidence);
    weeklyData[weekKey].preparedness.push(item.preparedness);
  });
  
  const chartData = Object.entries(weeklyData).map(([week, scores]) => ({
    week: week.split('-')[1],
    confidence: scores.confidence.length > 0 
      ? scores.confidence.reduce((a, b) => a + b, 0) / scores.confidence.length 
      : null,
    preparedness: scores.preparedness.length > 0 
      ? scores.preparedness.reduce((a, b) => a + b, 0) / scores.preparedness.length 
      : null,
  })).slice(-8); // Last 8 weeks
  
  // Calculate current vs previous period confidence
  const recentData = allData.filter(d => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    return d.date >= twoWeeksAgo;
  });
  
  const previousData = allData.filter(d => {
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    return d.date >= fourWeeksAgo && d.date < twoWeeksAgo;
  });
  
  const currentConfidence = recentData.length > 0
    ? recentData.reduce((sum, d) => sum + d.confidence, 0) / recentData.length
    : 0;
  
  const previousConfidence = previousData.length > 0
    ? previousData.reduce((sum, d) => sum + d.confidence, 0) / previousData.length
    : 0;
  
  const confidenceTrend = currentConfidence - previousConfidence;
  
  // Anxiety indicators (inverse of confidence/preparation)
  const anxietyLevel = currentConfidence > 0 ? Math.max(0, 100 - currentConfidence) : 50;
  
  // Determine anxiety management status
  const anxietyStatus = anxietyLevel < 30 
    ? { label: 'Well Managed', color: 'text-green-500', bgColor: 'bg-green-500/10' }
    : anxietyLevel < 50 
    ? { label: 'Moderate', color: 'text-blue-500', bgColor: 'bg-blue-500/10' }
    : anxietyLevel < 70 
    ? { label: 'Elevated', color: 'text-orange-500', bgColor: 'bg-orange-500/10' }
    : { label: 'High', color: 'text-red-500', bgColor: 'bg-red-500/10' };
  
  const TrendIcon = confidenceTrend > 5 ? TrendingUp : confidenceTrend < -5 ? TrendingDown : Minus;
  const trendColor = confidenceTrend > 5 ? 'text-green-500' : confidenceTrend < -5 ? 'text-red-500' : 'text-muted-foreground';
  
  if (allData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Confidence & Anxiety Management
          </CardTitle>
          <CardDescription>
            Track your confidence levels and interview anxiety over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">
              Complete practice sessions and interviews to track confidence metrics
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Confidence & Anxiety Management
        </CardTitle>
        <CardDescription>
          Monitor your confidence levels and anxiety management progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Metrics */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Confidence Level</span>
              </div>
              <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
                <TrendIcon className="h-4 w-4" />
                {confidenceTrend > 0 ? '+' : ''}{confidenceTrend.toFixed(1)}%
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold">{currentConfidence.toFixed(0)}%</span>
                <span className="text-xs text-muted-foreground">Current average</span>
              </div>
              <Progress value={currentConfidence} className="h-2" />
            </div>
          </div>
          
          <div className={`p-4 rounded-lg border space-y-3 ${anxietyStatus.bgColor}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className={`h-4 w-4 ${anxietyStatus.color}`} />
                <span className="font-semibold text-sm">Anxiety Indicator</span>
              </div>
              <Badge variant="outline" className={anxietyStatus.color}>
                {anxietyStatus.label}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold">{anxietyLevel.toFixed(0)}%</span>
                <span className="text-xs text-muted-foreground">Estimated level</span>
              </div>
              <Progress value={anxietyLevel} className="h-2" />
            </div>
          </div>
        </div>
        
        {/* Trend Chart */}
        {chartData.length > 1 && (
          <div className="pt-4 border-t">
            <h4 className="font-semibold text-sm mb-4">Confidence Trend Over Time</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="week" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="confidence" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Confidence"
                  connectNulls
                />
                <Line 
                  type="monotone" 
                  dataKey="preparedness" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  name="Preparedness"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* Tips based on anxiety level */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <h4 className="font-semibold text-sm mb-2">Anxiety Management Tips</h4>
          {anxietyLevel >= 50 ? (
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Increase practice sessions to build familiarity</li>
              <li>• Try breathing exercises before interviews</li>
              <li>• Focus on thorough company research to feel prepared</li>
              <li>• Review your strengths and past successes</li>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your confidence levels are healthy! Maintain your current preparation routine and continue practicing regularly.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
