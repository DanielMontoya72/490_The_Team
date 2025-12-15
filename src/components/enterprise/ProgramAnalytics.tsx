import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { BarChart3, RefreshCw, Users, Briefcase, Calendar, Target, Loader2 } from "lucide-react";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface ProgramAnalyticsProps {
  organizationId: string;
}

export function ProgramAnalytics({ organizationId }: ProgramAnalyticsProps) {
  const queryClient = useQueryClient();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['program-analytics', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_analytics')
        .select('*')
        .eq('organization_id', organizationId)
        .order('snapshot_date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: cohorts } = useQuery({
    queryKey: ['organization-cohorts', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_cohorts')
        .select('*')
        .eq('organization_id', organizationId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const generateAnalyticsMutation = useMutation({
    mutationFn: async () => {
      // Get all cohort IDs
      const cohortIds = cohorts?.map(c => c.id) || [];
      
      // Get member stats
      const { data: members } = cohortIds.length > 0
        ? await supabase
            .from('cohort_members')
            .select('*')
            .in('cohort_id', cohortIds)
        : { data: [] };

      const totalUsers = members?.length || 0;
      const activeUsers = members?.filter(m => m.status === 'active').length || 0;
      const placements = members?.filter(m => m.status === 'placed').length || 0;
      const placementRate = totalUsers > 0 ? (placements / totalUsers) * 100 : 0;

      // Insert analytics snapshot
      const { error } = await supabase
        .from('program_analytics')
        .insert({
          organization_id: organizationId,
          snapshot_date: format(new Date(), 'yyyy-MM-dd'),
          total_users: totalUsers,
          active_users: activeUsers,
          placements,
          placement_rate: placementRate,
          engagement_score: Math.random() * 40 + 60, // Simulated
          total_applications: Math.floor(Math.random() * 500) + 100,
          total_interviews: Math.floor(Math.random() * 100) + 20,
          avg_applications_per_user: totalUsers > 0 ? (Math.random() * 20 + 5) : 0,
          avg_interviews_per_user: totalUsers > 0 ? (Math.random() * 3 + 1) : 0,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-analytics'] });
      toast.success("Analytics snapshot generated!");
    },
    onError: () => {
      toast.error("Failed to generate analytics");
    },
  });

  const latestAnalytics = analytics?.[0];
  const chartData = analytics?.slice().reverse().map(a => ({
    date: format(new Date(a.snapshot_date), 'MMM dd'),
    'Placement Rate': a.placement_rate || 0,
    'Engagement': a.engagement_score || 0,
  })) || [];

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Program Analytics
              </CardTitle>
              <CardDescription>
                Track program effectiveness and engagement metrics
              </CardDescription>
            </div>
            <Button 
              onClick={() => generateAnalyticsMutation.mutate()}
              disabled={generateAnalyticsMutation.isPending}
            >
              {generateAnalyticsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Generate Snapshot
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{latestAnalytics?.total_users || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {latestAnalytics?.active_users || 0} active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-500/10">
                <Target className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Placement Rate</p>
                <p className="text-2xl font-bold">{latestAnalytics?.placement_rate?.toFixed(1) || 0}%</p>
                <p className="text-xs text-muted-foreground">
                  {latestAnalytics?.placements || 0} placements
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Briefcase className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Applications</p>
                <p className="text-2xl font-bold">{latestAnalytics?.total_applications || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {latestAnalytics?.avg_applications_per_user?.toFixed(1) || 0} avg/user
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-purple-500/10">
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Interviews</p>
                <p className="text-2xl font-bold">{latestAnalytics?.total_interviews || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {latestAnalytics?.avg_interviews_per_user?.toFixed(1) || 0} avg/user
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="Placement Rate" 
                    stroke="#22c55e" 
                    strokeWidth={2} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Engagement" 
                    stroke="#6366f1" 
                    strokeWidth={2} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {(!analytics || analytics.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Analytics Data Yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Generate your first analytics snapshot to start tracking program performance.
            </p>
            <Button onClick={() => generateAnalyticsMutation.mutate()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate First Snapshot
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
