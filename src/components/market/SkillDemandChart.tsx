import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, Sparkles, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SkillTrend {
  id: string;
  skill_name: string;
  industry: string;
  demand_score: number;
  growth_rate: number;
  market_saturation: number;
  average_salary: number;
  trend_direction: string;
  related_skills: any;
  is_favorited: boolean;
}

interface SkillDemandChartProps {
  skillTrends: SkillTrend[];
}

export function SkillDemandChart({ skillTrends }: SkillDemandChartProps) {
  const queryClient = useQueryClient();

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, isFavorited }: { id: string; isFavorited: boolean }) => {
      const { error } = await supabase
        .from('skill_demand_trends')
        .update({ 
          is_favorited: !isFavorited,
          favorited_at: !isFavorited ? new Date().toISOString() : null
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-demand-trends'] });
    }
  });

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'rising':
      case 'emerging':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'rising':
        return 'bg-green-500';
      case 'emerging':
        return 'bg-blue-500';
      case 'declining':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  if (!skillTrends || skillTrends.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Generate market intelligence to see skill demand trends
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {skillTrends.map((trend) => (
        <Card key={trend.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  {trend.skill_name}
                  {getTrendIcon(trend.trend_direction)}
                </CardTitle>
                <CardDescription className="mt-1">
                  {trend.industry} • Demand Score: {trend.demand_score}/100
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFavorite.mutate({ id: trend.id, isFavorited: trend.is_favorited })}
                >
                  <Star className={`h-4 w-4 ${trend.is_favorited ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                </Button>
                <Badge className={getTrendColor(trend.trend_direction)}>
                  {trend.trend_direction}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Market Demand</span>
                <span className="font-medium">{trend.demand_score}%</span>
              </div>
              <Progress value={trend.demand_score} className="h-2" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Growth Rate</p>
                <p className="font-semibold text-green-500">+{trend.growth_rate}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Salary</p>
                <p className="font-semibold">
                  ${trend.average_salary ? trend.average_salary.toLocaleString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Market Saturation</p>
                <p className="font-semibold">{Math.round(trend.market_saturation * 100)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Job Postings</p>
                <p className="font-semibold">{trend.related_skills?.length || 0} related</p>
              </div>
            </div>

            {trend.related_skills && Array.isArray(trend.related_skills) && trend.related_skills.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Related Skills in Demand:</p>
                <div className="flex flex-wrap gap-2">
                  {trend.related_skills.map((skill: string, idx: number) => (
                    <Badge key={idx} variant="outline">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
