import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/layout/AppNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeTrackingWidget } from "@/components/productivity/TimeTrackingWidget";
import { TimeAllocationChart } from "@/components/productivity/TimeAllocationChart";
import { ProductivityPatterns } from "@/components/productivity/ProductivityPatterns";
import { BurnoutMonitoring } from "@/components/productivity/BurnoutMonitoring";
import { ProductivityInsights } from "@/components/productivity/ProductivityInsights";
import { TimeInvestmentAnalysis } from "@/components/productivity/TimeInvestmentAnalysis";
import { Clock, TrendingUp, AlertTriangle, Target, Code2, Users, Brain, ChevronRight, BookOpen } from "lucide-react";

export default function ProductivityAnalysis() {
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: timeEntries } = useQuery({
    queryKey: ['time-entries', user?.id, selectedPeriod],
    enabled: !!user?.id,
    queryFn: async () => {
      const startDate = new Date(Date.now() - selectedPeriod * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from('time_tracking_entries')
        .select('*')
        .eq('user_id', user!.id)
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: metrics } = useQuery({
    queryKey: ['productivity-metrics', user?.id, selectedPeriod],
    enabled: !!user?.id,
    queryFn: async () => {
      const startDate = new Date(Date.now() - selectedPeriod * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from('productivity_metrics')
        .select('*')
        .eq('user_id', user!.id)
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: insights } = useQuery({
    queryKey: ['productivity-insights', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('productivity_insights')
        .select('*')
        .eq('user_id', user!.id)
        .gte('valid_until', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const totalTime = timeEntries?.reduce((sum, entry) => sum + entry.duration_minutes, 0) || 0;
  const avgEnergy = timeEntries?.reduce((sum, entry) => sum + (entry.energy_level || 0), 0) / (timeEntries?.length || 1) || 0;
  const avgProductivity = timeEntries?.reduce((sum, entry) => sum + (entry.productivity_rating || 0), 0) / (timeEntries?.length || 1) || 0;

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Productivity Analysis</h1>
          <p className="text-muted-foreground">
            Track time investment and optimize your job search productivity
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.floor(totalTime / 60)}h {totalTime % 60}m</div>
              <p className="text-xs text-muted-foreground">Last {selectedPeriod} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Energy</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgEnergy.toFixed(1)}/5</div>
              <p className="text-xs text-muted-foreground">Energy level</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Productivity</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgProductivity.toFixed(1)}/5</div>
              <p className="text-xs text-muted-foreground">Self-rated</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activities</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timeEntries?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Tracked sessions</p>
            </CardContent>
          </Card>
        </div>

        {/* Time Tracking Widget */}
        <div className="mb-8">
          <TimeTrackingWidget />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="allocation">Time Allocation</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="burnout">Well-being</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <TimeInvestmentAnalysis 
              entries={timeEntries || []} 
              metrics={metrics || []}
              period={selectedPeriod}
            />
          </TabsContent>

          <TabsContent value="allocation" className="space-y-6">
            <TimeAllocationChart entries={timeEntries || []} />
          </TabsContent>

          <TabsContent value="patterns" className="space-y-6">
            <ProductivityPatterns 
              entries={timeEntries || []}
              metrics={metrics || []}
            />
          </TabsContent>

          <TabsContent value="burnout" className="space-y-6">
            <BurnoutMonitoring 
              entries={timeEntries || []}
              metrics={metrics || []}
            />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <ProductivityInsights 
              insights={insights || []}
              entries={timeEntries || []}
              metrics={metrics || []}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
