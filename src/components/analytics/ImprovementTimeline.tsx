import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from "lucide-react";

interface ImprovementTimelineProps {
  data: any;
}

export function ImprovementTimeline({ data }: ImprovementTimelineProps) {
  const mockSessions = data?.mockSessions || [];
  const predictions = data?.predictions || [];
  
  // Combine mock sessions and predictions over time
  const allData = [
    ...mockSessions.map((s: any) => ({
      date: new Date(s.created_at),
      score: s.overall_score || 0,
      type: 'practice'
    })),
    ...predictions.map((p: any) => ({
      date: new Date(p.created_at),
      score: p.overall_probability || 0,
      type: 'prediction'
    }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Group by month
  const monthlyData: Record<string, { practice: number[]; predictions: number[] }> = {};
  
  allData.forEach((item) => {
    const monthKey = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { practice: [], predictions: [] };
    }
    if (item.type === 'practice') {
      monthlyData[monthKey].practice.push(item.score);
    } else {
      monthlyData[monthKey].predictions.push(item.score);
    }
  });
  
  const chartData = Object.entries(monthlyData).map(([month, scores]) => ({
    month,
    practice: scores.practice.length > 0 
      ? scores.practice.reduce((a, b) => a + b, 0) / scores.practice.length 
      : null,
    predictions: scores.predictions.length > 0 
      ? scores.predictions.reduce((a, b) => a + b, 0) / scores.predictions.length 
      : null,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Improvement Over Time
          </CardTitle>
          <CardDescription>
            Track your interview performance improvement with practice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete practice sessions and interviews to see your improvement over time
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Improvement Over Time
        </CardTitle>
        <CardDescription>
          Track your interview performance improvement with practice
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
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
              dataKey="practice" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Practice Sessions"
              connectNulls
            />
            <Line 
              type="monotone" 
              dataKey="predictions" 
              stroke="hsl(var(--accent))" 
              strokeWidth={2}
              name="Interview Predictions"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
