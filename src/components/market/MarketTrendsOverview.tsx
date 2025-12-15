import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, AlertTriangle, Briefcase, Star } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MarketTrend {
  id: string;
  industry: string;
  location: string | null;
  trend_type: string;
  trend_data: any;
  analysis_date: string;
  is_favorited?: boolean;
}

interface MarketTrendsOverviewProps {
  trends: MarketTrend[];
}

export function MarketTrendsOverview({ trends }: MarketTrendsOverviewProps) {
  const queryClient = useQueryClient();

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, isFavorited }: { id: string; isFavorited: boolean }) => {
      const { error } = await supabase
        .from('market_trends')
        .update({ 
          is_favorited: !isFavorited,
          favorited_at: !isFavorited ? new Date().toISOString() : null
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-trends'] });
    }
  });

  const jobDemandTrends = trends.filter(t => t.trend_type === 'job_demand');
  const salaryTrends = trends.filter(t => t.trend_type === 'salary');
  const disruptionTrends = trends.filter(t => t.trend_type === 'disruption');

  if (!trends || trends.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Generate market intelligence to see industry trends
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderFavoriteButton = (trend: MarketTrend) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => toggleFavorite.mutate({ id: trend.id, isFavorited: trend.is_favorited || false })}
      disabled={toggleFavorite.isPending}
    >
      <Star className={`h-4 w-4 ${trend.is_favorited ? 'fill-yellow-500 text-yellow-500' : ''}`} />
    </Button>
  );

  return (
    <div className="space-y-4">
      {/* Job Demand Trends */}
      {jobDemandTrends.map((trend) => (
        <Card key={trend.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <CardTitle>Job Market Demand - {trend.industry}</CardTitle>
              </div>
              {renderFavoriteButton(trend)}
            </div>
            <CardDescription>
              {trend.location || 'Global'} • Updated {new Date(trend.analysis_date).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {trend.trend_data?.growth_rate && (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-sm font-medium mb-1">Market Growth Rate</p>
                <p className="text-2xl font-bold text-green-500">+{trend.trend_data.growth_rate}%</p>
              </div>
            )}

            {trend.trend_data?.hot_roles && Array.isArray(trend.trend_data.hot_roles) && (
              <div>
                <p className="text-sm font-medium mb-2">🔥 Hot Roles</p>
                <div className="flex flex-wrap gap-2">
                  {trend.trend_data.hot_roles.map((role: string, idx: number) => (
                    <Badge key={idx} className="bg-green-500">{role}</Badge>
                  ))}
                </div>
              </div>
            )}

            {trend.trend_data?.declining_roles && Array.isArray(trend.trend_data.declining_roles) && trend.trend_data.declining_roles.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">📉 Declining Roles</p>
                <div className="flex flex-wrap gap-2">
                  {trend.trend_data.declining_roles.map((role: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-red-500">{role}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Salary Trends */}
      {salaryTrends.map((trend) => (
        <Card key={trend.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <CardTitle>Salary Trends - {trend.industry}</CardTitle>
              </div>
              {renderFavoriteButton(trend)}
            </div>
            <CardDescription>
              {trend.location || 'Global'} • Updated {new Date(trend.analysis_date).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {trend.trend_data?.average_growth && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm font-medium mb-1">Average Salary Growth</p>
                <p className="text-2xl font-bold text-blue-500">+{trend.trend_data.average_growth}%</p>
              </div>
            )}

            {trend.trend_data?.high_paying_roles && Array.isArray(trend.trend_data.high_paying_roles) && (
              <div>
                <p className="text-sm font-medium mb-2">💰 Top Paying Roles</p>
                <div className="space-y-2">
                  {trend.trend_data.high_paying_roles.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="font-medium">{item.role}</span>
                      <span className="text-green-500 font-bold">${item.salary?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Disruption Trends */}
      {disruptionTrends.map((trend) => (
        <Card key={trend.id} className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <CardTitle>Industry Disruption & Competitive Landscape - {trend.industry}</CardTitle>
              </div>
              {renderFavoriteButton(trend)}
            </div>
            <CardDescription>
              {trend.location || 'Global'} • Updated {new Date(trend.analysis_date).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {trend.trend_data?.emerging_technologies && Array.isArray(trend.trend_data.emerging_technologies) && (
              <div>
                <p className="text-sm font-medium mb-2">🚀 Emerging Technologies</p>
                <div className="flex flex-wrap gap-2">
                  {trend.trend_data.emerging_technologies.map((tech: string, idx: number) => (
                    <Badge key={idx} className="bg-purple-500">{tech}</Badge>
                  ))}
                </div>
              </div>
            )}

            {trend.trend_data?.market_shifts && (
              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <p className="text-sm font-medium mb-1">📊 Market Shifts & Timing</p>
                <p className="text-sm text-muted-foreground">{trend.trend_data.market_shifts}</p>
              </div>
            )}

            {trend.trend_data?.competitive_landscape && (
              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <p className="text-sm font-medium mb-1">🎯 Competitive Landscape Analysis</p>
                <p className="text-sm text-muted-foreground">{trend.trend_data.competitive_landscape}</p>
              </div>
            )}

            {trend.trend_data?.future_outlook && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm font-medium mb-1">🔮 Future Outlook & Opportunities</p>
                <p className="text-sm text-muted-foreground">{trend.trend_data.future_outlook}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
