import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";

interface StrategyInsightsProps {
  data: any;
}

export function StrategyInsights({ data }: StrategyInsightsProps) {
  const interviews = data?.interviews || [];
  const predictions = data?.predictions || [];
  const mockSessions = data?.mockSessions || [];
  
  const insights: Array<{ type: 'success' | 'warning' | 'tip'; title: string; description: string }> = [];
  
  // Success rate insights (case-insensitive matching)
  const totalInterviews = interviews.length;
  const offers = interviews.filter((i: any) => {
    const outcome = (i.outcome || '').toLowerCase();
    return outcome === 'offer' || outcome === 'accepted' || outcome === 'passed' || outcome === 'hired' || outcome === 'success';
  }).length;
  const conversionRate = totalInterviews > 0 ? (offers / totalInterviews) * 100 : 0;
  
  if (conversionRate >= 30) {
    insights.push({
      type: 'success',
      title: 'Strong Conversion Rate',
      description: `Your ${conversionRate.toFixed(0)}% interview-to-offer rate is above industry average (20-25%). Keep up the great work!`
    });
  } else if (conversionRate > 0 && conversionRate < 20) {
    insights.push({
      type: 'warning',
      title: 'Conversion Rate Below Average',
      description: `Your ${conversionRate.toFixed(0)}% rate is below the 20-25% industry benchmark. Focus on interview preparation and practice.`
    });
  }
  
  // Practice correlation
  const practiceCount = mockSessions.length;
  if (practiceCount >= 5 && conversionRate > 25) {
    insights.push({
      type: 'success',
      title: 'Practice Pays Off',
      description: `You've completed ${practiceCount} practice sessions and it shows! Your conversion rate indicates strong preparation.`
    });
  } else if (practiceCount < 3 && totalInterviews > 5) {
    insights.push({
      type: 'tip',
      title: 'More Practice Recommended',
      description: 'Candidates who complete 5+ mock interviews see 40% higher success rates. Consider adding more practice sessions.'
    });
  }
  
  // Format-specific insights (case-insensitive matching)
  const formatStats: Record<string, { total: number; offers: number }> = {};
  interviews.forEach((i: any) => {
    const format = i.interview_type || 'other';
    if (!formatStats[format]) formatStats[format] = { total: 0, offers: 0 };
    formatStats[format].total++;
    const outcome = (i.outcome || '').toLowerCase();
    if (outcome === 'offer' || outcome === 'accepted' || outcome === 'passed' || outcome === 'hired' || outcome === 'success') {
      formatStats[format].offers++;
    }
  });
  
  const bestFormat = Object.entries(formatStats)
    .map(([format, stats]) => ({ format, rate: stats.total > 0 ? (stats.offers / stats.total) * 100 : 0, total: stats.total }))
    .filter(f => f.total >= 2)
    .sort((a, b) => b.rate - a.rate)[0];
  
  if (bestFormat && bestFormat.rate > 40) {
    insights.push({
      type: 'success',
      title: `Excel at ${bestFormat.format} Interviews`,
      description: `Your ${bestFormat.rate.toFixed(0)}% success rate in ${bestFormat.format} interviews is excellent. Consider prioritizing opportunities with this format.`
    });
  }
  
  // Prediction accuracy
  const completedPredictions = predictions.filter((p: any) => p.actual_outcome);
  if (completedPredictions.length >= 3) {
    const accurate = completedPredictions.filter((p: any) => {
      const predicted = p.overall_probability > 60 ? 'positive' : 'negative';
      const actual = ['offer', 'accepted'].includes(p.actual_outcome) ? 'positive' : 'negative';
      return predicted === actual;
    }).length;
    const accuracy = (accurate / completedPredictions.length) * 100;
    
    if (accuracy >= 70) {
      insights.push({
        type: 'success',
        title: 'Reliable Self-Assessment',
        description: `Your interview predictions are ${accuracy.toFixed(0)}% accurate, showing strong self-awareness of your performance.`
      });
    }
  }
  
  // Company size patterns (case-insensitive matching)
  const companySizeStats: Record<string, { total: number; offers: number }> = {};
  interviews.forEach((i: any) => {
    const size = i.jobs?.company_size || 'unknown';
    if (!companySizeStats[size]) companySizeStats[size] = { total: 0, offers: 0 };
    companySizeStats[size].total++;
    const outcome = (i.outcome || '').toLowerCase();
    if (outcome === 'offer' || outcome === 'accepted' || outcome === 'passed' || outcome === 'hired' || outcome === 'success') {
      companySizeStats[size].offers++;
    }
  });
  
  const bestSize = Object.entries(companySizeStats)
    .map(([size, stats]) => ({ size, rate: stats.total > 0 ? (stats.offers / stats.total) * 100 : 0, total: stats.total }))
    .filter(s => s.total >= 2)
    .sort((a, b) => b.rate - a.rate)[0];
  
  if (bestSize && bestSize.rate > 35) {
    insights.push({
      type: 'tip',
      title: `Strong Fit with ${bestSize.size} Companies`,
      description: `Your ${bestSize.rate.toFixed(0)}% success rate suggests you interview well at ${bestSize.size} companies. Target similar opportunities.`
    });
  }
  
  // General tips if not enough data
  if (insights.length === 0) {
    insights.push({
      type: 'tip',
      title: 'Build Your Data',
      description: 'Complete more interviews and practice sessions to unlock personalized insights and patterns.'
    });
    insights.push({
      type: 'tip',
      title: 'Industry Benchmark',
      description: 'The average interview-to-offer conversion rate across industries is 20-25%. Track your progress against this benchmark.'
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Strategic Insights
        </CardTitle>
        <CardDescription>
          AI-generated insights on your interview patterns and optimal strategies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, index) => {
          const Icon = insight.type === 'success' ? CheckCircle2 : insight.type === 'warning' ? AlertCircle : TrendingUp;
          const colorClass = insight.type === 'success' 
            ? 'bg-green-500/10 border-green-500/20 text-green-500' 
            : insight.type === 'warning'
            ? 'bg-orange-500/10 border-orange-500/20 text-orange-500'
            : 'bg-blue-500/10 border-blue-500/20 text-blue-500';
          
          return (
            <div key={index} className={`p-4 rounded-lg border ${colorClass}`}>
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="space-y-1 flex-1">
                  <div className="font-semibold">{insight.title}</div>
                  <p className="text-sm opacity-90">{insight.description}</p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {insight.type}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
