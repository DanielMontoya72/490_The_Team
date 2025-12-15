import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Target, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface QualityScoreBadgeProps {
  jobId: string;
}

export const QualityScoreBadge: React.FC<QualityScoreBadgeProps> = ({ jobId }) => {
  const { data: qualityScore } = useQuery({
    queryKey: ['quality-score-badge', jobId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('application_quality_scores')
        .select('overall_score, meets_threshold')
        .eq('job_id', jobId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) return null;
      return data;
    },
    staleTime: 30000
  });

  if (!qualityScore) return null;

  const getScoreVariant = (score: number, meetsThreshold: boolean) => {
    if (!meetsThreshold) return 'destructive';
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'outline';
  };

  const getScoreIcon = (score: number, meetsThreshold: boolean) => {
    if (!meetsThreshold) return <AlertTriangle className="h-3 w-3" />;
    if (score >= 80) return <CheckCircle2 className="h-3 w-3" />;
    return <Target className="h-3 w-3" />;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={getScoreVariant(qualityScore.overall_score, qualityScore.meets_threshold)}
            className="gap-1 cursor-help"
          >
            {getScoreIcon(qualityScore.overall_score, qualityScore.meets_threshold)}
            Q:{qualityScore.overall_score}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Quality Score: {qualityScore.overall_score}/100</p>
          <p className="text-xs text-muted-foreground">
            {qualityScore.meets_threshold 
              ? 'Ready for submission' 
              : 'Below minimum threshold (70)'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default QualityScoreBadge;
