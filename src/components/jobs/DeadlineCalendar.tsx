import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface DeadlineCalendarProps {
  jobs: any[];
  onViewJob: (job: any) => void;
}

export function DeadlineCalendar({ jobs, onViewJob }: DeadlineCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [interviews, setInterviews] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      fetchInterviews();
    }
  }, [open]);

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarIcon className="h-4 w-4 mr-2" />
          Calendar View
        </Button>
      </DialogTrigger>
      <DialogContent className="!max-w-[1400px] w-[90vw] max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl">Deadline Calendar</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={prevMonth} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-xl font-semibold">
              {monthNames[month]} {year}
            </div>
            <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {dayNames.map(day => (
              <div key={day} className="text-center font-semibold text-base p-3">
                {day}
              </div>
            ))}
            
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="p-3" />
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(year, month, day);
              const jobsOnThisDay = getJobsForDate(date);
              const interviewsOnThisDay = getInterviewsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const hasItems = jobsOnThisDay.length > 0 || interviewsOnThisDay.length > 0;
              
              return (
                <div
                  key={day}
                  className={`min-h-[140px] p-2.5 rounded-lg border ${
                    isToday ? 'border-primary border-2' : 'border-border'
                  } ${hasItems ? getDeadlineUrgency(date) : 'bg-background'}`}
                >
                  <div className={`text-base font-semibold mb-2 ${isToday ? 'text-primary' : ''}`}>
                    {day}
                  </div>
                  <div className="space-y-1.5 overflow-y-auto max-h-[100px]">
                    {jobsOnThisDay.map(job => (
                      <button
                        key={job.id}
                        onClick={() => {
                          onViewJob(job);
                          setOpen(false);
                        }}
                        className="w-full text-left text-xs p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-start gap-1.5 shadow-sm"
                      >
                        <Briefcase className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2 leading-tight">{job.job_title}</span>
                      </button>
                    ))}
                    {interviewsOnThisDay.map(interview => (
                      <button
                        key={interview.id}
                        onClick={() => {
                          if (interview.jobs) {
                            const job = jobs.find(j => j.id === interview.job_id);
                            if (job) {
                              onViewJob(job);
                              setOpen(false);
                            }
                          }
                        }}
                        className="w-full text-left text-xs p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-start gap-1.5 shadow-sm"
                      >
                        <Clock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="line-clamp-1 font-medium leading-tight">
                            {new Date(interview.interview_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="line-clamp-1 text-muted-foreground leading-tight">
                            {interview.jobs?.job_title || 'Interview'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 text-sm pt-4 border-t">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30 border border-blue-500/50" />
                <span>Deadlines</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-purple-100 dark:bg-purple-900/30 border border-purple-500/50" />
                <span>Interviews</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-destructive/20 border border-destructive" />
                <span>Overdue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-destructive/10 border border-destructive/50" />
                <span>1-3 days</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-100 dark:bg-orange-900/20 border border-orange-500/50" />
                <span>4-7 days</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/20 border border-green-500/50" />
                <span>7+ days</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
