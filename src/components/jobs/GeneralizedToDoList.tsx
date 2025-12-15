import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Briefcase, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
}

interface JobWithChecklist {
  id: string;
  job_title: string;
  company_name: string;
  status: string;
  sections: ChecklistSection[];
}

interface GeneralizedToDoListProps {
  compact?: boolean;
}

export function GeneralizedToDoList({ compact = false }: GeneralizedToDoListProps) {
  const navigate = useNavigate();
  const [jobsWithChecklists, setJobsWithChecklists] = useState<JobWithChecklist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobsWithChecklists();
  }, []);

  const fetchJobsWithChecklists = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch active jobs (not Accepted or Rejected)
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, job_title, company_name, status')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .not('status', 'in', '("Accepted","Rejected")')
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      if (!jobs || jobs.length === 0) {
        setJobsWithChecklists([]);
        setLoading(false);
        return;
      }

      // Fetch checklists and interviews for all jobs
      const jobsWithChecklistsData: JobWithChecklist[] = [];

      for (const job of jobs) {
        // Fetch application checklist
        const { data: checklist } = await supabase
          .from('application_checklists')
          .select('checklist_items')
          .eq('job_id', job.id)
          .single();

        // Fetch interviews with preparation tasks
        const { data: interviews } = await supabase
          .from('interviews')
          .select('id, interview_type, interview_date, preparation_tasks')
          .eq('job_id', job.id)
          .order('interview_date', { ascending: true });

        const sections: ChecklistSection[] = [];

        // Add General section
        if (checklist?.checklist_items) {
          const items = Array.isArray(checklist.checklist_items) 
            ? (checklist.checklist_items as unknown as ChecklistItem[])
            : [];
          sections.push({
            id: 'general',
            title: 'General',
            items
          });
        }

        // Add Interview sections
        if (interviews && interviews.length > 0) {
          interviews.forEach(interview => {
            if (interview.preparation_tasks && Array.isArray(interview.preparation_tasks)) {
              const tasks = interview.preparation_tasks as any[];
              const interviewItems: ChecklistItem[] = tasks.map(task => ({
                id: `${interview.id}-${task.task}`,
                text: task.task,
                completed: task.completed
              }));

              sections.push({
                id: interview.id,
                title: `${interview.interview_type} - ${format(new Date(interview.interview_date), 'MMM d, yyyy')}`,
                items: interviewItems
              });
            }
          });
        }

        if (sections.length > 0 && sections.some(s => s.items.length > 0)) {
          jobsWithChecklistsData.push({
            id: job.id,
            job_title: job.job_title,
            company_name: job.company_name,
            status: job.status,
            sections
          });
        }
      }

      setJobsWithChecklists(jobsWithChecklistsData);
    } catch (error) {
      console.error('Error fetching jobs with checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGeneralItem = async (jobId: string, itemId: string, currentCompleted: boolean) => {
    try {
      // Find the job and get its checklist
      const { data: checklist, error: fetchError } = await supabase
        .from('application_checklists')
        .select('id, checklist_items')
        .eq('job_id', jobId)
        .single();

      if (fetchError) throw fetchError;

      // Update the item
      const items = Array.isArray(checklist.checklist_items) 
        ? (checklist.checklist_items as unknown as ChecklistItem[])
        : [];
      
      const updatedItems = items.map(item =>
        item.id === itemId ? { ...item, completed: !currentCompleted } : item
      );

      // Calculate completion percentage
      const completedCount = updatedItems.filter(i => i.completed).length;
      const percentage = Math.round((completedCount / updatedItems.length) * 100);

      // Save to database
      const { error: updateError } = await supabase
        .from('application_checklists')
        .update({
          checklist_items: updatedItems as any,
          completion_percentage: percentage
        })
        .eq('id', checklist.id);

      if (updateError) throw updateError;

      // Update local state
      setJobsWithChecklists(prev => prev.map(job => {
        if (job.id === jobId) {
          return {
            ...job,
            sections: job.sections.map(section => {
              if (section.id === 'general') {
                return {
                  ...section,
                  items: section.items.map(item =>
                    item.id === itemId ? { ...item, completed: !currentCompleted } : item
                  )
                };
              }
              return section;
            })
          };
        }
        return job;
      }));
    } catch (error) {
      console.error('Error toggling item:', error);
      toast.error('Failed to update checklist item');
    }
  };

  const toggleInterviewTask = async (jobId: string, interviewId: string, taskText: string, currentCompleted: boolean) => {
    try {
      // Fetch current interview data
      const { data: interview, error: fetchError } = await supabase
        .from('interviews')
        .select('preparation_tasks')
        .eq('id', interviewId)
        .single();

      if (fetchError) throw fetchError;

      // Update the specific task
      const tasks = (interview.preparation_tasks as any[]) || [];
      const updatedTasks = tasks.map(task => 
        task.task === taskText ? { ...task, completed: !currentCompleted } : task
      );

      // Save back to database
      const { error: updateError } = await supabase
        .from('interviews')
        .update({ preparation_tasks: updatedTasks as any })
        .eq('id', interviewId);

      if (updateError) throw updateError;

      // Update local state
      setJobsWithChecklists(prev => prev.map(job => {
        if (job.id === jobId) {
          return {
            ...job,
            sections: job.sections.map(section => {
              if (section.id === interviewId) {
                return {
                  ...section,
                  items: section.items.map(item =>
                    item.text === taskText ? { ...item, completed: !currentCompleted } : item
                  )
                };
              }
              return section;
            })
          };
        }
        return job;
      }));
    } catch (error) {
      console.error('Error updating interview task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleGoToJob = (jobId: string) => {
    navigate('/jobs', { state: { openJobId: jobId } });
  };

  const getTotalStats = () => {
    const allItems = jobsWithChecklists.flatMap(job => 
      job.sections.flatMap(section => section.items)
    );
    return {
      total: allItems.length,
      completed: allItems.filter(item => item.completed).length
    };
  };

  const getJobStats = (job: JobWithChecklist) => {
    const allItems = job.sections.flatMap(section => section.items);
    return {
      total: allItems.length,
      completed: allItems.filter(item => item.completed).length
    };
  };

  if (loading) {
    return (
      <div className={cn("text-center", compact ? "py-4" : "py-8")}>
        <div className="text-sm text-muted-foreground">
          Loading checklist items...
        </div>
      </div>
    );
  }

  if (jobsWithChecklists.length === 0) {
    return (
      <div className={cn("text-center", compact ? "py-4" : "py-8")}>
        <div className="text-sm text-muted-foreground">
          No active job applications to track
        </div>
      </div>
    );
  }

  // Filter out jobs with complete checklists
  const activeJobs = jobsWithChecklists.filter(job => {
    const stats = getJobStats(job);
    return stats.completed < stats.total;
  });

  if (activeJobs.length === 0) {
    return (
      <div className={cn("text-center", compact ? "py-4" : "py-8")}>
        <div className="text-sm text-muted-foreground">
          All checklist items complete!
        </div>
      </div>
    );
  }

  const totalStats = getTotalStats();

  return (
    <div className="space-y-3">
      {/* Overall stats */}
      {!compact && (
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {totalStats.completed} / {totalStats.total} items complete
          </Badge>
        </div>
      )}

      {/* Job accordions */}
      <Accordion type="multiple" className="space-y-2">
        {activeJobs.map((job, index) => {
          const jobStats = getJobStats(job);
          
          // Assign colors based on index
          const colorSchemes = [
            { border: 'border-l-4 border-l-primary', bg: '', badge: 'bg-primary/10 border-primary/30 text-primary', icon: 'text-primary' },
            { border: 'border-l-4 border-l-secondary', bg: '', badge: 'bg-secondary/10 border-secondary/30 text-secondary', icon: 'text-secondary' },
            { border: 'border-l-4 border-l-accent', bg: '', badge: 'bg-accent/10 border-accent/30 text-accent', icon: 'text-accent' },
            { border: 'border-l-4 border-l-destructive', bg: '', badge: 'bg-destructive/10 border-destructive/30 text-destructive', icon: 'text-destructive' },
          ];
          const colorScheme = colorSchemes[index % colorSchemes.length];
          
          return (
            <AccordionItem 
              key={job.id} 
              value={job.id}
              className={cn("border rounded-lg px-3 shadow-sm hover:shadow-md transition-shadow overflow-hidden", colorScheme.border, colorScheme.bg)}
            >
              <AccordionTrigger className="hover:no-underline py-3 [&[data-state=open]>div>svg]:rotate-180">
                <div className="flex items-start justify-between w-full gap-2 min-w-0">
                  <div className="flex items-start gap-2 text-left min-w-0 flex-1 overflow-hidden">
                    <Briefcase className={cn("h-4 w-4 shrink-0 mt-0.5", colorScheme.icon)} />
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="font-medium break-words leading-tight">{job.job_title}</div>
                      <div className="text-xs text-muted-foreground break-words leading-tight">{job.company_name}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGoToJob(job.id);
                      }}
                      className="text-[9px] text-muted-foreground hover:text-primary underline whitespace-nowrap"
                    >
                      View
                    </button>
                    <Badge variant="outline" className={cn("shrink-0 text-xs px-1.5 py-0.5 leading-none font-medium", colorScheme.badge)}>
                      {jobStats.completed}/{jobStats.total}
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-3">
                {/* Sections within each job */}
                <Accordion type="multiple" defaultValue={['general']} className="space-y-1">
                  {job.sections.map((section) => {
                    const sectionCompleted = section.items.filter(i => i.completed).length;
                    const sectionTotal = section.items.length;
                    
                    return (
                      <AccordionItem key={section.id} value={section.id} className="border-none">
                        <AccordionTrigger className="py-2 hover:no-underline text-sm">
                          <div className="flex items-center justify-between w-full pr-2 gap-2">
                            <span className="font-medium text-muted-foreground min-w-0 flex-1 break-words">{section.title}</span>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {sectionCompleted}/{sectionTotal}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-1 pb-2">
                          <div className="space-y-1.5">
                            {section.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-start gap-2 p-2 rounded hover:bg-accent/50 transition-colors"
                              >
                                <Checkbox
                                  id={item.id}
                                  checked={item.completed}
                                  onCheckedChange={() => {
                                    if (section.id === 'general') {
                                      toggleGeneralItem(job.id, item.id, item.completed);
                                    } else {
                                      toggleInterviewTask(job.id, section.id, item.text, item.completed);
                                    }
                                  }}
                                  className="shrink-0 mt-0.5"
                                />
                                <label
                                  htmlFor={item.id}
                                  className={cn(
                                    "text-xs flex-1 cursor-pointer break-words min-w-0",
                                    item.completed && "line-through text-muted-foreground"
                                  )}
                                >
                                  {item.text}
                                </label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
