import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Clock, Briefcase, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface InlineInterviewCalendarProps {
  jobs: any[];
  onViewJob: (job: any) => void;
  onInterviewClick?: (jobId: string) => void;
}

export function InlineInterviewCalendar({ jobs, onViewJob, onInterviewClick }: InlineInterviewCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [interviews, setInterviews] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    fetchInterviews();

    // Set up real-time subscription for interviews
    const channel = supabase
      .channel('inline_calendar_interviews')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interviews'
        },
        () => {
          fetchInterviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInterviews = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('interviews')
        .select(`
          *,
          jobs (
            id,
            job_title,
            company_name
          )
        `)
        .eq('user_id', user.id)
        .order('interview_date', { ascending: true });

      if (error) throw error;
      setInterviews(data || []);
    } catch (error) {
      console.error('Error fetching interviews:', error);
    }
  };

  const getJobsForDate = (date: Date) => {
    return jobs.filter(job => {
      if (!job.application_deadline || job.is_archived) return false;
      const deadline = new Date(job.application_deadline);
      return deadline.toDateString() === date.toDateString();
    });
  };

  const getInterviewsForDate = (date: Date) => {
    return interviews.filter(interview => {
      const interviewDate = new Date(interview.interview_date);
      return interviewDate.toDateString() === date.toDateString();
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDeadlineUrgency = (date: Date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const deadline = new Date(date);
    deadline.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return 'bg-destructive/20 border-destructive';
    if (daysUntil <= 3) return 'bg-destructive/10 border-destructive/50';
    if (daysUntil <= 7) return 'bg-orange-100 dark:bg-orange-900/20 border-orange-500/50';
    return 'bg-green-100 dark:bg-green-900/20 border-green-500/50';
  };

  return (
    <Card className="w-full h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarIcon className="h-4 w-4" />
              Interview & Deadline Calendar
            </CardTitle>
            <CardDescription className="text-xs">View all your upcoming interviews and application deadlines</CardDescription>
          </div>
        </div>
      </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={prevMonth} className="h-7 w-7 p-0">
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <h3 className="text-sm font-semibold">
                {monthNames[month]} {year}
              </h3>
              <Button variant="outline" size="sm" onClick={nextMonth} className="h-7 w-7 p-0">
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-0.5">
            {dayNames.map(day => (
              <div key={day} className="text-center font-semibold text-[8px] p-0.5">
                {day.substring(0, 1)}
              </div>
            ))}
            
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(year, month, day);
              const jobsOnThisDay = getJobsForDate(date);
              const interviewsOnThisDay = getInterviewsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const hasItems = jobsOnThisDay.length > 0 || interviewsOnThisDay.length > 0;
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              
              return (
                <Popover key={day} open={popoverOpen && isSelected} onOpenChange={(open) => {
                  if (!open && isSelected) {
                    setPopoverOpen(false);
                    setSelectedDate(null);
                  }
                }}>
                  <PopoverTrigger asChild>
                    <button
                      onClick={() => {
                        if (hasItems) {
                          setSelectedDate(date);
                          setPopoverOpen(true);
                        }
                      }}
                      className={`aspect-square p-0.5 rounded border text-[7px] ${
                        isToday ? 'border-primary border-2' : 'border-border'
                      } ${hasItems ? getDeadlineUrgency(date) : 'bg-background'} ${
                        isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
                      } ${hasItems ? 'cursor-pointer hover:brightness-95' : ''} flex flex-col transition-all`}
                    >
                      <div className={`font-semibold ${isToday ? 'text-primary' : ''}`}>
                        {day}
                      </div>
                      <div className="space-y-0.5 overflow-hidden flex-1">
                        {(jobsOnThisDay.length > 0 || interviewsOnThisDay.length > 0) && (
                          <div className="flex gap-0.5 flex-wrap">
                            {jobsOnThisDay.map(job => (
                              <div
                                key={job.id}
                                className="h-1.5 w-1.5 rounded-full bg-blue-500 ring-1 ring-blue-700"
                                title={`Deadline: ${job.job_title} at ${job.company_name}`}
                              />
                            ))}
                            {interviewsOnThisDay.map(interview => (
                              <div
                                key={interview.id}
                                className="h-1.5 w-1.5 rounded-full bg-purple-500 ring-1 ring-purple-700"
                                title={`Interview: ${interview.jobs?.job_title || 'Interview'} - ${new Date(interview.interview_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  </PopoverTrigger>
                  {hasItems && (
                    <PopoverContent className="w-80 p-0" align="center" side="bottom">
                      <div className="p-4 space-y-3">
                        <div className="font-semibold text-sm border-b pb-2">
                          {format(date, 'EEEE, MMMM d, yyyy')}
                        </div>
                        
                        {jobsOnThisDay.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-full bg-blue-500 ring-1 ring-blue-700" />
                              Application Deadlines
                            </div>
                            {jobsOnThisDay.map(job => (
                              <button
                                key={job.id}
                                onClick={() => {
                                  onViewJob(job);
                                  setPopoverOpen(false);
                                  setSelectedDate(null);
                                }}
                                className="w-full text-left p-2 rounded-lg hover:bg-accent transition-colors border"
                              >
                                <div className="font-medium text-sm">{job.job_title}</div>
                                <div className="text-xs text-muted-foreground">{job.company_name}</div>
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Due today
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {interviewsOnThisDay.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-full bg-purple-500 ring-1 ring-purple-700" />
                              Interviews
                            </div>
                            {interviewsOnThisDay.map(interview => (
                              <button
                                key={interview.id}
                                onClick={() => {
                                  if (onInterviewClick) {
                                    onInterviewClick(interview.job_id);
                                  } else {
                                    const job = jobs.find(j => j.id === interview.job_id);
                                    if (job) onViewJob(job);
                                  }
                                  setPopoverOpen(false);
                                  setSelectedDate(null);
                                }}
                                className="w-full text-left p-2 rounded-lg hover:bg-accent transition-colors border"
                              >
                                <div className="font-medium text-sm">
                                  {interview.jobs?.job_title || 'Interview'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {interview.jobs?.company_name || ''}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(interview.interview_date), 'h:mm a')}
                                  {interview.interview_type && ` • ${interview.interview_type}`}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  )}
                </Popover>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 text-[10px] pt-3 border-t">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-500 ring-1 ring-blue-700" />
                <span className="font-medium">Deadlines</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-purple-500 ring-1 ring-purple-700" />
                <span className="font-medium">Interviews</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded bg-destructive/20 border border-destructive" />
                <span>Overdue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded bg-destructive/10 border border-destructive/50" />
                <span>1-3 days</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded bg-orange-100 dark:bg-orange-900/20 border border-orange-500/50" />
                <span>4-7 days</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded bg-green-100 dark:bg-green-900/20 border border-green-500/50" />
                <span>7+ days</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
