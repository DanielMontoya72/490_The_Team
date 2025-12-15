import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Video, Phone, Building2, Users } from "lucide-react";

interface FormatComparisonProps {
  data: any;
}

const formatIcons: Record<string, any> = {
  'video': Video,
  'phone': Phone,
  'in-person': Building2,
  'panel': Users,
};

export function FormatComparison({ data }: FormatComparisonProps) {
  const interviews = data?.interviews || [];
  
  const byFormat: Record<string, { total: number; offers: number }> = {};
  
  interviews.forEach((interview: any) => {
    const format = interview.interview_type || 'Other';
    if (!byFormat[format]) {
      byFormat[format] = { total: 0, offers: 0 };
    }
    byFormat[format].total++;
    // Count successful outcomes (offer, accepted, hired, etc.)
    const outcome = interview.outcome?.toLowerCase() || '';
    if (outcome === 'offer' || outcome === 'accepted' || outcome === 'hired' || outcome === 'passed' || outcome === 'success') {
      byFormat[format].offers++;
    }
  });
  
  const formatStats = Object.entries(byFormat)
    .map(([format, stats]) => ({
      name: format,
      rate: stats.total > 0 ? (stats.offers / stats.total) * 100 : 0,
      total: stats.total,
      offers: stats.offers
    }))
    .sort((a, b) => b.rate - a.rate);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance by Interview Format</CardTitle>
        <CardDescription>
          How you perform across different interview formats
        </CardDescription>
      </CardHeader>
      <CardContent>
        {formatStats.length > 0 ? (
          <div className="space-y-4">
            {formatStats.map((stat) => {
              const Icon = formatIcons[stat.name.toLowerCase()] || Building2;
              return (
                <div key={stat.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium capitalize">{stat.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {stat.rate.toFixed(0)}% ({stat.offers}/{stat.total})
                    </span>
                  </div>
                  <Progress value={stat.rate} className="h-2" />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No interview data available yet. Complete some interviews to see format comparisons.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
