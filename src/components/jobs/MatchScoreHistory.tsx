import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MatchScoreHistoryProps {
  jobId: string;
}

export function MatchScoreHistory({ jobId }: MatchScoreHistoryProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['match-score-history', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_match_analyses')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Match Score History
          </CardTitle>
          <CardDescription>
            Track how your match score changes over time
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No history available yet</p>
          <p className="text-sm">Match scores will appear here after analysis</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = history.map(item => ({
    date: new Date(item.created_at).toLocaleDateString(),
    overall: item.overall_score,
    skills: item.skills_score,
    experience: item.experience_score,
    education: item.education_score,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Match Score History
        </CardTitle>
        <CardDescription>
          {history.length} analysis{history.length !== 1 ? 'es' : ''} recorded
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
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
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="overall" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              name="Overall"
            />
            <Line 
              type="monotone" 
              dataKey="skills" 
              stroke="hsl(var(--chart-1))" 
              strokeWidth={2}
              name="Skills"
            />
            <Line 
              type="monotone" 
              dataKey="experience" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              name="Experience"
            />
            <Line 
              type="monotone" 
              dataKey="education" 
              stroke="hsl(var(--chart-3))" 
              strokeWidth={2}
              name="Education"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
