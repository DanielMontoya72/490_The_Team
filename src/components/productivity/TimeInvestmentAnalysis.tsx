import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Trophy, Target, TrendingUp } from "lucide-react";

interface TimeInvestmentAnalysisProps {
  entries: any[];
  metrics: any[];
  period: number;
}

export function TimeInvestmentAnalysis({ entries, metrics, period }: TimeInvestmentAnalysisProps) {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch job outcomes
  const { data: jobs } = useQuery({
    queryKey: ['jobs-outcomes', user?.id, period],
    enabled: !!user?.id,
    queryFn: async () => {
      const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from('jobs')
        .select('status, created_at')
        .eq('user_id', user!.id)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;
      return data;
    },
  });

  // Calculate time investment by activity
  const timeByActivity = entries.reduce((acc: any, entry) => {
    acc[entry.activity_type] = (acc[entry.activity_type] || 0) + entry.duration_minutes;
    return acc;
  }, {});

  // Calculate outcomes (case-insensitive matching)
  const outcomes = {
    applications: jobs?.filter(j => (j.status || '').toLowerCase() !== 'interested').length || 0,
    interviews: jobs?.filter(j => {
      const status = (j.status || '').toLowerCase();
      return ['phone screen', 'phone_screen', 'interview', 'first_interview', 'second_interview', 'final_interview'].includes(status);
    }).length || 0,
    offers: jobs?.filter(j => {
      const status = (j.status || '').toLowerCase();
      return status === 'offer' || status === 'offer received' || status === 'offer_received' || status === 'accepted';
    }).length || 0,
  };

  // Efficiency metrics
  const totalTimeHours = entries.reduce((sum, e) => sum + e.duration_minutes, 0) / 60;
  const timePerApplication = totalTimeHours / (outcomes.applications || 1);
  const applicationRate = (outcomes.applications / totalTimeHours) || 0;
  const interviewRate = (outcomes.interviews / (outcomes.applications || 1)) * 100;

  // Weekly breakdown
  const weeklyData = metrics.reduce((acc: any, metric) => {
    const week = `Week ${Math.floor((Date.now() - new Date(metric.metric_date).getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
    if (!acc[week]) {
      acc[week] = { week, timeHours: 0, outcomes: 0 };
    }
    acc[week].timeHours += (metric.total_time_minutes || 0) / 60;
    return acc;
  }, {});

  const weeklyChart = Object.values(weeklyData).reverse().slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Efficiency Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time per Application</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timePerApplication.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Average time investment per application
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Application Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applicationRate.toFixed(1)}/hr</div>
            <p className="text-xs text-muted-foreground">
              Applications per hour worked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interview Rate</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interviewRate.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">
              Applications to interviews conversion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Outcome Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Time Investment vs. Outcomes</CardTitle>
          <CardDescription>
            Compare your time investment with tangible results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-3xl font-bold text-primary">{outcomes.applications}</div>
              <p className="text-sm text-muted-foreground">Applications</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-3xl font-bold text-primary">{outcomes.interviews}</div>
              <p className="text-sm text-muted-foreground">Interviews</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-3xl font-bold text-primary">{outcomes.offers}</div>
              <p className="text-sm text-muted-foreground">Offers</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Total time invested:</span>
              <span className="font-medium">{totalTimeHours.toFixed(1)} hours</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Efficiency score:</span>
              <span className="font-medium">
                {((outcomes.applications + outcomes.interviews * 2 + outcomes.offers * 5) / totalTimeHours).toFixed(1)} pts/hr
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Trends */}
      {weeklyChart.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Time Investment</CardTitle>
            <CardDescription>
              Track your effort consistency over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="timeHours" fill="hsl(var(--primary))" name="Hours Invested" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
