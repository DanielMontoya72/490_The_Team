import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckSquare, Calendar } from "lucide-react";
import { format } from "date-fns";
import { InterviewPreparationChecklist } from "./InterviewPreparationChecklist";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function AllInterviewsPreparationChecklists() {
  const { data: interviews, isLoading, refetch } = useQuery({
    queryKey: ['all-interviews-for-checklist'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('interviews')
        .select(`
          *,
          jobs (
            job_title,
            company_name
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['scheduled', 'in_progress'])
        .order('interview_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Set up real-time subscription for interview updates
  useQuery({
    queryKey: ['interviews-subscription'],
    queryFn: async () => {
      const channel = supabase
        .channel('interviews_prep_realtime')
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
            <CheckSquare className="h-6 w-6" />
            Interview Preparation Checklists
          </CardTitle>
          <CardDescription>
            Manage preparation tasks for all your upcoming interviews
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No upcoming interviews scheduled. Schedule an interview to generate a preparation checklist.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-6 w-6" />
            Interview Preparation Checklists
          </CardTitle>
          <CardDescription>
            Track preparation tasks for {interviews.length} upcoming interview{interviews.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
      </Card>

      <Accordion type="multiple" className="w-full space-y-4">
        {interviews.map((interview: any) => {
          const interviewDate = new Date(interview.interview_date);
          const isUpcoming = interviewDate > new Date();
          const daysUntil = Math.ceil((interviewDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          return (
            <AccordionItem key={interview.id} value={interview.id} className="border rounded-lg">
              <AccordionTrigger className="hover:no-underline px-6">
                <div className="flex items-start justify-between w-full pr-4">
                  <div className="text-left space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">
                        {interview.jobs.job_title} - {interview.jobs.company_name}
                      </h3>
                      {isUpcoming && daysUntil <= 7 && (
                        <Badge variant="destructive">
                          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(interviewDate, 'EEEE, MMMM d, yyyy')} at {format(interviewDate, 'h:mm a')}
                      </div>
                      <Badge variant="outline">
                        {interview.interview_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    {interview.preparation_tasks && Array.isArray(interview.preparation_tasks) && (
                      <div className="text-sm text-muted-foreground">
                        {interview.preparation_tasks.filter((t: any) => t.completed).length} of {interview.preparation_tasks.length} tasks completed
                      </div>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-2">
                <InterviewPreparationChecklist interviewId={interview.id} />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
