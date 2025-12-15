import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, CheckCircle, Timer } from 'lucide-react';

interface TimingRecommendationBadgeProps {
  compact?: boolean;
}

export function TimingRecommendationBadge({ compact = true }: TimingRecommendationBadgeProps) {
  const [recommendation, setRecommendation] = useState<{
    action: 'submit_now' | 'wait';
    message: string;
  } | null>(null);

  useEffect(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isGoodHour = hour >= 9 && hour <= 11;
    const isFridayAfternoon = dayOfWeek === 5 && hour >= 15;
    const isMondayMorning = dayOfWeek === 1 && hour < 10;
    const isAfternoonOk = hour >= 14 && hour <= 17 && dayOfWeek !== 5;

    if (!isWeekday) {
      setRecommendation({ action: 'wait', message: 'Wait until Tuesday' });
    } else if (isFridayAfternoon) {
      setRecommendation({ action: 'wait', message: 'Wait until next week' });
    } else if (isMondayMorning) {
      setRecommendation({ action: 'wait', message: 'Wait until 10 AM' });
    } else if (isGoodHour) {
      setRecommendation({ action: 'submit_now', message: 'Great time to apply!' });
    } else if (isAfternoonOk) {
      setRecommendation({ action: 'submit_now', message: 'Good time to apply' });
    } else if (hour < 9) {
      setRecommendation({ action: 'wait', message: 'Wait until 9 AM' });
    } else if (hour >= 17) {
      setRecommendation({ action: 'wait', message: 'Wait until tomorrow' });
    } else {
      setRecommendation({ action: 'submit_now', message: 'Acceptable time' });
    }
  }, []);

  if (!recommendation) return null;

  const isGoodTime = recommendation.action === 'submit_now';

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={isGoodTime ? 'default' : 'secondary'}
              className={`gap-1 ${isGoodTime ? 'bg-green-500 hover:bg-green-600' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
            >
              {isGoodTime ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <Timer className="h-3 w-3" />
              )}
              <span className="text-xs">
                {isGoodTime ? 'Good Time' : 'Wait'}
              </span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{recommendation.message}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={`flex items-center gap-2 p-2 rounded-md ${
      isGoodTime ? 'bg-green-500/10' : 'bg-amber-500/10'
    }`}>
      {isGoodTime ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <Timer className="h-4 w-4 text-amber-500" />
      )}
      <span className="text-sm">{recommendation.message}</span>
    </div>
  );
}
