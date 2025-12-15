import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, Clock, Zap } from "lucide-react";

interface ProductivityPatternsProps {
  entries: any[];
  metrics: any[];
}

export function ProductivityPatterns({ entries, metrics }: ProductivityPatternsProps) {
  // Group by hour of day
  const hourlyData = entries.reduce((acc: any, entry) => {
    const hour = new Date(entry.started_at).getHours();
    if (!acc[hour]) {
      acc[hour] = { hour, count: 0, totalEnergy: 0, totalProductivity: 0 };
    }
    acc[hour].count++;
    acc[hour].totalEnergy += entry.energy_level || 0;
    acc[hour].totalProductivity += entry.productivity_rating || 0;
    return acc;
  }, {});

  const hourlyPattern = Object.values(hourlyData).map((data: any) => ({
    hour: `${data.hour}:00`,
    energy: (data.totalEnergy / data.count).toFixed(1),
    productivity: (data.totalProductivity / data.count).toFixed(1),
    activities: data.count,
  }));

  // Daily trends
  const dailyTrends = metrics.map((metric) => ({
    date: new Date(metric.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    completionRate: ((metric.completion_rate || 0) * 100).toFixed(0),
    energy: (metric.average_energy_level || 0).toFixed(1),
    productivity: (metric.average_productivity_rating || 0).toFixed(1),
  }));

  // Find peak productivity hour
  const peakHour = hourlyPattern.reduce((max, curr) => 
    parseFloat(curr.productivity) > parseFloat(max.productivity) ? curr : max
  , hourlyPattern[0] || { hour: "N/A", productivity: "0" });

  const avgEnergy = entries.reduce((sum, e) => sum + (e.energy_level || 0), 0) / (entries.length || 1);
  const avgProductivity = entries.reduce((sum, e) => sum + (e.productivity_rating || 0), 0) / (entries.length || 1);

  return (
    <div className="space-y-6">
      {/* Key Insights */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-background dark:from-green-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Peak Productivity</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{peakHour?.hour || "N/A"}</div>
            <p className="text-xs text-muted-foreground">
              Best time to work ({peakHour?.productivity}/5 rating)
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-yellow-200 dark:border-yellow-800 bg-gradient-to-br from-yellow-50 to-background dark:from-yellow-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Avg Energy</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{avgEnergy.toFixed(1)}/5</div>
            <p className="text-xs text-muted-foreground">
              Overall energy level
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Avg Productivity</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{avgProductivity.toFixed(1)}/5</div>
            <p className="text-xs text-muted-foreground">
              Self-assessed rating
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Pattern */}
      {hourlyPattern.length > 0 && (
        <Card className="border-2 border-green-200 dark:border-green-800">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
            <CardTitle className="text-green-700 dark:text-green-300">Productivity by Hour of Day</CardTitle>
            <CardDescription className="text-green-600 dark:text-green-400">
              Identify your most productive hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyPattern}>
                <CartesianGrid strokeDasharray="3 3" stroke="#86efac" />
                <XAxis dataKey="hour" stroke="#16a34a" />
                <YAxis domain={[0, 5]} stroke="#16a34a" />
                <Tooltip />
                <Legend />
                <Bar dataKey="energy" fill="#fbbf24" name="Energy Level" />
                <Bar dataKey="productivity" fill="#10b981" name="Productivity" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Daily Trends */}
      {dailyTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Performance Trends</CardTitle>
            <CardDescription>
              Track your productivity evolution over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="energy" 
                  stroke="hsl(var(--chart-1))" 
                  name="Energy Level"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="productivity" 
                  stroke="hsl(var(--chart-2))" 
                  name="Productivity"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="completionRate" 
                  stroke="hsl(var(--chart-3))" 
                  name="Completion %"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
