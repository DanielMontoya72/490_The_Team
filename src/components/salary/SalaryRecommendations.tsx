import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Lightbulb, Calendar, TrendingUp, Briefcase, Award, Users } from "lucide-react";

interface SalaryRecommendationsProps {
  recommendations?: Array<{
    priority: string;
    category: string;
    recommendation: string;
    expected_impact: string;
    timeline: string;
  }>;
  timingInsights?: {
    best_time_for_raise?: string;
    market_timing_score?: number;
    job_change_recommendation?: string;
    promotion_readiness?: string;
  };
  onSaveSnapshot: () => void;
  isSaving: boolean;
}

export function SalaryRecommendations({ 
  recommendations, 
  timingInsights,
  onSaveSnapshot,
  isSaving 
}: SalaryRecommendationsProps) {
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'skill_development':
        return <Award className="h-4 w-4" />;
      case 'negotiation':
        return <TrendingUp className="h-4 w-4" />;
      case 'job_change':
        return <Briefcase className="h-4 w-4" />;
      case 'promotion':
        return <TrendingUp className="h-4 w-4" />;
      case 'networking':
        return <Users className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {/* Timing Insights */}
      {timingInsights && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Optimal Timing Insights
                </CardTitle>
                <CardDescription>Strategic timing for career moves</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Market Timing Score</p>
                <p className="text-2xl font-bold text-primary">
                  {timingInsights.market_timing_score || 0}/100
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Best Time for Raise</p>
                <p className="text-sm text-muted-foreground">
                  {timingInsights.best_time_for_raise || 'Generate analysis for insights'}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Job Change Timing</p>
                <p className="text-sm text-muted-foreground">
                  {timingInsights.job_change_recommendation || 'Generate analysis for insights'}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg md:col-span-2">
                <p className="text-sm font-medium mb-1">Promotion Readiness</p>
                <p className="text-sm text-muted-foreground">
                  {timingInsights.promotion_readiness || 'Generate analysis for insights'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Advancement Recommendations
              </CardTitle>
              <CardDescription>AI-powered strategies for salary growth</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onSaveSnapshot}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Snapshot
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recommendations && recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {getCategoryIcon(rec.category)}
                      </div>
                      <div>
                        <p className="font-medium">{rec.recommendation}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {rec.expected_impact}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={getPriorityColor(rec.priority) as any}>
                        {rec.priority} priority
                      </Badge>
                      <span className="text-xs text-muted-foreground">{rec.timeline}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recommendations yet.</p>
              <p className="text-sm mt-1">Click "Generate Analysis" to get personalized recommendations.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
