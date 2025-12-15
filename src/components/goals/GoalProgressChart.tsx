import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Goal {
  id: string;
  goal_title: string;
  progress_percentage: number;
  status: string;
}

interface GoalProgressChartProps {
  goals: Goal[];
}

export function GoalProgressChart({ goals }: GoalProgressChartProps) {
  const activeGoals = goals.filter(g => g.status !== 'completed' && g.status !== 'cancelled');

  const chartData = activeGoals.map(goal => ({
    name: goal.goal_title.length > 30 ? goal.goal_title.substring(0, 30) + '...' : goal.goal_title,
    progress: goal.progress_percentage,
  }));

  const getBarColor = (progress: number) => {
    if (progress >= 75) return 'hsl(var(--chart-1))';
    if (progress >= 50) return 'hsl(var(--chart-2))';
    if (progress >= 25) return 'hsl(var(--chart-3))';
    return 'hsl(var(--chart-4))';
  };

  if (activeGoals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No active goals to display progress for.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Goal Progress Overview</CardTitle>
        <CardDescription>Visual representation of your active goals</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} />
            <YAxis domain={[0, 100]} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              cursor={{ fill: 'hsl(var(--muted) / 0.3)', radius: 4 }}
              animationDuration={200}
              animationEasing="ease-out"
            />
            <Bar 
              dataKey="progress" 
              fill="hsl(var(--primary))" 
              radius={[8, 8, 0, 0]}
              animationDuration={800}
              animationEasing="ease-in-out"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.progress)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}