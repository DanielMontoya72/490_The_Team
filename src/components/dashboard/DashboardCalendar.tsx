import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Clock, Cake as CakeIcon } from 'lucide-react';
import { format } from 'date-fns';

interface DashboardCalendarProps {
  jobs: any[];
  interviews: any[];
  informationalInterviews: any[];
  deadlineReminders: any[];
  birthdays: any[];
  onNavigate: (path: string) => void;
}

export function DashboardCalendar({ 
  jobs, 
  interviews, 
  informationalInterviews,
  deadlineReminders,
  birthdays,
  onNavigate 
}: DashboardCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

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

  const getInfoInterviewsForDate = (date: Date) => {
    return informationalInterviews.filter(interview => {
      const interviewDate = new Date(interview.interview_date);
      return interviewDate.toDateString() === date.toDateString();
    });
  };

  const getRemindersForDate = (date: Date) => {
    return deadlineReminders.filter(reminder => {
      const reminderDate = new Date(reminder.reminder_date);
      return reminderDate.toDateString() === date.toDateString();
    });
  };

  const getBirthdaysForDate = (date: Date) => {
    return birthdays.filter(contact => {
      const birthdayDate = new Date(contact.nextBirthday);
      return birthdayDate.toDateString() === date.toDateString();
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

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={prevMonth}
          className="h-7 w-7 p-0"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-semibold text-sm">
          {monthNames[month]} {year}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={nextMonth}
          className="h-7 w-7 p-0"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
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
          const infoInterviewsOnThisDay = getInfoInterviewsForDate(date);
          const remindersOnThisDay = getRemindersForDate(date);
          const birthdaysOnThisDay = getBirthdaysForDate(date);
          const isToday = date.toDateString() === new Date().toDateString();
          const hasItems = jobsOnThisDay.length > 0 || interviewsOnThisDay.length > 0 || 
                          infoInterviewsOnThisDay.length > 0 || remindersOnThisDay.length > 0 || 
                          birthdaysOnThisDay.length > 0;
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
                  } ${hasItems ? 'bg-accent/10' : 'bg-background'} ${
                    isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
                  } ${hasItems ? 'cursor-pointer hover:brightness-95' : ''} flex flex-col transition-all`}
                  aria-label={hasItems ? `${format(date, 'MMMM d, yyyy')} - View ${jobsOnThisDay.length + interviewsOnThisDay.length + infoInterviewsOnThisDay.length + remindersOnThisDay.length + birthdaysOnThisDay.length} item${jobsOnThisDay.length + interviewsOnThisDay.length + infoInterviewsOnThisDay.length + remindersOnThisDay.length + birthdaysOnThisDay.length > 1 ? 's' : ''}` : `${format(date, 'MMMM d, yyyy')} - No events`}
                  disabled={!hasItems}
                >
                  <div className={`font-semibold text-xs ${isToday ? 'text-primary' : ''}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5 overflow-hidden flex-1">
                    {hasItems && (
                      <div className="flex gap-0.5 flex-wrap justify-center">
                        {jobsOnThisDay.map((_, idx) => (
                          <div
                            key={`job-${idx}`}
                            className="h-1.5 w-1.5 rounded-full bg-blue-500 ring-1 ring-blue-700"
                          />
                        ))}
                        {interviewsOnThisDay.map((_, idx) => (
                          <div
                            key={`int-${idx}`}
                            className="h-1.5 w-1.5 rounded-full bg-purple-500 ring-1 ring-purple-700"
                          />
                        ))}
                        {infoInterviewsOnThisDay.map((_, idx) => (
                          <div
                            key={`info-${idx}`}
                            className="h-1.5 w-1.5 rounded-full bg-indigo-500 ring-1 ring-indigo-700"
                          />
                        ))}
                        {remindersOnThisDay.map((_, idx) => (
                          <div
                            key={`rem-${idx}`}
                            className="h-1.5 w-1.5 rounded-full bg-amber-500 ring-1 ring-amber-700"
                          />
                        ))}
                        {birthdaysOnThisDay.map((_, idx) => (
                          <div
                            key={`bday-${idx}`}
                            className="h-1.5 w-1.5 rounded-full bg-pink-500 ring-1 ring-pink-700"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              </PopoverTrigger>
              {hasItems && (
                <PopoverContent className="w-80 p-0 max-h-96 overflow-y-auto" align="center" side="bottom">
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
                              onNavigate('/jobs');
                              setPopoverOpen(false);
                              setSelectedDate(null);
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-accent transition-colors border"
                          >
                            <div className="font-medium text-sm">{job.job_title}</div>
                            <div className="text-xs text-muted-foreground">{job.company_name}</div>
                          </button>
                        ))}
                      </div>
                    )}

                    {interviewsOnThisDay.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-purple-500 ring-1 ring-purple-700" />
                          Job Interviews
                        </div>
                        {interviewsOnThisDay.map(interview => (
                          <button
                            key={interview.id}
                            onClick={() => {
                              onNavigate('/jobs');
                              setPopoverOpen(false);
                              setSelectedDate(null);
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-accent transition-colors border"
                          >
                            <div className="font-medium text-sm">{interview.jobs?.job_title || 'Interview'}</div>
                            <div className="text-xs text-muted-foreground">{interview.jobs?.company_name}</div>
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(interview.interview_date), 'h:mm a')}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {infoInterviewsOnThisDay.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-indigo-500 ring-1 ring-indigo-700" />
                          Informational Interviews
                        </div>
                        {infoInterviewsOnThisDay.map(interview => (
                          <button
                            key={interview.id}
                            onClick={() => {
                              onNavigate('/networking');
                              setPopoverOpen(false);
                              setSelectedDate(null);
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-accent transition-colors border"
                          >
                            <div className="font-medium text-sm">{interview.candidate_name}</div>
                            {interview.candidate_company && (
                              <div className="text-xs text-muted-foreground">{interview.candidate_company}</div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(interview.interview_date), 'h:mm a')}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {remindersOnThisDay.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-amber-500 ring-1 ring-amber-700" />
                          Reminders
                        </div>
                        {remindersOnThisDay.map(reminder => (
                          <button
                            key={reminder.id}
                            onClick={() => {
                              onNavigate('/jobs');
                              setPopoverOpen(false);
                              setSelectedDate(null);
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-accent transition-colors border"
                          >
                            <div className="font-medium text-sm">{reminder.jobs?.job_title}</div>
                            <div className="text-xs text-muted-foreground">{reminder.jobs?.company_name}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {reminder.reminder_type}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {birthdaysOnThisDay.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-pink-500 ring-1 ring-pink-700" />
                          Birthdays
                        </div>
                        {birthdaysOnThisDay.map(contact => (
                          <button
                            key={contact.id}
                            onClick={() => {
                              onNavigate('/networking');
                              setPopoverOpen(false);
                              setSelectedDate(null);
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-accent transition-colors border"
                          >
                            <div className="font-medium text-sm flex items-center gap-2">
                              <CakeIcon className="h-3 w-3" />
                              {contact.name}
                            </div>
                            <div className="text-xs text-muted-foreground">Birthday</div>
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

      {/* Legend */}
      <div className="mt-3 pt-3 border-t space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full bg-blue-500 ring-1 ring-blue-700" />
          <span className="text-muted-foreground">Deadlines</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full bg-purple-500 ring-1 ring-purple-700" />
          <span className="text-muted-foreground">Job Interviews</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full bg-indigo-500 ring-1 ring-indigo-700" />
          <span className="text-muted-foreground">Info Interviews</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full bg-amber-500 ring-1 ring-amber-700" />
          <span className="text-muted-foreground">Reminders</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full bg-pink-500 ring-1 ring-pink-700" />
          <span className="text-muted-foreground">Birthdays</span>
        </div>
      </div>
    </div>
  );
}
