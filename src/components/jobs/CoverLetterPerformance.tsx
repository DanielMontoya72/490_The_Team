import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, Target, Award, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface PerformanceData {
  id: string;
  template_style: string;
  approach_type: string;
  response_received: boolean;
  outcome: string;
  effectiveness_score: number;
  time_to_response_hours: number;
  word_count: number;
}

interface Analytics {
  totalCoverLetters: number;
  responseRate: number;
  avgTimeToResponse: number;
  successRate: number;
  bestPerformingStyle: string;
  bestPerformingApproach: string;
  avgEffectivenessScore: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function CoverLetterPerformance() {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('cover_letter_performance')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPerformanceData(data || []);
      calculateAnalytics(data || []);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (data: PerformanceData[]) => {
    if (data.length === 0) {
      setAnalytics(null);
      return;
    }

    const totalCoverLetters = data.length;
    const responsesReceived = data.filter(d => d.response_received).length;
    const responseRate = (responsesReceived / totalCoverLetters) * 100;
    
    const successfulOutcomes = data.filter(d => 
      d.outcome && ['Offer Received', 'Interview', 'Hired'].includes(d.outcome)
    ).length;
    const successRate = responsesReceived > 0 ? (successfulOutcomes / responsesReceived) * 100 : 0;

    const responseTimes = data
      .filter(d => d.time_to_response_hours)
      .map(d => d.time_to_response_hours);
    const avgTimeToResponse = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // Find best performing style
    const stylePerformance = data.reduce((acc, curr) => {
      if (!curr.template_style) return acc;
      if (!acc[curr.template_style]) {
        acc[curr.template_style] = { count: 0, responses: 0 };
      }
      acc[curr.template_style].count++;
      if (curr.response_received) acc[curr.template_style].responses++;
      return acc;
    }, {} as Record<string, { count: number; responses: number }>);

    const bestStyle = Object.entries(stylePerformance).sort(
      ([, a], [, b]) => (b.responses / b.count) - (a.responses / a.count)
    )[0];

    // Find best performing approach
    const approachPerformance = data.reduce((acc, curr) => {
      if (!curr.approach_type) return acc;
      if (!acc[curr.approach_type]) {
        acc[curr.approach_type] = { count: 0, responses: 0 };
      }
      acc[curr.approach_type].count++;
      if (curr.response_received) acc[curr.approach_type].responses++;
      return acc;
    }, {} as Record<string, { count: number; responses: number }>);

    const bestApproach = Object.entries(approachPerformance).sort(
      ([, a], [, b]) => (b.responses / b.count) - (a.responses / a.count)
    )[0];

    const avgEffectivenessScore = data
      .filter(d => d.effectiveness_score)
      .reduce((sum, d) => sum + d.effectiveness_score, 0) / data.filter(d => d.effectiveness_score).length || 0;

    setAnalytics({
      totalCoverLetters,
      responseRate,
      avgTimeToResponse,
      successRate,
      bestPerformingStyle: bestStyle?.[0] || 'N/A',
      bestPerformingApproach: bestApproach?.[0] || 'N/A',
      avgEffectivenessScore: Math.round(avgEffectivenessScore),
    });
  };

  const exportReport = () => {
    if (performanceData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const csvContent = [
      ['Style', 'Approach', 'Response Received', 'Outcome', 'Time to Response (hours)', 'Effectiveness Score', 'Word Count'],
      ...performanceData.map(d => [
        d.template_style || '',
        d.approach_type || '',
        d.response_received ? 'Yes' : 'No',
        d.outcome || '',
        d.time_to_response_hours?.toString() || '',
        d.effectiveness_score?.toString() || '',
        d.word_count?.toString() || '',
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-letter-performance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const getStyleData = () => {
    const styleData = performanceData.reduce((acc, curr) => {
      if (!curr.template_style) return acc;
      if (!acc[curr.template_style]) {
        acc[curr.template_style] = { name: curr.template_style, responses: 0, total: 0 };
      }
      acc[curr.template_style].total++;
      if (curr.response_received) acc[curr.template_style].responses++;
      return acc;
    }, {} as Record<string, { name: string; responses: number; total: number }>);

    return Object.values(styleData).map(d => ({
      name: d.name,
      responseRate: Math.round((d.responses / d.total) * 100),
      total: d.total,
    }));
  };

  const getApproachData = () => {
    const approachData = performanceData.reduce((acc, curr) => {
      if (!curr.approach_type) return acc;
      if (!acc[curr.approach_type]) {
        acc[curr.approach_type] = { name: curr.approach_type, count: 0 };
      }
      acc[curr.approach_type].count++;
      return acc;
    }, {} as Record<string, { name: string; count: number }>);

    return Object.values(approachData);
  };

  const getRecommendations = () => {
    if (!analytics || performanceData.length < 3) {
      return ['Track at least 3 cover letters to receive personalized recommendations'];
    }

    const recommendations: string[] = [];

    if (analytics.responseRate < 30) {
      recommendations.push('Your response rate is below average. Consider personalizing your cover letters more and researching each company thoroughly.');
    }

    if (analytics.avgTimeToResponse > 168) {
      recommendations.push('Applications are taking longer to receive responses. Try following up 1-2 weeks after submission.');
    }

    if (analytics.bestPerformingStyle !== 'N/A') {
      recommendations.push(`Your "${analytics.bestPerformingStyle}" style performs best. Consider using this approach more often.`);
    }

    if (analytics.avgEffectivenessScore < 60) {
      recommendations.push('Focus on quantifying achievements and using action verbs to improve effectiveness scores.');
    }

    const avgWordCount = performanceData.reduce((sum, d) => sum + (d.word_count || 0), 0) / performanceData.length;
    if (avgWordCount > 500) {
      recommendations.push('Consider keeping cover letters under 400 words for better engagement.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Great work! Your cover letters are performing well. Keep tracking to maintain success.');
    }

    return recommendations;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading performance data...</div>;
  }

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Cover Letter Performance
          </CardTitle>
          <CardDescription>Track your cover letter success rates and optimize your approach</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Performance Data Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start tracking your cover letters to see which styles and approaches get the best responses. 
              This will help you improve your application success rate over time.
            </p>
            <div className="space-y-3 text-sm text-left max-w-md mx-auto bg-muted/50 p-4 rounded-lg">
              <p className="font-semibold">How to track performance:</p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Go to a job application in the Jobs page</li>
                <li>Upload or link a cover letter to that job</li>
                <li>Click the <BarChart3 className="h-3 w-3 inline" /> Track Performance button</li>
                <li>Enter details about responses and outcomes</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tracked</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalCoverLetters}</div>
            <p className="text-xs text-muted-foreground">Cover letters sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.responseRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Received responses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Positive outcomes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Effectiveness</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgEffectivenessScore}/100</div>
            <p className="text-xs text-muted-foreground">Score rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Response Rate by Style</CardTitle>
                <CardDescription>Compare performance across different styles</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getStyleData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="responseRate" fill="hsl(var(--primary))" name="Response Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Approach Distribution</CardTitle>
                <CardDescription>Usage of different approaches</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getApproachData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.name}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="count"
                    >
                      {getApproachData().map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
              <CardDescription>Performance patterns from your cover letters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Badge variant="secondary">Best Style</Badge>
                <div>
                  <p className="font-medium">{analytics.bestPerformingStyle}</p>
                  <p className="text-sm text-muted-foreground">
                    This template style has your highest response rate
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge variant="secondary">Best Approach</Badge>
                <div>
                  <p className="font-medium">{analytics.bestPerformingApproach}</p>
                  <p className="text-sm text-muted-foreground">
                    This approach type yields the best results
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge variant="secondary">Avg. Response Time</Badge>
                <div>
                  <p className="font-medium">{Math.round(analytics.avgTimeToResponse / 24)} days</p>
                  <p className="text-sm text-muted-foreground">
                    Average time to receive a response
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personalized Recommendations</CardTitle>
              <CardDescription>Data-driven suggestions to improve your success rate</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {getRecommendations().map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    <p className="text-sm">{recommendation}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export */}
      <div className="flex justify-end">
        <Button onClick={exportReport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Performance Report
        </Button>
      </div>
    </div>
  );
}