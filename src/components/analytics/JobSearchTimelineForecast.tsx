import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, Clock, Target, AlertCircle } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';

interface TimelineStage {
  stage: string;
  estimatedDays: number;
  confidence: number;
  completionDate: Date;
  factors: string[];
}

export function JobSearchTimelineForecast() {
  const { data: forecastData, isLoading } = useQuery({
    queryKey: ['job-search-timeline-forecast'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch user's historical data
      const [jobs, interviews, offers] = await Promise.all([
        supabase
          .from('jobs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('interviews')
          .select('*, jobs(*)')
          .eq('user_id', user.id)
          .order('interview_date', { ascending: false }),
        supabase
          .from('jobs')
          .select('*')
          .eq('user_id', user.id)
          .or('status.ilike.%offer%,status.ilike.accepted')
          .order('created_at', { ascending: false })
      ]);

      if (jobs.error) throw jobs.error;
      if (interviews.error) throw interviews.error;
      if (offers.error) throw offers.error;

      const jobsData = jobs.data || [];
      const interviewsData = interviews.data || [];
      const offersData = offers.data || [];

      // Calculate current activity metrics
      const last30DaysJobs = jobsData.filter(j => 
        differenceInDays(new Date(), new Date(j.created_at)) <= 30
      );
      const applicationsPerWeek = (last30DaysJobs.length / 30) * 7;

      // Calculate historical conversion rates (case-insensitive)
      const responseRate = jobsData.length > 0 
        ? (jobsData.filter(j => (j.status || '').toLowerCase() !== 'applied').length / jobsData.length) * 100 
        : 20;
      
      const interviewRate = jobsData.length > 0 
        ? (interviewsData.length / jobsData.length) * 100 
        : 15;
      
      const offerRate = interviewsData.length > 0 
        ? (offersData.length / interviewsData.length) * 100 
        : 25;

      // Calculate average time between stages (case-insensitive)
      const avgTimeToResponse = jobsData
        .filter(j => (j.status || '').toLowerCase() !== 'applied' && j.updated_at)
        .reduce((sum, j) => {
          const days = differenceInDays(new Date(j.updated_at), new Date(j.created_at));
          return sum + days;
        }, 0) / Math.max(jobsData.filter(j => (j.status || '').toLowerCase() !== 'applied').length, 1) || 7;

      const avgTimeToInterview = interviewsData
        .filter(i => i.jobs && (i.jobs as any).created_at)
        .reduce((sum, i) => {
          const days = differenceInDays(new Date(i.interview_date), new Date((i.jobs as any).created_at));
          return sum + days;
        }, 0) / Math.max(interviewsData.length, 1) || 14;

      const avgTimeToOffer = offersData
        .reduce((sum, j) => {
          const days = differenceInDays(new Date(j.updated_at), new Date(j.created_at));
          return sum + days;
        }, 0) / Math.max(offersData.length, 1) || 30;

      // Predict timeline based on current activity and historical data
      const today = new Date();
      
      // Adjust predictions based on activity level
      const activityMultiplier = applicationsPerWeek >= 10 ? 0.8 : applicationsPerWeek >= 5 ? 1.0 : 1.3;
      
      const stages: TimelineStage[] = [
        {
          stage: 'First Response',
          estimatedDays: Math.round(avgTimeToResponse * activityMultiplier),
          confidence: responseRate > 30 ? 85 : responseRate > 15 ? 70 : 60,
          completionDate: addDays(today, Math.round(avgTimeToResponse * activityMultiplier)),
          factors: [
            `Response rate: ${responseRate.toFixed(1)}%`,
            `Applications per week: ${applicationsPerWeek.toFixed(1)}`,
            `Historical avg: ${avgTimeToResponse.toFixed(0)} days`
          ]
        },
        {
          stage: 'First Interview',
          estimatedDays: Math.round(avgTimeToInterview * activityMultiplier),
          confidence: interviewRate > 20 ? 80 : interviewRate > 10 ? 65 : 55,
          completionDate: addDays(today, Math.round(avgTimeToInterview * activityMultiplier)),
          factors: [
            `Interview rate: ${interviewRate.toFixed(1)}%`,
            `Current interview pipeline: ${interviewsData.filter(i => i.status === 'scheduled').length}`,
            `Historical avg: ${avgTimeToInterview.toFixed(0)} days`
          ]
        },
        {
          stage: 'Job Offer',
          estimatedDays: Math.round(avgTimeToOffer * activityMultiplier),
          confidence: offerRate > 30 ? 75 : offerRate > 15 ? 60 : 50,
          completionDate: addDays(today, Math.round(avgTimeToOffer * activityMultiplier)),
          factors: [
            `Offer rate: ${offerRate.toFixed(1)}%`,
            `Active applications: ${jobsData.filter(j => !j.archived_at).length}`,
            `Historical avg: ${avgTimeToOffer.toFixed(0)} days`
          ]
        }
      ];

      return {
        stages,
        overallConfidence: Math.round((stages.reduce((sum, s) => sum + s.confidence, 0) / stages.length)),
        activityLevel: applicationsPerWeek >= 10 ? 'high' : applicationsPerWeek >= 5 ? 'moderate' : 'low',
        recommendations: [
          applicationsPerWeek < 5 && 'Increase application volume to 5-10+ per week to accelerate timeline',
          responseRate < 20 && 'Improve application quality - current response rate is below average',
          interviewRate < 15 && 'Focus on better role targeting and resume optimization',
          offerRate < 20 && 'Enhance interview preparation to improve offer conversion'
        ].filter(Boolean) as string[]
      };
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Job Search Timeline Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading forecast...</div>
        </CardContent>
      </Card>
    );
  }

  if (!forecastData) return null;

  const getActivityColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-50 dark:bg-green-950/30';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30';
      case 'low': return 'text-red-600 bg-red-50 dark:bg-red-950/30';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-950/30';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 75) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Job Search Timeline Forecast
        </CardTitle>
        <CardDescription>
          Predicted timeline based on current activity and historical performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Confidence */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Overall Forecast Confidence</p>
            <p className="text-2xl font-bold">{forecastData.overallConfidence}%</p>
          </div>
          <Badge className={getActivityColor(forecastData.activityLevel)}>
            {forecastData.activityLevel.toUpperCase()} Activity
          </Badge>
        </div>

        {/* Timeline Stages */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Target className="h-4 w-4" />
            Predicted Milestones
          </h4>
          
          {forecastData.stages.map((stage, index) => (
            <div key={stage.stage} className="space-y-3 p-4 border rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm sm:text-base">{stage.stage}</span>
                    <Badge variant="outline" className="text-xs">
                      ~{stage.estimatedDays} days
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span>Expected by {format(stage.completionDate, 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs sm:text-sm text-muted-foreground">Confidence</p>
                  <p className={`text-lg sm:text-xl font-bold ${getConfidenceColor(stage.confidence)}`}>
                    {stage.confidence}%
                  </p>
                </div>
              </div>
              
              <Progress value={stage.confidence} className="h-2" />
              
              <div className="text-xs text-muted-foreground space-y-1.5">
                {stage.factors.map((factor, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="flex-shrink-0">•</span>
                    <span className="flex-1">{factor}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {forecastData.recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Ways to Accelerate Timeline
            </h4>
            <div className="space-y-2">
              {forecastData.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-900 dark:text-blue-100">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground border-t pt-4">
          <p className="leading-relaxed">
            * Predictions are based on your historical data and current activity level. 
            Actual timeline may vary based on market conditions, role competitiveness, and application quality.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
