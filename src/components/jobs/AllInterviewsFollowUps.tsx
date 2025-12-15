import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail } from "lucide-react";
import { format } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { InterviewFollowUp } from "./InterviewFollowUp";

interface InterviewWithJob {
  id: string;
  interview_type: string;
  interview_date: string;
  status: string;
  jobs: {
    job_title: string;
    company_name: string;
  };
}

export function AllInterviewsFollowUps() {
  const [expandedInterview, setExpandedInterview] = useState<string | undefined>();

  const { data: interviews, isLoading, refetch } = useQuery({
    queryKey: ['all-interviews-for-followups'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('interviews')
        .select(`
          id,
          interview_type,
          interview_date,
          status,
          jobs!inner(
            job_title,
            company_name
          )
        `)
        .eq('jobs.user_id', user.id)
        .order('interview_date', { ascending: false });

      if (error) throw error;
      return data as InterviewWithJob[];
    },
  });

  // Set up real-time subscription for interview updates
  useQuery({
    queryKey: ['interviews-followup-subscription'],
    queryFn: async () => {
      const channel = supabase
        .channel('interviews_followup_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'interviews'
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

  const { data: followUpCounts } = useQuery({
    queryKey: ['follow-up-counts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('interview_follow_ups')
        .select('interview_id, sent_at, response_received');

      if (error) throw error;

      // Count by interview
      const counts = data.reduce((acc, followUp) => {
        if (!acc[followUp.interview_id]) {
          acc[followUp.interview_id] = { total: 0, sent: 0, responded: 0 };
        }
        acc[followUp.interview_id].total++;
        if (followUp.sent_at) acc[followUp.interview_id].sent++;
        if (followUp.response_received) acc[followUp.interview_id].responded++;
        return acc;
      }, {} as Record<string, { total: number; sent: number; responded: number }>);

      return counts;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="default" className="bg-blue-600">Scheduled</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!interviews || interviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Interview Follow-Up Templates
          </CardTitle>
          <CardDescription>
            Generate and manage professional follow-up communications for all your interviews
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Mail className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            No interviews yet. Schedule an interview to create follow-up templates.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group interviews by status for tabs
  const scheduledInterviews = interviews.filter(i => i.status === 'scheduled' || i.status === 'in_progress');
  const completedInterviews = interviews.filter(i => i.status === 'completed');
  const allInterviews = interviews;

  const InterviewsList = ({ interviewsList }: { interviewsList: InterviewWithJob[] }) => (
    <Accordion
      type="single"
      collapsible
      value={expandedInterview}
      onValueChange={setExpandedInterview}
      className="space-y-2"
    >
      {interviewsList.map((interview) => {
        const counts = followUpCounts?.[interview.id] || { total: 0, sent: 0, responded: 0 };
        const interviewDate = new Date(interview.interview_date);
        const isPast = interviewDate < new Date();

        return (
          <AccordionItem key={interview.id} value={interview.id} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-start justify-between w-full pr-4">
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold">{interview.jobs.job_title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {interview.jobs.company_name}
                    </Badge>
                    {getStatusBadge(interview.status)}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>{format(interviewDate, 'MMM d, yyyy')}</span>
                    <span>•</span>
                    <span className="capitalize">{interview.interview_type.replace('_', ' ')}</span>
                    {counts.total > 0 && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {counts.total} {counts.total === 1 ? 'follow-up' : 'follow-ups'}
                          </Badge>
                          {counts.sent > 0 && (
                            <Badge variant="default" className="bg-blue-600 text-xs">
                              {counts.sent} sent
                            </Badge>
                          )}
                          {counts.responded > 0 && (
                            <Badge variant="default" className="bg-green-600 text-xs">
                              {counts.responded} responded
                            </Badge>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-4 border-t">
                <InterviewFollowUp interviewId={interview.id} />
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Interview Follow-Up Templates
        </CardTitle>
        <CardDescription>
          Generate and manage professional follow-up communications for all your interviews
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all">
              All Interviews ({allInterviews.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Upcoming ({scheduledInterviews.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedInterviews.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {allInterviews.length > 0 ? (
              <InterviewsList interviewsList={allInterviews} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No interviews found
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming">
            {scheduledInterviews.length > 0 ? (
              <InterviewsList interviewsList={scheduledInterviews} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No upcoming interviews
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedInterviews.length > 0 ? (
              <InterviewsList interviewsList={completedInterviews} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No completed interviews
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
