import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  TrendingUp, 
  FileText, 
  Mail, 
  Target,
  Zap,
  Clock,
  BarChart3
} from 'lucide-react';

interface ABTestInsightsProps {
  tests: Array<{
    id: string;
    test_name: string;
    material_type: string;
    variant_a_name: string;
    variant_b_name: string;
    status: string;
    winner: string | null;
  }>;
}

export function ABTestInsights({ tests }: ABTestInsightsProps) {
  // Fetch all applications for completed tests with job data
  const { data: allApplications } = useQuery({
    queryKey: ['all-ab-test-applications-with-jobs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('material_ab_test_applications')
        .select(`
          *,
          jobs:job_id (
            status,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    }
  });

  // Map job status to outcome
  const mapJobStatusToOutcome = (jobStatus: string | undefined): string => {
    if (!jobStatus) return 'pending';
    const status = jobStatus.toLowerCase();
    if (status === 'interview' || status === 'phone screen') return 'interview';
    if (status === 'offer' || status === 'accepted') return 'offer';
    if (status === 'rejected') return 'rejection';
    return 'pending';
  };

  // Calculate metrics for a test based on its applications
  const calculateTestMetrics = (testId: string) => {
    const testApps = allApplications?.filter(a => a.test_id === testId) || [];
    const variantAApps = testApps.filter(a => a.variant === 'A');
    const variantBApps = testApps.filter(a => a.variant === 'B');

    const getResponseRate = (apps: typeof testApps) => {
      if (apps.length === 0) return 0;
      const outcomes = apps.map(a => mapJobStatusToOutcome(a.jobs?.status));
      const responses = outcomes.filter(o => o !== 'pending');
      return (responses.length / apps.length) * 100;
    };

    return {
      responseRateA: getResponseRate(variantAApps),
      responseRateB: getResponseRate(variantBApps),
      totalA: variantAApps.length,
      totalB: variantBApps.length
    };
  };

  // Determine winner based on actual metrics
  const determineWinner = (test: typeof tests[0]) => {
    // If completed with explicit winner, use that
    if (test.status === 'completed' && test.winner) {
      return test.winner;
    }

    // Calculate based on current metrics
    const metrics = calculateTestMetrics(test.id);
    
    // Need at least 5 apps per variant to count
    if (metrics.totalA < 5 || metrics.totalB < 5) return null;
    
    const diff = Math.abs(metrics.responseRateA - metrics.responseRateB);
    
    // Less than 2% difference is a tie
    if (diff < 2) return 'tie';
    
    return metrics.responseRateA > metrics.responseRateB ? 'A' : 'B';
  };

  // Calculate overall insights
  const resumeTests = tests.filter(t => t.material_type === 'resume');
  const coverLetterTests = tests.filter(t => t.material_type === 'cover_letter');

  // Count wins based on actual performance metrics, not just completed tests
  const winnerCounts = tests.reduce((acc, test) => {
    const winner = determineWinner(test);
    if (winner === 'A') acc.A++;
    else if (winner === 'B') acc.B++;
    else if (winner === 'tie') acc.tie++;
    return acc;
  }, { A: 0, B: 0, tie: 0 });

  // Analyze patterns from applications
  const analyzePatterns = () => {
    if (!allApplications || allApplications.length === 0) return [];

    const patterns: string[] = [];

    // Check response rates
    const responses = allApplications.filter(a => a.outcome && a.outcome !== 'pending' && a.outcome !== 'no_response');
    const overallResponseRate = (responses.length / allApplications.length) * 100;

    if (overallResponseRate > 30) {
      patterns.push('Your materials are performing well with a response rate above 30%');
    } else if (overallResponseRate < 15) {
      patterns.push('Consider testing more dramatic variations to improve response rates');
    }

    // Check interview conversion
    const interviews = allApplications.filter(a => a.outcome === 'interview' || a.outcome === 'offer');
    if (interviews.length > 0 && responses.length > 0) {
      const conversionRate = (interviews.length / responses.length) * 100;
      if (conversionRate > 50) {
        patterns.push('Strong interview conversion rate - focus on maintaining quality');
      }
    }

    // Analyze timing
    const withResponseTime = allApplications.filter(a => a.response_time_hours);
    if (withResponseTime.length > 0) {
      const avgTime = withResponseTime.reduce((sum, a) => sum + (a.response_time_hours || 0), 0) / withResponseTime.length;
      if (avgTime < 72) {
        patterns.push('Fast response times suggest strong initial impressions');
      } else if (avgTime > 168) {
        patterns.push('Longer response times may indicate need for more engaging opening content');
      }
    }

    return patterns;
  };

  const patterns = analyzePatterns();

  // Generate recommendations
  const generateRecommendations = () => {
    const recommendations: Array<{ icon: React.ReactNode; title: string; description: string }> = [];

    if (tests.length === 0) {
      recommendations.push({
        icon: <Target className="h-5 w-5 text-blue-500" />,
        title: 'Start Your First Test',
        description: 'Create an A/B test to compare two versions of your resume or cover letter'
      });
    }

    if (winnerCounts.A > 0 && winnerCounts.A > winnerCounts.B) {
      recommendations.push({
        icon: <Zap className="h-5 w-5 text-yellow-500" />,
        title: 'Variant A Patterns',
        description: 'Your "A" variants tend to perform better. Consider what makes them successful and apply those elements'
      });
    }

    if (resumeTests.length > 0 && coverLetterTests.length === 0) {
      recommendations.push({
        icon: <Mail className="h-5 w-5 text-green-500" />,
        title: 'Test Cover Letters',
        description: 'You\'ve tested resumes but not cover letters. Consider A/B testing your cover letter approach'
      });
    }

    if (allApplications && allApplications.length > 0) {
      const pendingCount = allApplications.filter(a => a.outcome === 'pending').length;
      const pendingRate = (pendingCount / allApplications.length) * 100;

      if (pendingRate > 50) {
        recommendations.push({
          icon: <Clock className="h-5 w-5 text-amber-500" />,
          title: 'Update Outcomes',
          description: 'Many applications are pending. Update outcomes to get more accurate test results'
        });
      }
    }

    if (tests.filter(t => t.status === 'active').length >= 3) {
      recommendations.push({
        icon: <BarChart3 className="h-5 w-5 text-purple-500" />,
        title: 'Focus Your Tests',
        description: 'You have multiple active tests. Consider completing some before starting new ones for clearer insights'
      });
    }

    return recommendations;
  };

  const recommendations = generateRecommendations();

  return (
    <div className="space-y-6">
      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Resume Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumeTests.length}</div>
            <p className="text-sm text-muted-foreground">
              {resumeTests.filter(t => t.status === 'completed').length} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mail className="h-4 w-4 text-green-500" />
              Cover Letter Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coverLetterTests.length}</div>
            <p className="text-sm text-muted-foreground">
              {coverLetterTests.filter(t => t.status === 'completed').length} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Win Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Badge variant="outline">A: {winnerCounts.A}</Badge>
              <Badge variant="outline">B: {winnerCounts.B}</Badge>
              <Badge variant="secondary">Tie: {winnerCounts.tie}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patterns */}
      {patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Patterns Detected
            </CardTitle>
            <CardDescription>
              Insights based on your A/B test results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {patterns.map((pattern, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-sm">{pattern}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Recommendations
          </CardTitle>
          <CardDescription>
            Suggestions to improve your testing strategy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                {rec.icon}
                <div>
                  <h4 className="font-medium text-sm">{rec.title}</h4>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Testing Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">A/B Testing Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Test one element at a time for clearer insights (format, length, tone)</li>
            <li>• Aim for at least 10 applications per variant for statistical significance</li>
            <li>• Use random assignment to eliminate bias</li>
            <li>• Track outcomes consistently for accurate results</li>
            <li>• Archive underperforming versions and iterate on winners</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
