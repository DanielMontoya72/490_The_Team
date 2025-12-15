import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, Users, CheckCircle, Heart, Award, Target, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";

export function ReferenceAnalytics() {
  const { data: references } = useQuery({
    queryKey: ["references-for-analytics"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("professional_references")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
  });

  const { data: requests } = useQuery({
    queryKey: ["requests-for-analytics"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("reference_requests")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data;
    },
  });

  const { data: appreciations } = useQuery({
    queryKey: ["appreciations-for-analytics"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("reference_appreciation")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics
  const totalReferences = references?.length || 0;
  const totalRequests = requests?.length || 0;
  const completedRequests = requests?.filter(r => r.request_status === "completed").length || 0;
  const positiveOutcomes = requests?.filter(r => r.outcome === "positive").length || 0;
  const thankYousSent = requests?.filter(r => r.thank_you_sent).length || 0;
  const totalAppreciations = appreciations?.length || 0;

  const successRate = totalRequests > 0 ? Math.round((positiveOutcomes / completedRequests) * 100) || 0 : 0;
  const completionRate = totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0;
  const thankYouRate = totalRequests > 0 ? Math.round((thankYousSent / totalRequests) * 100) : 0;

  // Reference strength distribution
  const strengthDistribution = references?.reduce((acc, ref) => {
    acc[ref.reference_strength] = (acc[ref.reference_strength] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Reference type distribution
  const typeDistribution = references?.reduce((acc, ref) => {
    acc[ref.relationship_type] = (acc[ref.relationship_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Most used references
  const topReferences = [...(references || [])]
    .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    .slice(0, 5);

  // References needing attention (not contacted in 90+ days)
  const needsAttention = references?.filter(ref => {
    if (!ref.last_contacted_at) return true;
    return differenceInDays(new Date(), new Date(ref.last_contacted_at)) > 90;
  }) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Reference Analytics</h2>
        <p className="text-muted-foreground">Track reference usage and impact on your applications</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total References</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReferences}</div>
            <p className="text-xs text-muted-foreground">Active references in your network</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {positiveOutcomes} positive outcomes from {completedRequests} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests}</div>
            <Progress value={completionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{completionRate}% completion rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appreciation Sent</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAppreciations}</div>
            <p className="text-xs text-muted-foreground">
              {thankYouRate}% thank you rate after requests
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Reference Strength Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Reference Strength
            </CardTitle>
            <CardDescription>Distribution by relationship strength</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(strengthDistribution).map(([strength, count]) => (
              <div key={strength} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={strength === "strong" ? "default" : "secondary"} className="capitalize">
                    {strength}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={(count / totalReferences) * 100} className="w-24" />
                  <span className="text-sm font-medium w-8">{count}</span>
                </div>
              </div>
            ))}
            {Object.keys(strengthDistribution).length === 0 && (
              <p className="text-sm text-muted-foreground">No references yet</p>
            )}
          </CardContent>
        </Card>

        {/* Reference Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Reference Types
            </CardTitle>
            <CardDescription>Distribution by relationship type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(typeDistribution).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="capitalize">{type}</span>
                <div className="flex items-center gap-2">
                  <Progress value={(count / totalReferences) * 100} className="w-24" />
                  <span className="text-sm font-medium w-8">{count}</span>
                </div>
              </div>
            ))}
            {Object.keys(typeDistribution).length === 0 && (
              <p className="text-sm text-muted-foreground">No references yet</p>
            )}
          </CardContent>
        </Card>

        {/* Most Used References */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Most Used References
            </CardTitle>
            <CardDescription>Your most frequently requested references</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topReferences.map((ref, index) => (
                <div key={ref.id} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{ref.reference_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {ref.reference_title || ref.reference_company || "No title"}
                    </div>
                  </div>
                  <Badge variant="secondary">{ref.usage_count || 0} uses</Badge>
                </div>
              ))}
              {topReferences.length === 0 && (
                <p className="text-sm text-muted-foreground">No references used yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* References Needing Attention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Needs Attention
            </CardTitle>
            <CardDescription>References not contacted in 90+ days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {needsAttention.slice(0, 5).map((ref) => (
                <div key={ref.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div>
                    <div className="font-medium">{ref.reference_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {ref.last_contacted_at
                        ? `Last contact: ${format(new Date(ref.last_contacted_at), "MMM d, yyyy")}`
                        : "Never contacted"}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-yellow-600">
                    Reconnect
                  </Badge>
                </div>
              ))}
              {needsAttention.length === 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">All references are up to date!</span>
                </div>
              )}
              {needsAttention.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  +{needsAttention.length - 5} more need attention
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Impact Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Reference Impact Summary</CardTitle>
          <CardDescription>How references have contributed to your job search success</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-primary">{totalRequests}</div>
              <div className="text-sm text-muted-foreground">Total Reference Requests</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-green-600">{positiveOutcomes}</div>
              <div className="text-sm text-muted-foreground">Positive Outcomes</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{successRate}%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
