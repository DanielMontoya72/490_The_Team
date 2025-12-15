import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Video, User } from "lucide-react";
import { format } from "date-fns";
import { InterviewPreparationChecklist } from "./InterviewPreparationChecklist";
import { InterviewFollowUp } from "./InterviewFollowUp";

interface InterviewListProps {
  jobId: string;
}

export function InterviewList({ jobId }: InterviewListProps) {
  const { data: interviews, isLoading, refetch } = useQuery({
    queryKey: ['interviews', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('job_id', jobId)
        .order('interview_date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Set up real-time subscription for interview updates
  useQuery({
    queryKey: ['interviews-list-subscription', jobId],
    queryFn: async () => {
      const channel = supabase
        .channel(`interviews_list_${jobId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'interviews',
            filter: `job_id=eq.${jobId}`
          },
          () => {
            refetch();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Interviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading interviews...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!interviews || interviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Interviews</CardTitle>
          <CardDescription>
            Schedule an interview in the Interviews tab to see preparation checklists and follow-ups here
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduled Interviews & Preparation</CardTitle>
        <CardDescription>
          Manage preparation checklists and follow-ups for each interview
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {interviews.map((interview) => (
            <AccordionItem key={interview.id} value={interview.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div>
                    <div className="font-semibold">
                      {interview.interview_type.charAt(0).toUpperCase() + interview.interview_type.slice(1).replace('_', ' ')} Interview
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(interview.interview_date), 'PPP')}
                      </span>
                      <Badge variant={interview.status === 'scheduled' ? 'default' : interview.status === 'completed' ? 'secondary' : 'outline'}>
                        {interview.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6 pt-4">
                  <div className="grid gap-4 text-sm">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Date & Time</div>
                        <div className="text-muted-foreground">
                          {format(new Date(interview.interview_date), 'PPP p')} ({interview.duration_minutes} minutes)
                        </div>
                      </div>
                    </div>
                    {interview.location && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Location</div>
                          <div className="text-muted-foreground">{interview.location}</div>
                        </div>
                      </div>
                    )}
                    {interview.meeting_link && (
                      <div className="flex items-start gap-2">
                        <Video className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Meeting Link</div>
                          <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {interview.meeting_link}
                          </a>
                        </div>
                      </div>
                    )}
                    {interview.interviewer_name && (
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Interviewer</div>
                          <div className="text-muted-foreground">
                            {interview.interviewer_name}
                            {interview.interviewer_email && ` (${interview.interviewer_email})`}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-6">
                    <InterviewPreparationChecklist interviewId={interview.id} />
                  </div>

                  <div className="border-t pt-6">
                    <InterviewFollowUp interviewId={interview.id} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
