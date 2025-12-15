import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Timer } from "lucide-react";

interface TimeAllocationChartProps {
  entries: any[];
  onStartTracking?: () => void;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

const activityLabels: Record<string, string> = {
  job_research: "Job Research",
  application: "Applications",
  networking: "Networking",
  interview_prep: "Interview Prep",
  skill_development: "Skill Development",
  resume_work: "Resume Work",
  cover_letter: "Cover Letters",
  follow_up: "Follow-ups",
};

export function TimeAllocationChart({ entries, onStartTracking }: TimeAllocationChartProps) {
  // Filter out invalid entries
  const validEntries = entries.filter(entry => 
    entry && 
    entry.activity_type && 
    typeof entry.duration_minutes === 'number' && 
    entry.duration_minutes > 0
  );

  const timeByActivity = validEntries.reduce((acc: Record<string, number>, entry) => {
    const label = activityLabels[entry.activity_type] || entry.activity_type;
    acc[label] = (acc[label] || 0) + entry.duration_minutes;
    return acc;
  }, {});

  const chartData = Object.entries(timeByActivity)
    .map(([name, value]) => ({
      name,
      value,
      hours: ((value as number) / 60).toFixed(1),
    }))
    .sort((a, b) => (b.value as number) - (a.value as number));

  // Create color map based on sorted order
  const colorMap = chartData.reduce((acc, item, index) => {
    acc[item.name] = COLORS[index % COLORS.length];
    return acc;
  }, {} as Record<string, string>);

  if (chartData.length === 0) {
    return (
      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
          <CardTitle className="text-blue-700 dark:text-blue-300">Time Allocation</CardTitle>
          <CardDescription className="text-blue-600 dark:text-blue-400">No time entries yet. Start tracking to see your breakdown!</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Timer className="w-16 h-16 text-blue-300 dark:text-blue-700 mb-4" />
            <p className="text-muted-foreground mb-4">
              Track your job search activities to see how you're spending your time
            </p>
            {onStartTracking && (
              <Button onClick={onStartTracking} className="bg-blue-500 hover:bg-blue-600">
                <Timer className="w-4 h-4 mr-2" />
                Start Tracking Activities
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800 shadow-lg shadow-blue-100 dark:shadow-blue-900/20">
      <CardHeader className="bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 dark:from-blue-950/30 dark:via-cyan-950/30 dark:to-blue-950/30">
        <CardTitle className="text-blue-700 dark:text-blue-300">Time Allocation by Activity</CardTitle>
        <CardDescription className="text-blue-600 dark:text-blue-400">
          How you're spending your job search time
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover p-3 rounded-lg border shadow-lg">
                      <p className="font-medium">{payload[0].name}</p>
                      <p className="text-sm text-muted-foreground">
                        {payload[0].payload.hours} hours
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-6 grid gap-3">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: colorMap[item.name] }}
                />
                <span className="font-medium">{item.name}</span>
              </div>
              <span className="text-muted-foreground">{item.hours}h</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
