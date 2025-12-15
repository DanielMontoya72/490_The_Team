import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CompetitiveBadgeProps {
  jobId: string;
}

export function CompetitiveBadge({ jobId }: CompetitiveBadgeProps) {
  const { data: analysis } = useQuery({
    queryKey: ['job-competitive-analysis', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_competitive_analysis')
        .select('competitive_score, interview_likelihood')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  if (!analysis) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (score >= 40) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getLikelihoodEmoji = (likelihood: string) => {
    if (likelihood === 'high') return '🔥';
    if (likelihood === 'medium') return '👍';
    return '⚡';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${getScoreColor(analysis.competitive_score || 0)} cursor-help`}
          >
            <Target className="h-3 w-3 mr-1" />
            C:{analysis.competitive_score}
            {analysis.interview_likelihood && (
              <span className="ml-1">{getLikelihoodEmoji(analysis.interview_likelihood)}</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Competitive Score: {analysis.competitive_score}/100</p>
          <p>Interview Likelihood: {analysis.interview_likelihood}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
