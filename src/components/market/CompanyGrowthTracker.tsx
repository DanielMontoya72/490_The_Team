import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, TrendingUp, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CompanyGrowth {
  id: string;
  company_name: string;
  industry: string;
  growth_indicators: any;
  hiring_activity: string;
  recent_news: any;
  opportunity_score: number;
  analysis_date: string;
  is_favorited?: boolean;
}

interface CompanyGrowthTrackerProps {
  companies: CompanyGrowth[];
}

export function CompanyGrowthTracker({ companies }: CompanyGrowthTrackerProps) {
  const queryClient = useQueryClient();

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, isFavorited }: { id: string; isFavorited: boolean }) => {
      const { error } = await supabase
        .from('company_growth_tracking')
        .update({ 
          is_favorited: !isFavorited,
          favorited_at: !isFavorited ? new Date().toISOString() : null
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-growth'] });
    }
  });

  const getActivityColor = (activity: string) => {
    switch (activity) {
      case 'high': return 'bg-green-500';
      case 'moderate': return 'bg-yellow-500';
      case 'low': return 'bg-orange-500';
      case 'declining': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!companies || companies.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No company growth data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {companies.map((company) => (
        <Card key={company.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {company.company_name}
                </CardTitle>
                <CardDescription className="mt-1">
                  {company.industry} • Analyzed {new Date(company.analysis_date).toLocaleDateString()}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFavorite.mutate({ id: company.id, isFavorited: company.is_favorited || false })}
                  disabled={toggleFavorite.isPending}
                >
                  <Star className={`h-4 w-4 ${company.is_favorited ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                </Button>
                <Badge className={getActivityColor(company.hiring_activity)}>
                  {company.hiring_activity} hiring
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Opportunity Score</span>
                <span className="font-medium">{Math.round(company.opportunity_score * 100)}%</span>
              </div>
              <Progress value={company.opportunity_score * 100} className="h-2" />
            </div>

            {company.growth_indicators && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(company.growth_indicators).map(([key, value]) => (
                  <div key={key} className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground capitalize">
                      {key.replace('_', ' ')}
                    </p>
                    <p className="text-sm font-semibold">
                      {typeof value === 'number' ? `${value}%` : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {company.recent_news && Array.isArray(company.recent_news) && company.recent_news.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Recent News & Updates
                </p>
                <div className="space-y-2">
                  {company.recent_news.map((news: any, idx: number) => (
                    <div key={idx} className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <p className="text-sm font-medium">{news.title || news.headline}</p>
                      {news.summary && (
                        <p className="text-xs text-muted-foreground mt-1">{news.summary}</p>
                      )}
                    </div>
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
