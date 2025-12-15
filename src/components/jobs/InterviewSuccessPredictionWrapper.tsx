import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { InterviewSuccessPrediction } from "./InterviewSuccessPrediction";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, AlertCircle } from "lucide-react";

interface InterviewSuccessPredictionWrapperProps {
  jobId: string;
}

export function InterviewSuccessPredictionWrapper({ jobId }: InterviewSuccessPredictionWrapperProps) {
  const { data: interviews } = useQuery({
    queryKey: ['interviews', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('job_id', jobId)
        .eq('status', 'scheduled')
        .order('interview_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  if (!interviews || interviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Interview Success Prediction
          </CardTitle>
          <CardDescription>
            AI-powered analysis of your preparation and success probability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">Schedule an interview first to get success predictions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show prediction for the next upcoming interview
  const nextInterview = interviews[0];

  return <InterviewSuccessPrediction interviewId={nextInterview.id} jobId={jobId} />;
}
