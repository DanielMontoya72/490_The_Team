import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Clock, Calendar, TrendingUp, AlertTriangle, CheckCircle, Timer, BarChart3, FlaskConical, Loader2 } from 'lucide-react';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { ScheduleApplicationDialog } from './ScheduleApplicationDialog';
import { TimingABTestResults } from './TimingABTestResults';

interface TimingAnalysis {
  optimalDayOfWeek: string;
  optimalTimeRange: string;
  bestDays: { day: string; score: number; reasoning: string }[];
  worstTimes: { description: string; reason: string }[];
  industryInsights: { industry: string; bestTime: string; note: string }[];
  realTimeRecommendation: {
    action: 'submit_now' | 'wait';
    message: string;
    suggestedTime?: string;
    reasoning: string;
  };
  timezoneConsideration?: string;
  abTestSuggestion?: string;
}

interface ApplicationTimingOptimizerProps {
  jobId?: string;
  industry?: string;
  companySize?: string;
  isRemote?: boolean;
}

export function ApplicationTimingOptimizer({ 
  jobId, 
  industry, 
  companySize, 
  isRemote 
}: ApplicationTimingOptimizerProps) {
  const [analysis, setAnalysis] = useState<TimingAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: scheduledApplications } = useQuery({
    queryKey: ['scheduled-applications', jobId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('scheduled_applications')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true });

      if (jobId) {
        query = query.eq('job_id', jobId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: timingCorrelation } = useQuery({
    queryKey: ['timing-correlation'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('application_timing_analytics')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return calculateCorrelation(data || []);
    },
  });

  const analyzeTimingMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const now = new Date();

      const response = await supabase.functions.invoke('analyze-application-timing', {
        body: {
          jobId,
          industry,
          companySize,
          isRemote,
          timezone,
          currentHour: now.getHours(),
          currentDayOfWeek: now.getDay(),
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      if (data.analysis) {
        setAnalysis(data.analysis);
        toast.success('Timing analysis complete!');
      }
    },
    onError: (error) => {
      console.error('Timing analysis error:', error);
      toast.error('Failed to analyze timing');
    },
  });

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await analyzeTimingMutation.mutateAsync();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getNextOptimalTime = () => {
    if (!analysis) return null;
    
    const now = new Date();
    const dayMap: Record<string, number> = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    
    const targetDay = dayMap[analysis.optimalDayOfWeek] ?? 2;
    let daysUntil = targetDay - now.getDay();
    if (daysUntil <= 0) daysUntil += 7;
    
    const optimalDate = addDays(now, daysUntil);
    return setMinutes(setHours(optimalDate, 9), 0);
  };

  return (
    <div className="space-y-6">
      {/* Real-time Recommendation Banner */}
      {analysis?.realTimeRecommendation && (
        <Card className={`border-2 ${
          analysis.realTimeRecommendation.action === 'submit_now' 
            ? 'border-green-500 bg-green-500/10' 
            : 'border-amber-500 bg-amber-500/10'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {analysis.realTimeRecommendation.action === 'submit_now' ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <Timer className="h-8 w-8 text-amber-500" />
                )}
                <div>
                  <h3 className="font-semibold text-lg">
                    {analysis.realTimeRecommendation.message}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {analysis.realTimeRecommendation.reasoning}
                  </p>
                  {analysis.realTimeRecommendation.suggestedTime && (
                    <Badge variant="outline" className="mt-2">
                      <Clock className="h-3 w-3 mr-1" />
                      Suggested: {analysis.realTimeRecommendation.suggestedTime}
                    </Badge>
                  )}
                </div>
              </div>
              {analysis.realTimeRecommendation.action === 'wait' && (
                <Button onClick={() => setShowScheduleDialog(true)}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule for Optimal Time
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Analysis Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Application Timing Optimizer
              </CardTitle>
              <CardDescription>
                AI-powered recommendations for optimal application submission times
              </CardDescription>
            </div>
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Analyze Timing
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!analysis ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No Timing Analysis Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Click "Analyze Timing" to get personalized recommendations for when to submit your application
              </p>
            </div>
          ) : (
            <Tabs defaultValue="recommendations">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                <TabsTrigger value="best-times">Best Times</TabsTrigger>
                <TabsTrigger value="avoid">Times to Avoid</TabsTrigger>
                <TabsTrigger value="correlation">Correlation Data</TabsTrigger>
              </TabsList>

              <TabsContent value="recommendations" className="space-y-4 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Optimal Day</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {analysis.optimalDayOfWeek}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Optimal Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {analysis.optimalTimeRange}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {analysis.industryInsights && analysis.industryInsights.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Industry Insights</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {analysis.industryInsights.map((insight, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Badge variant="secondary">{insight.industry}</Badge>
                          <div>
                            <span className="font-medium">{insight.bestTime}</span>
                            <p className="text-sm text-muted-foreground">{insight.note}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {analysis.timezoneConsideration && (
                  <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Timezone Consideration</span>
                      <p className="text-sm text-muted-foreground">{analysis.timezoneConsideration}</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="best-times" className="mt-4">
                <div className="space-y-3">
                  {analysis.bestDays.map((day, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-24 font-medium">{day.day}</div>
                      <div className="flex-1">
                        <Progress value={day.score} className="h-3" />
                      </div>
                      <div className="w-12 text-right font-medium">{day.score}%</div>
                      <div className="w-48 text-sm text-muted-foreground truncate">
                        {day.reasoning}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="avoid" className="mt-4">
                <div className="space-y-3">
                  {analysis.worstTimes.map((time, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                      <div>
                        <div className="font-medium">{time.description}</div>
                        <p className="text-sm text-muted-foreground">{time.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="correlation" className="mt-4">
                {timingCorrelation ? (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Response Rate by Day</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-xl font-bold">
                            {timingCorrelation.bestDayResponseRate.toFixed(1)}%
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Best: {timingCorrelation.bestDay}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Response Rate by Hour</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-xl font-bold">
                            {timingCorrelation.bestHourResponseRate.toFixed(1)}%
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Best: {timingCorrelation.bestHour}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Avg Response Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-xl font-bold">
                            {timingCorrelation.avgResponseTime} hrs
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Based on {timingCorrelation.totalTracked} applications
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Submit more applications to see correlation data
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Scheduled Applications */}
      {scheduledApplications && scheduledApplications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Scheduled Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scheduledApplications.map((scheduled) => (
                <div key={scheduled.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">
                      {format(new Date(scheduled.scheduled_for), 'EEEE, MMM d, yyyy')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(scheduled.scheduled_for), 'h:mm a')} ({scheduled.timezone})
                    </div>
                  </div>
                  <Badge variant="secondary">{scheduled.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* A/B Test Results */}
      <TimingABTestResults />

      {/* Schedule Dialog */}
      {showScheduleDialog && (
        <ScheduleApplicationDialog
          jobId={jobId}
          suggestedTime={getNextOptimalTime()}
          onClose={() => setShowScheduleDialog(false)}
          onScheduled={() => {
            queryClient.invalidateQueries({ queryKey: ['scheduled-applications'] });
            setShowScheduleDialog(false);
          }}
        />
      )}
    </div>
  );
}

function calculateCorrelation(data: any[]) {
  if (data.length === 0) return null;

  const dayStats: Record<string, { total: number; responses: number }> = {};
  const hourStats: Record<number, { total: number; responses: number }> = {};
  let totalResponseTime = 0;
  let responseCount = 0;

  data.forEach((entry) => {
    // Day stats
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][entry.submission_day_of_week];
    if (dayName) {
      if (!dayStats[dayName]) dayStats[dayName] = { total: 0, responses: 0 };
      dayStats[dayName].total++;
      if (entry.response_received) dayStats[dayName].responses++;
    }

    // Hour stats
    if (entry.submission_hour !== null) {
      if (!hourStats[entry.submission_hour]) hourStats[entry.submission_hour] = { total: 0, responses: 0 };
      hourStats[entry.submission_hour].total++;
      if (entry.response_received) hourStats[entry.submission_hour].responses++;
    }

    // Response time
    if (entry.response_time_hours) {
      totalResponseTime += entry.response_time_hours;
      responseCount++;
    }
  });

  // Find best day
  let bestDay = 'Tuesday';
  let bestDayRate = 0;
  Object.entries(dayStats).forEach(([day, stats]) => {
    const rate = stats.total > 0 ? (stats.responses / stats.total) * 100 : 0;
    if (rate > bestDayRate) {
      bestDayRate = rate;
      bestDay = day;
    }
  });

  // Find best hour
  let bestHour = '10:00 AM';
  let bestHourRate = 0;
  Object.entries(hourStats).forEach(([hour, stats]) => {
    const rate = stats.total > 0 ? (stats.responses / stats.total) * 100 : 0;
    if (rate > bestHourRate) {
      bestHourRate = rate;
      const h = parseInt(hour);
      bestHour = `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
    }
  });

  return {
    bestDay,
    bestDayResponseRate: bestDayRate,
    bestHour,
    bestHourResponseRate: bestHourRate,
    avgResponseTime: responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0,
    totalTracked: data.length,
  };
}
