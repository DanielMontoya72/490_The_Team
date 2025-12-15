import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  FlaskConical, 
  FileText, 
  Mail, 
  Play, 
  Pause, 
  CheckCircle2, 
  Trophy,
  TrendingUp,
  Clock,
  Users,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Plus,
  ListPlus,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AddApplicationToTestDialog } from './AddApplicationToTestDialog';
import { BulkAddApplicationsDialog } from './BulkAddApplicationsDialog';
import { TestComparisonMetrics } from './TestComparisonMetrics';
import { TestSuccessInsights } from './TestSuccessInsights';

interface ABTestCardProps {
  test: {
    id: string;
    test_name: string;
    material_type: string;
    variant_a_id: string;
    variant_b_id: string;
    variant_a_name: string;
    variant_b_name: string;
    status: string;
    winner: string | null;
    start_date: string;
    end_date: string | null;
  };
}

export function ABTestCard({ test }: ABTestCardProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  // Fetch applications for this test
  const { data: applications } = useQuery({
    queryKey: ['ab-test-applications', test.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_ab_test_applications')
        .select(`
          *,
          jobs:job_id (
            job_title,
            company_name,
            status,
            created_at,
            updated_at
          )
        `)
        .eq('test_id', test.id);

      if (error) throw error;
      return data || [];
    }
  });

  const variantAApps = applications?.filter(a => a.variant === 'A') || [];
  const variantBApps = applications?.filter(a => a.variant === 'B') || [];

  // Map job status to outcome for A/B testing
  const mapJobStatusToOutcome = (jobStatus: string | undefined): string => {
    if (!jobStatus) return 'pending';
    const status = jobStatus.toLowerCase();
    if (status === 'interview' || status === 'phone screen') return 'interview';
    if (status === 'offer' || status === 'accepted') return 'offer';
    if (status === 'rejected') return 'rejection';
    if (status === 'applied') return 'pending';
    if (status === 'interested') return 'pending';
    return 'pending';
  };

  // Get effective outcome from job status
  const getEffectiveOutcome = (app: any): string => {
    // Use job status as the source of truth for outcome
    return mapJobStatusToOutcome(app.jobs?.status);
  };

  // Calculate response time from job created_at to updated_at (when status changed)
  const calculateResponseTimeHours = (app: any): number | null => {
    if (!app.jobs?.created_at || !app.jobs?.updated_at) return null;
    const outcome = getEffectiveOutcome(app);
    // Only calculate for jobs that have received a response
    if (outcome === 'pending') return null;
    
    const createdAt = new Date(app.jobs.created_at);
    const updatedAt = new Date(app.jobs.updated_at);
    const diffMs = updatedAt.getTime() - createdAt.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    // Sanity check: only count if response came after creation
    return diffHours > 0 ? diffHours : null;
  };

  // Calculate metrics using job status
  const calculateMetrics = (apps: typeof applications) => {
    if (!apps || apps.length === 0) {
      return { responseRate: 0, interviewRate: 0, avgResponseTime: 0, total: 0 };
    }

    const outcomes = apps.map(a => getEffectiveOutcome(a));
    const responses = outcomes.filter(o => o !== 'pending');
    const interviews = outcomes.filter(o => o === 'interview' || o === 'offer');
    
    // Calculate response times from job timestamps
    const responseTimes = apps
      .map(a => calculateResponseTimeHours(a))
      .filter((t): t is number => t !== null && t > 0);

    return {
      responseRate: (responses.length / apps.length) * 100,
      interviewRate: (interviews.length / apps.length) * 100,
      avgResponseTime: responseTimes.length > 0 
        ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length 
        : 0,
      total: apps.length
    };
  };

  const metricsA = calculateMetrics(variantAApps);
  const metricsB = calculateMetrics(variantBApps);

  // Count outcomes for insights (using job status)
  const countOutcomes = (apps: typeof applications) => {
    if (!apps) return { pending: 0, responded: 0, interviews: 0, rejections: 0, noResponse: 0 };
    const outcomes = apps.map(a => getEffectiveOutcome(a));
    return {
      pending: outcomes.filter(o => o === 'pending').length,
      responded: outcomes.filter(o => o === 'response').length,
      interviews: outcomes.filter(o => o === 'interview' || o === 'offer').length,
      rejections: outcomes.filter(o => o === 'rejection').length,
      noResponse: 0
    };
  };

  const outcomesA = countOutcomes(variantAApps);
  const outcomesB = countOutcomes(variantBApps);
  const totalPending = outcomesA.pending + outcomesB.pending;
  const totalWithOutcome = (applications?.length || 0) - totalPending;

  // Statistical significance calculation (simplified z-test)
  const calculateSignificance = () => {
    const n1 = metricsA.total;
    const n2 = metricsB.total;
    const p1 = metricsA.responseRate / 100;
    const p2 = metricsB.responseRate / 100;

    if (n1 < 10 || n2 < 10) return { significant: false, pValue: null, message: 'Need 10+ applications per variant', needsOutcomes: false };

    // Check if all outcomes are still pending
    if (totalWithOutcome === 0) {
      return { significant: false, pValue: null, message: 'Update outcomes to see results', needsOutcomes: true };
    }

    const pPooled = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(pPooled * (1 - pPooled) * (1/n1 + 1/n2));
    
    if (se === 0) {
      // Both have same rate - need more diverse outcomes
      if (p1 === 0 && p2 === 0) {
        return { significant: false, pValue: null, message: 'No responses yet - update outcomes', needsOutcomes: true };
      }
      return { significant: false, pValue: null, message: 'Same response rate - need more data', needsOutcomes: false };
    }
    
    const z = (p1 - p2) / se;
    const pValue = 2 * (1 - normalCDF(Math.abs(z)));

    return {
      significant: pValue < 0.05,
      pValue: pValue,
      message: pValue < 0.05 ? 'Statistically significant!' : 'Not yet significant',
      needsOutcomes: false
    };
  };

  // Normal CDF approximation
  const normalCDF = (x: number) => {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1.0 + sign * y);
  };

  const significance = calculateSignificance();

  // Determine winner
  const determineWinner = () => {
    if (metricsA.total < 10 || metricsB.total < 10) return null;
    if (!significance.significant) return 'tie';
    return metricsA.responseRate > metricsB.responseRate ? 'A' : 'B';
  };

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const updateData: any = { status: newStatus };
      if (newStatus === 'completed') {
        updateData.end_date = new Date().toISOString();
        updateData.winner = determineWinner();
      }

      const { error } = await supabase
        .from('material_ab_tests')
        .update(updateData)
        .eq('id', test.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-ab-tests'] });
      toast.success('Test status updated');
    }
  });

  const isWinnerA = test.winner === 'A' || (significance.significant && metricsA.responseRate > metricsB.responseRate);
  const isWinnerB = test.winner === 'B' || (significance.significant && metricsB.responseRate > metricsA.responseRate);

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'interview':
      case 'offer':
        return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'rejection':
        return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'response':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'no_response':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      default:
        return '';
    }
  };

  return (
    <>
      <Card className={test.status === 'completed' ? 'opacity-80' : ''}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {test.material_type === 'resume' ? (
                <FileText className="h-5 w-5 text-blue-500" />
              ) : (
                <Mail className="h-5 w-5 text-green-500" />
              )}
              <CardTitle className="text-lg">{test.test_name}</CardTitle>
              <Badge variant={test.status === 'active' ? 'default' : test.status === 'completed' ? 'secondary' : 'outline'}>
                {test.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {test.status === 'active' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setShowBulkDialog(true)}>
                    <ListPlus className="h-4 w-4 mr-1" />
                    Bulk Add
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate('paused')}>
                    <Pause className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate('completed')}>
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              {test.status === 'paused' && (
                <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate('active')}>
                  <Play className="h-4 w-4" />
                </Button>
              )}
              <Button size="sm" variant={expanded ? 'secondary' : 'ghost'} onClick={() => setExpanded(!expanded)}>
                <Eye className="h-4 w-4 mr-1" />
                {expanded ? 'Hide' : 'Details'}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Started {format(new Date(test.start_date), 'MMM d, yyyy')}
            {test.end_date && ` • Ended ${format(new Date(test.end_date), 'MMM d, yyyy')}`}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Variant Comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Variant A */}
            <div className={`p-4 rounded-lg border ${isWinnerA ? 'border-green-500 bg-green-500/5' : 'border-border'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Variant A</span>
                {isWinnerA && <Trophy className="h-4 w-4 text-green-500" />}
              </div>
              <p className="text-sm text-muted-foreground mb-3">{test.variant_a_name}</p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> Applications
                  </span>
                  <span className="font-medium">{metricsA.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Response Rate
                  </span>
                  <span className="font-medium">{metricsA.responseRate.toFixed(1)}%</span>
                </div>
                <Progress value={metricsA.responseRate} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" /> Interview Rate
                  </span>
                  <span className="font-medium">{metricsA.interviewRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Avg Response
                  </span>
                  <span className="font-medium">
                    {metricsA.avgResponseTime > 0 ? `${Math.round(metricsA.avgResponseTime)}h` : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Variant B */}
            <div className={`p-4 rounded-lg border ${isWinnerB ? 'border-green-500 bg-green-500/5' : 'border-border'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Variant B</span>
                {isWinnerB && <Trophy className="h-4 w-4 text-green-500" />}
              </div>
              <p className="text-sm text-muted-foreground mb-3">{test.variant_b_name}</p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> Applications
                  </span>
                  <span className="font-medium">{metricsB.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Response Rate
                  </span>
                  <span className="font-medium">{metricsB.responseRate.toFixed(1)}%</span>
                </div>
                <Progress value={metricsB.responseRate} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" /> Interview Rate
                  </span>
                  <span className="font-medium">{metricsB.interviewRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Avg Response
                  </span>
                  <span className="font-medium">
                    {metricsB.avgResponseTime > 0 ? `${Math.round(metricsB.avgResponseTime)}h` : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Statistical Significance */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4" />
                <span className="text-sm font-medium">Statistical Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={significance.significant ? 'default' : significance.needsOutcomes ? 'destructive' : 'secondary'}>
                  {significance.message}
                </Badge>
                {significance.pValue !== null && (
                  <span className="text-xs text-muted-foreground">
                    p = {significance.pValue.toFixed(4)}
                  </span>
                )}
              </div>
            </div>
            
            {/* Outcome summary and action prompt */}
            {(applications?.length || 0) > 0 && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                <div className="flex gap-3 text-muted-foreground">
                  <span>{totalWithOutcome} with outcomes</span>
                  <span>{totalPending} pending</span>
                </div>
                {significance.needsOutcomes && (
                  <span className="text-muted-foreground italic text-xs">
                    Update job statuses in dashboard to see results
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Comparison Metrics - Always visible when there's data */}
          {(metricsA.total > 0 || metricsB.total > 0) && (
            <TestComparisonMetrics
              metricsA={metricsA}
              metricsB={metricsB}
              variantAName={test.variant_a_name}
              variantBName={test.variant_b_name}
              isSignificant={significance.significant}
              winner={test.winner || (significance.significant ? (metricsA.responseRate > metricsB.responseRate ? 'A' : 'B') : null)}
            />
          )}

          {/* Success Insights */}
          <TestSuccessInsights
            test={test}
            metricsA={metricsA}
            metricsB={metricsB}
            isSignificant={significance.significant}
          />

          {/* Expanded Details */}
          {expanded && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Application Details</h4>
                  <p className="text-xs text-muted-foreground">Job status determines outcome automatically</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Variant A Applications ({variantAApps.length})</p>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {variantAApps.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No applications yet</p>
                      ) : (
                        variantAApps.map(app => {
                          const effectiveOutcome = getEffectiveOutcome(app);
                          return (
                            <div 
                              key={app.id} 
                              className="text-xs p-2 rounded bg-muted/30"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{app.jobs?.job_title}</p>
                                  <p className="text-muted-foreground truncate">{app.jobs?.company_name}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={`text-xs ${getOutcomeColor(effectiveOutcome)}`}>
                                  {effectiveOutcome}
                                </Badge>
                                <span className="text-xs text-muted-foreground">({app.jobs?.status})</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Variant B Applications ({variantBApps.length})</p>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {variantBApps.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No applications yet</p>
                      ) : (
                        variantBApps.map(app => {
                          const effectiveOutcome = getEffectiveOutcome(app);
                          return (
                            <div 
                              key={app.id} 
                              className="text-xs p-2 rounded bg-muted/30"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{app.jobs?.job_title}</p>
                                  <p className="text-muted-foreground truncate">{app.jobs?.company_name}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={`text-xs ${getOutcomeColor(effectiveOutcome)}`}>
                                  {effectiveOutcome}
                                </Badge>
                                <span className="text-xs text-muted-foreground">({app.jobs?.status})</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AddApplicationToTestDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        test={test}
      />

      <BulkAddApplicationsDialog
        open={showBulkDialog}
        onOpenChange={setShowBulkDialog}
        test={test}
      />
    </>
  );
}
