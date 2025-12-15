import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";

interface ResponseVersionHistoryProps {
  responseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Version {
  id: string;
  version_number: number;
  response_text: string;
  ai_feedback: string | null;
  feedback_score: number | null;
  outcome: string | null;
  job_id: string | null;
  created_at: string;
  jobs?: {
    job_title: string;
    company_name: string;
  };
}

export function ResponseVersionHistory({ responseId, open, onOpenChange }: ResponseVersionHistoryProps) {
  const { data: versions, isLoading } = useQuery({
    queryKey: ['response-versions', responseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_response_versions')
        .select(`
          *,
          jobs:job_id (job_title, company_name)
        `)
        .eq('response_id', responseId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return data as Version[];
    },
    enabled: open,
  });

  const getOutcomeIcon = (outcome: string | null) => {
    switch (outcome) {
      case 'offer':
      case 'next_round':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getOutcomeBadgeColor = (outcome: string | null) => {
    switch (outcome) {
      case 'offer': return 'bg-green-100 text-green-800';
      case 'next_round': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}
            </div>
          ) : versions?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No version history yet</p>
          ) : (
            <div className="space-y-4">
              {versions?.map((version, index) => (
                <div key={version.id} className="border rounded-lg p-4 relative">
                  {index < (versions.length - 1) && (
                    <div className="absolute left-6 bottom-0 transform translate-y-full h-4 w-0.5 bg-border" />
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v{version.version_number}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {version.outcome && (
                        <Badge className={getOutcomeBadgeColor(version.outcome)}>
                          {getOutcomeIcon(version.outcome)}
                          <span className="ml-1 capitalize">{version.outcome.replace('_', ' ')}</span>
                        </Badge>
                      )}
                      {version.feedback_score && (
                        <Badge variant="secondary">
                          Score: {(version.feedback_score * 100).toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                  </div>

                  {version.jobs && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <ArrowRight className="h-3 w-3" />
                      Used for: {version.jobs.job_title} at {version.jobs.company_name}
                    </div>
                  )}

                  <p className="text-sm whitespace-pre-wrap">{version.response_text}</p>

                  {version.ai_feedback && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-xs font-medium mb-1">AI Feedback:</p>
                      <p className="text-sm text-muted-foreground">{version.ai_feedback}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
