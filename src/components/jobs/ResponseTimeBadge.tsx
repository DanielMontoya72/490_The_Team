import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ResponseTimeBadgeProps {
  jobId: string;
  appliedDate?: string;
  status?: string;
}

export function ResponseTimeBadge({ jobId, appliedDate, status }: ResponseTimeBadgeProps) {
  const [prediction, setPrediction] = useState<{
    predicted_min_days: number;
    predicted_max_days: number;
    predicted_avg_days: number;
    confidence_level: number;
    is_overdue: boolean;
    suggested_follow_up_date: string;
  } | null>(null);
  const [daysSinceApplied, setDaysSinceApplied] = useState(0);

  useEffect(() => {
    if (appliedDate) {
      setDaysSinceApplied(differenceInDays(new Date(), new Date(appliedDate)));
    }
    fetchPrediction();
  }, [jobId, appliedDate]);

  const fetchPrediction = async () => {
    try {
      const { data, error } = await supabase
        .from('response_time_predictions')
        .select('predicted_min_days, predicted_max_days, predicted_avg_days, confidence_level, is_overdue, suggested_follow_up_date')
        .eq('job_id', jobId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setPrediction(data);
    } catch (error) {
      console.error('Error fetching prediction:', error);
    }
  };

  // Don't show for terminal statuses
  if (status && ['offer', 'rejected', 'withdrawn', 'accepted'].includes(status)) {
    return null;
  }

  if (!prediction) return null;

  const isOverdue = prediction.is_overdue || (appliedDate && daysSinceApplied > prediction.predicted_max_days);
  const isTakingLonger = appliedDate && daysSinceApplied > prediction.predicted_avg_days && !isOverdue;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {isOverdue ? (
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              Overdue
            </Badge>
          ) : isTakingLonger ? (
            <Badge variant="outline" className="text-xs gap-1 border-yellow-500 text-yellow-600">
              <Clock className="h-3 w-3" />
              {prediction.predicted_avg_days}-{prediction.predicted_max_days}d
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs gap-1">
              <Clock className="h-3 w-3" />
              {prediction.predicted_min_days}-{prediction.predicted_max_days}d
            </Badge>
          )}
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p className="font-medium">Response Time Prediction</p>
            <p>Expected: {prediction.predicted_min_days}-{prediction.predicted_max_days} days</p>
            <p>Average: ~{prediction.predicted_avg_days} days</p>
            <p>Confidence: {prediction.confidence_level}%</p>
            {appliedDate && (
              <p className="text-muted-foreground">
                {daysSinceApplied} days since applied
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
