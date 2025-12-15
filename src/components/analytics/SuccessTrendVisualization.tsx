import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar 
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Activity, Calendar } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";

export function SuccessTrendVisualization() {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["success-trends-jobs"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const successfulStatuses = ["Offer Received", "Accepted"];
  const interviewStatuses = ["Interview Scheduled", "Interviewing", "Offer Received", "Accepted"];

  // Generate monthly trend data
  const generateMonthlyTrends = () => {
    const monthlyData: any[] = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      
      const monthJobs = jobs.filter(job => {
        const jobDate = parseISO(job.created_at);
        return isWithinInterval(jobDate, { start: monthStart, end: monthEnd });
      });
      
      const applied = monthJobs.filter(j => j.status !== "Interested").length;
      const interviews = monthJobs.filter(j => interviewStatuses.includes(j.status)).length;
      const offers = monthJobs.filter(j => successfulStatuses.includes(j.status)).length;
      
      monthlyData.push({
        month: format(monthStart, "MMM yyyy"),
        shortMonth: format(monthStart, "MMM"),
        applications: applied,
        interviews,
        offers,
        interviewRate: applied > 0 ? (interviews / applied) * 100 : 0,
        successRate: applied > 0 ? (offers / applied) * 100 : 0,
      });
    }
    
    return monthlyData;
  };

  const monthlyTrends = generateMonthlyTrends();

  // Calculate improvement metrics
  const calculateImprovement = () => {
    if (monthlyTrends.length < 2) return { trend: "neutral", percentage: 0 };
    
    const recentMonths = monthlyTrends.slice(-3);
    const olderMonths = monthlyTrends.slice(0, 3);
    
    const recentAvg = recentMonths.reduce((sum, m) => sum + m.interviewRate, 0) / recentMonths.length;
    const olderAvg = olderMonths.reduce((sum, m) => sum + m.interviewRate, 0) / olderMonths.length;
    
    if (olderAvg === 0) return { trend: "neutral", percentage: 0 };
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (change > 5) return { trend: "up", percentage: change };
    if (change < -5) return { trend: "down", percentage: Math.abs(change) };
    return { trend: "neutral", percentage: Math.abs(change) };
  };

  const improvement = calculateImprovement();

  // Weekly rolling average
  const calculateWeeklyAverage = () => {
    const weeklyData: any[] = [];
    const sortedJobs = [...jobs].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    for (let i = 9; i < sortedJobs.length; i++) {
      const windowJobs = sortedJobs.slice(i - 9, i + 1);
      const applied = windowJobs.filter(j => j.status !== "Interested").length;
      const interviews = windowJobs.filter(j => interviewStatuses.includes(j.status)).length;
      
      weeklyData.push({
        index: i - 9,
        date: format(parseISO(sortedJobs[i].created_at), "MMM d"),
        rollingInterviewRate: applied > 0 ? (interviews / applied) * 100 : 0,
        applications: 1,
      });
    }
    
    return weeklyData;
  };

  const rollingAverage = calculateWeeklyAverage();

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      {/* Improvement Summary */}
      <Card className={`bg-gradient-to-br ${
        improvement.trend === "up" ? "from-green-500/10 to-emerald-500/10 border-green-500/20" :
        improvement.trend === "down" ? "from-red-500/10 to-rose-500/10 border-red-500/20" :
        "from-muted/50 to-muted"
      }`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {improvement.trend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
            {improvement.trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
            {improvement.trend === "neutral" && <Minus className="h-4 w-4 text-muted-foreground" />}
            Performance Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold">
              {improvement.trend === "up" && "+"}
              {improvement.trend === "down" && "-"}
              {improvement.percentage.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              {improvement.trend === "up" && "Your interview rate is improving!"}
              {improvement.trend === "down" && "Your interview rate has declined. Review your strategy."}
              {improvement.trend === "neutral" && "Your performance is stable."}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Performance Trends
          </CardTitle>
          <CardDescription>
            Track your application success over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyTrends.some(m => m.applications > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="shortMonth" className="text-xs" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))' 
                  }} 
                />
                <Legend />
                <Bar yAxisId="left" dataKey="applications" fill="hsl(var(--muted-foreground))" name="Applications" opacity={0.3} />
                <Bar yAxisId="left" dataKey="interviews" fill="hsl(var(--primary))" name="Interviews" />
                <Bar yAxisId="left" dataKey="offers" fill="hsl(var(--chart-2))" name="Offers" />
                <Line yAxisId="right" type="monotone" dataKey="interviewRate" stroke="hsl(var(--chart-3))" name="Interview Rate %" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No application data yet. Start applying to see trends!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rolling Average Chart */}
      {rollingAverage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              10-Application Rolling Average
            </CardTitle>
            <CardDescription>
              Smoothed interview rate trend across your applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={rollingAverage}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))' 
                  }} 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, "Interview Rate"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="rollingInterviewRate" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Over Time */}
      <div className="grid gap-4 md:grid-cols-3">
        {monthlyTrends.slice(-3).reverse().map((month, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{month.month}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applications</span>
                  <span className="font-medium">{month.applications}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interviews</span>
                  <span className="font-medium">{month.interviews}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interview Rate</span>
                  <Badge variant={month.interviewRate > 20 ? "default" : "secondary"}>
                    {month.interviewRate.toFixed(0)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
