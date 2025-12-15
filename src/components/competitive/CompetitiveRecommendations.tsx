import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Target, TrendingUp, Users, Briefcase, BookOpen } from "lucide-react";

interface CompetitiveRecommendationsProps {
  data: any[];
}

export function CompetitiveRecommendations({ data }: CompetitiveRecommendationsProps) {
  if (!data || data.length === 0) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'skills': return BookOpen;
      case 'networking': return Users;
      case 'applications': return Briefcase;
      case 'personal_brand': return TrendingUp;
      default: return Target;
    }
  };

  // Group by priority
  const sortedRecommendations = [...data].sort((a, b) => {
    const priorityOrder: { [key: string]: number } = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          Competitive Advantage Recommendations
        </CardTitle>
        <CardDescription>Prioritized actions to strengthen your market position</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedRecommendations.map((rec, index) => {
            const CategoryIcon = getCategoryIcon(rec.category);
            return (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <CategoryIcon className="w-5 h-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{rec.action}</h4>
                      <p className="text-sm text-muted-foreground">{rec.expected_outcome}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge variant={getPriorityColor(rec.priority) as any}>
                      {rec.priority}
                    </Badge>
                    <Badge className={getEffortColor(rec.effort_level)}>
                      {rec.effort_level} effort
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-8">
                  <span className="text-xs text-muted-foreground">Category:</span>
                  <Badge variant="outline" className="text-xs">
                    {rec.category.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
