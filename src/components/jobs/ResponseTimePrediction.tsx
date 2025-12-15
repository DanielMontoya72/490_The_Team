import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertTriangle, TrendingUp, Calendar, RefreshCw, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, addDays } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ResponseTimePredictionProps {
  jobId: string;
  company: string;
  industry?: string;
  companySize?: string;
  jobLevel?: string;
  appliedDate?: string;
  status?: string;
}

interface Prediction {
  id: string;
  predicted_min_days: number;
  predicted_max_days: number;
  predicted_avg_days: number;
  confidence_level: number;
  factors_used: Record<string, any>;
  suggested_follow_up_date: string;
  is_overdue: boolean;
  actual_response_days: number | null;
  prediction_accuracy: number | null;
}

interface Benchmark {
  industry: string;
  company_size: string;
  job_level: string;
  avg_response_days: number;
  min_response_days: number;
  max_response_days: number;
  sample_size: number;
}

export function ResponseTimePrediction({
  jobId,
  company,
  industry = 'Technology',
  companySize = 'Medium',
  jobLevel = 'Mid',
  appliedDate,
  status
}: ResponseTimePredictionProps) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [benchmark, setBenchmark] = useState<Benchmark | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [daysSinceApplied, setDaysSinceApplied] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (appliedDate) {
      const days = differenceInDays(new Date(), new Date(appliedDate));
      setDaysSinceApplied(days);
    }
    fetchPrediction();
    fetchBenchmark();
  }, [jobId, industry, companySize, jobLevel]);

  const fetchPrediction = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('response_time_predictions')
        .select('*')
        .eq('job_id', jobId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setPrediction(data as Prediction);
        // Check if overdue
        if (appliedDate && !data.is_overdue) {
          const days = differenceInDays(new Date(), new Date(appliedDate));
          if (days > data.predicted_max_days) {
            await supabase
              .from('response_time_predictions')
              .update({ is_overdue: true })
              .eq('id', data.id);
            setPrediction({ ...data, is_overdue: true } as Prediction);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching prediction:', error);
    }
  };

  const fetchBenchmark = async () => {
    try {
      // Try exact match first
      let { data, error } = await supabase
        .from('industry_response_benchmarks')
        .select('*')
        .eq('industry', industry)
        .eq('company_size', companySize)
        .eq('job_level', jobLevel)
        .maybeSingle();

      // Fallback to industry + company_size
      if (!data) {
        const result = await supabase
          .from('industry_response_benchmarks')
          .select('*')
          .eq('industry', industry)
          .eq('company_size', companySize)
          .limit(1)
          .maybeSingle();
        data = result.data;
      }

      // Fallback to industry only
      if (!data) {
        const result = await supabase
          .from('industry_response_benchmarks')
          .select('*')
          .eq('industry', industry)
          .limit(1)
          .maybeSingle();
        data = result.data;
      }

      if (data) setBenchmark(data as Benchmark);
    } catch (error) {
      console.error('Error fetching benchmark:', error);
    }
  };

  const generatePrediction = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate prediction based on factors
      const baseDays = benchmark?.avg_response_days || 10;
      const minDays = benchmark?.min_response_days || Math.max(2, baseDays - 5);
      const maxDays = benchmark?.max_response_days || baseDays + 14;

      // Apply seasonality adjustments
      const now = new Date();
      const month = now.getMonth();
      const dayOfWeek = now.getDay();
      
      let seasonalityFactor = 1.0;
      // Holiday months (Nov-Dec, July-Aug) tend to have slower responses
      if (month === 10 || month === 11 || month === 6 || month === 7) {
        seasonalityFactor = 1.3;
      }
      // Fiscal year end (March, September) can be busy
      if (month === 2 || month === 8) {
        seasonalityFactor = 1.15;
      }

      // Day of week adjustment (weekend applications may take longer)
      let dayFactor = 1.0;
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        dayFactor = 1.1;
      }

      const adjustedAvg = Math.round(baseDays * seasonalityFactor * dayFactor);
      const adjustedMin = Math.round(minDays * seasonalityFactor);
      const adjustedMax = Math.round(maxDays * seasonalityFactor * dayFactor);

      const suggestedFollowUp = appliedDate 
        ? format(addDays(new Date(appliedDate), adjustedAvg + 3), 'yyyy-MM-dd')
        : format(addDays(new Date(), adjustedAvg + 3), 'yyyy-MM-dd');

      const factors = {
        industry,
        companySize,
        jobLevel,
        seasonalityFactor,
        dayOfWeekFactor: dayFactor,
        appliedOn: appliedDate || format(new Date(), 'yyyy-MM-dd'),
        baseBenchmark: benchmark ? `${benchmark.avg_response_days} days avg` : 'Default estimate'
      };

      const { data, error } = await supabase
        .from('response_time_predictions')
        .upsert({
          user_id: user.id,
          job_id: jobId,
          predicted_min_days: adjustedMin,
          predicted_max_days: adjustedMax,
          predicted_avg_days: adjustedAvg,
          confidence_level: benchmark ? 80 : 60,
          factors_used: factors,
          suggested_follow_up_date: suggestedFollowUp,
          is_overdue: daysSinceApplied > adjustedMax
        }, { onConflict: 'job_id' })
        .select()
        .single();

      if (error) throw error;
      setPrediction(data as Prediction);
      toast({
        title: 'Prediction Generated',
        description: `Expected response: ${adjustedMin}-${adjustedMax} days`
      });
    } catch (error) {
      console.error('Error generating prediction:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate prediction',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const recordResponse = async () => {
    if (!prediction || !appliedDate) return;
    
    try {
      const actualDays = daysSinceApplied;
      const accuracy = 100 - Math.abs(actualDays - prediction.predicted_avg_days) / prediction.predicted_avg_days * 100;
      
      await supabase
        .from('response_time_predictions')
        .update({
          actual_response_days: actualDays,
          responded_at: new Date().toISOString(),
          prediction_accuracy: Math.max(0, accuracy)
        })
        .eq('id', prediction.id);

      setPrediction({
        ...prediction,
        actual_response_days: actualDays,
        prediction_accuracy: Math.max(0, accuracy)
      });

      toast({
        title: 'Response Recorded',
        description: `Actual response time: ${actualDays} days (${accuracy.toFixed(0)}% accuracy)`
      });
    } catch (error) {
      console.error('Error recording response:', error);
    }
  };

  const getProgressColor = () => {
    if (!prediction) return 'bg-muted';
    const progress = (daysSinceApplied / prediction.predicted_max_days) * 100;
    if (progress < 50) return 'bg-green-500';
    if (progress < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusBadge = () => {
    if (!prediction) return null;
    
    if (prediction.actual_response_days !== null) {
      return <Badge variant="secondary">Response Received</Badge>;
    }
    if (prediction.is_overdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    if (daysSinceApplied > prediction.predicted_avg_days) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Taking Longer</Badge>;
    }
    return <Badge variant="secondary" className="bg-green-100 text-green-700">On Track</Badge>;
  };

  // Don't show for certain statuses
  if (status && ['offer', 'rejected', 'withdrawn', 'accepted'].includes(status)) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Response Time Prediction
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!prediction ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Generate a prediction based on industry benchmarks and historical data
            </p>
            <Button onClick={generatePrediction} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Prediction'
              )}
            </Button>
          </div>
        ) : (
          <>
            {/* Main Prediction */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Expected Response Time</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="text-xs">
                        {prediction.confidence_level}% confidence
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Based on {benchmark?.sample_size || 'estimated'} data points</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-2xl font-bold">
                {prediction.predicted_min_days}-{prediction.predicted_max_days} days
              </p>
              <p className="text-sm text-muted-foreground">
                Typically responds in ~{prediction.predicted_avg_days} days
              </p>
            </div>

            {/* Progress Tracker */}
            {appliedDate && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Days Since Applied</span>
                  <span className="font-medium">{daysSinceApplied} days</span>
                </div>
                <Progress 
                  value={Math.min(100, (daysSinceApplied / prediction.predicted_max_days) * 100)} 
                  className={`h-2 ${getProgressColor()}`}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Applied</span>
                  <span>{prediction.predicted_avg_days}d avg</span>
                  <span>{prediction.predicted_max_days}d max</span>
                </div>
              </div>
            )}

            {/* Overdue Alert */}
            {prediction.is_overdue && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Response Overdue</p>
                  <p className="text-xs text-muted-foreground">
                    Consider following up - responses typically arrive within {prediction.predicted_max_days} days
                  </p>
                </div>
              </div>
            )}

            {/* Follow-up Suggestion */}
            {prediction.suggested_follow_up_date && !prediction.actual_response_days && (
              <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg">
                <Calendar className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Suggested Follow-up Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(prediction.suggested_follow_up_date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}

            {/* Industry Benchmark */}
            {benchmark && (
              <div className="flex items-start gap-2 p-3 border rounded-lg">
                <TrendingUp className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Industry Benchmark</p>
                  <p className="text-xs text-muted-foreground">
                    {benchmark.industry} • {benchmark.company_size} companies • {benchmark.job_level} level
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average: {benchmark.avg_response_days} days ({benchmark.min_response_days}-{benchmark.max_response_days} range)
                  </p>
                </div>
              </div>
            )}

            {/* Factors Used */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium flex items-center gap-1">
                <Info className="h-3 w-3" /> Factors considered:
              </p>
              <ul className="list-disc list-inside pl-2 space-y-0.5">
                {prediction.factors_used?.seasonalityFactor !== 1 && (
                  <li>Seasonality adjustment ({((prediction.factors_used?.seasonalityFactor - 1) * 100).toFixed(0)}% longer)</li>
                )}
                {prediction.factors_used?.dayOfWeekFactor !== 1 && (
                  <li>Weekend application adjustment</li>
                )}
                <li>Industry: {prediction.factors_used?.industry}</li>
                <li>Company size: {prediction.factors_used?.companySize}</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generatePrediction}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {!prediction.actual_response_days && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={recordResponse}
                >
                  Record Response
                </Button>
              )}
            </div>

            {/* Accuracy Display */}
            {prediction.actual_response_days !== null && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium">Prediction Accuracy</p>
                <p className="text-lg font-bold text-primary">
                  {prediction.prediction_accuracy?.toFixed(0)}% accurate
                </p>
                <p className="text-xs text-muted-foreground">
                  Predicted: {prediction.predicted_avg_days} days • Actual: {prediction.actual_response_days} days
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
