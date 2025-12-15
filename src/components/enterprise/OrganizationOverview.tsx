import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Target, TrendingUp, Calendar, Award } from "lucide-react";

interface OrganizationOverviewProps {
  organization: any;
}

export function OrganizationOverview({ organization }: OrganizationOverviewProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['organization-stats', organization?.id],
    queryFn: async () => {
      // Get cohorts
      const { data: cohorts } = await supabase
        .from('organization_cohorts')
        .select('*')
        .eq('organization_id', organization.id);

      // Get all cohort members
      const cohortIds = cohorts?.map(c => c.id) || [];
      const { data: members } = cohortIds.length > 0 
        ? await supabase
            .from('cohort_members')
            .select('*')
            .in('cohort_id', cohortIds)
        : { data: [] };

      // Get latest analytics
      const { data: analytics } = await supabase
        .from('program_analytics')
        .select('*')
        .eq('organization_id', organization.id)
        .order('snapshot_date', { ascending: false })
        .limit(1);

      // Get outcomes
      const { data: outcomes } = await supabase
        .from('program_outcomes')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const activeCohorts = cohorts?.filter(c => c.status === 'active').length || 0;
      const totalMembers = members?.length || 0;
      const placedMembers = members?.filter(m => m.status === 'placed').length || 0;
      const placementRate = totalMembers > 0 ? Math.round((placedMembers / totalMembers) * 100) : 0;

      return {
        totalCohorts: cohorts?.length || 0,
        activeCohorts,
        totalMembers,
        placedMembers,
        placementRate,
        latestAnalytics: analytics?.[0],
        latestOutcomes: outcomes?.[0],
      };
    },
    enabled: !!organization?.id,
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const getOrgTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      university: '🎓 University/College',
      bootcamp: '💻 Bootcamp',
      staffing_agency: '🏢 Staffing Agency',
      nonprofit: '❤️ Nonprofit',
      corporate: '🏛️ Corporate',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Organization Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {organization?.organization_name}
              </CardTitle>
              <CardDescription className="mt-1">
                {organization?.website_url && (
                  <a href={organization.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {organization.website_url}
                  </a>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{getOrgTypeLabel(organization?.organization_type)}</Badge>
              <Badge variant={organization?.is_active ? "default" : "secondary"}>
                {organization?.is_active ? "Active" : "Inactive"}
              </Badge>
              <Badge className="capitalize">{organization?.subscription_tier}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Contact:</span>
              <span>{organization?.contact_email}</span>
              {organization?.contact_phone && <span>• {organization.contact_phone}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Max Users:</span>
              <span>{organization?.max_users}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats?.totalMembers || 0}</p>
                <p className="text-xs text-muted-foreground">
                  across {stats?.totalCohorts || 0} cohorts
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
                <p className="text-2xl font-bold">{stats?.placementRate || 0}%</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.placedMembers || 0} placed
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
                <p className="text-sm text-muted-foreground">Active Cohorts</p>
                <p className="text-2xl font-bold">{stats?.activeCohorts || 0}</p>
                <p className="text-xs text-muted-foreground">
                  currently running
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Award className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Engagement</p>
                <p className="text-2xl font-bold">
                  {stats?.latestAnalytics?.engagement_score?.toFixed(0) || '--'}%
                </p>
                <p className="text-xs text-muted-foreground">
                  average score
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
              <Users className="h-6 w-6 text-primary mb-2" />
              <h4 className="font-medium">Create Cohort</h4>
              <p className="text-sm text-muted-foreground">Start a new job seeker program</p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
              <TrendingUp className="h-6 w-6 text-green-500 mb-2" />
              <h4 className="font-medium">View Reports</h4>
              <p className="text-sm text-muted-foreground">Generate program effectiveness reports</p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
              <Building2 className="h-6 w-6 text-purple-500 mb-2" />
              <h4 className="font-medium">Bulk Import</h4>
              <p className="text-sm text-muted-foreground">Onboard users via CSV</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
