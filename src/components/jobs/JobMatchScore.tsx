import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, TrendingUp, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface JobMatchScoreProps {
  jobId: string;
  compact?: boolean;
  showRefresh?: boolean;
  onMatchClick?: () => void;
}

export function JobMatchScore({ jobId, compact = false, showRefresh = true, onMatchClick }: JobMatchScoreProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch the most recent match analysis
  const { data: analysis, isLoading } = useQuery({
    queryKey: ['job-match-analysis', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_match_analyses')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Generate new analysis
  const generateAnalysis = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('analyze-job-match', {
        body: { jobId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-match-analysis', jobId] });
      toast({
        title: "Match Analysis Complete",
        description: "Job match score has been calculated.",
      });
      // Remind user to regenerate predictions
      setTimeout(() => {
        toast({
          title: "📊 Update Your Interview Predictions",
          description: "Job match analysis completed! Regenerate interview success predictions to see your updated Role Match Score.",
          duration: 7000,
        });
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze job match",
        variant: "destructive",
      });
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500 text-white';
    if (score >= 60) return 'bg-blue-500 text-white';
    if (score >= 40) return 'bg-yellow-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Weak Match';
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!analysis) {
    return (
      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        onClick={() => generateAnalysis.mutate()}
        disabled={generateAnalysis.isPending}
        className="gap-2"
      >
        {generateAnalysis.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Target className="h-4 w-4" />
            Calculate Match
          </>
        )}
      </Button>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge 
          className={cn(
            "font-semibold",
            getScoreColor(analysis.overall_score),
            onMatchClick && "cursor-pointer hover:opacity-80 transition-opacity"
          )}
          onClick={(e) => {
            if (onMatchClick) {
              e.stopPropagation();
              onMatchClick();
            }
          }}
        >
          {analysis.overall_score}% Match
        </Badge>
        {showRefresh && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => generateAnalysis.mutate()}
            disabled={generateAnalysis.isPending}
          >
            {generateAnalysis.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex items-center justify-center rounded-full h-16 w-16 font-bold text-2xl",
          getScoreColor(analysis.overall_score)
        )}>
          {analysis.overall_score}
        </div>
        <div>
          <p className="font-semibold text-lg">{getScoreLabel(analysis.overall_score)}</p>
          <p className="text-sm text-muted-foreground">
            Updated {new Date(analysis.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      {showRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateAnalysis.mutate()}
          disabled={generateAnalysis.isPending}
          className="gap-2"
        >
          {generateAnalysis.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Recalculating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      )}
    </div>
  );
}
