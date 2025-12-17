import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Briefcase, ExternalLink, User, Target, Clock } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
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

interface GeneralTodo {
  id: string;
  task: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  category?: string;
  estimated_time?: string;
  is_getting_started: boolean;
  due_date?: string;
  completed_at?: string;
  created_at?: string;
}

interface GeneralizedToDoListProps {
  compact?: boolean;
}

export function GeneralizedToDoList({ compact = false }: GeneralizedToDoListProps) {
  const navigate = useNavigate();
  const [jobsWithChecklists, setJobsWithChecklists] = useState<JobWithChecklist[]>([]);
  const [generalTodos, setGeneralTodos] = useState<GeneralTodo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchJobsWithChecklists(),
      fetchGeneralTodos()
    ]).finally(() => setLoading(false));
  }, []);

  const fetchGeneralTodos = async () => {
    try {
      // Temporarily disabled until todos table is available
      // const { data: { user } } = await supabase.auth.getUser();
      // if (!user) return;

      // const { data: todos, error } = await supabase
      //   .from('todos')
      //   .select('*')
      //   .eq('user_id', user.id)
      //   .in('status', ['pending', 'in_progress'])
      //   .order('priority', { ascending: false })
      //   .order('due_date', { ascending: true, nullsFirst: false })
      //   .order('created_at', { ascending: true });

      // if (error) throw error;
      // setGeneralTodos(todos || []);
      setGeneralTodos([]);
    } catch (error) {
      console.error('Error fetching general todos:', error);
    }
  };

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
    }
  };

  const toggleGeneralTodo = async (todoId: string, currentStatus: string) => {
    try {
      // Temporarily disabled until todos table is properly set up
      console.log('toggleGeneralTodo called but temporarily disabled');
      toast.success('General todos feature coming soon!');
    } catch (error) {
      console.error('Error toggling general todo:', error);
      toast.error('Failed to update task');
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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return { color: 'text-red-600', bg: 'bg-red-100' };
      case 'medium': return { color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'low': return { color: 'text-green-600', bg: 'bg-green-100' };
      default: return { color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDueDateDisplay = (dueDate?: string) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    
    if (isToday(date)) {
      return { text: 'Due today', color: 'text-red-600' };
    } else if (isTomorrow(date)) {
      return { text: 'Due tomorrow', color: 'text-orange-600' };
    } else if (isPast(date)) {
      return { text: 'Overdue', color: 'text-red-700 font-medium' };
    } else {
      return { text: `Due ${format(date, 'MMM d')}`, color: 'text-muted-foreground' };
    }
  };

  if (loading) {
    return (
      <div className={cn("text-center", compact ? "py-4" : "py-8")}>
        <div className="text-sm text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  // Filter out jobs with complete checklists
  const activeJobs = jobsWithChecklists.filter(job => {
    const stats = getJobStats(job);
    return stats.completed < stats.total;
  });

  // Sort general todos by priority and due date
  const sortedTodos = [...generalTodos].sort((a, b) => {
    // First by priority
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then by due date (sooner first)
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    
    // Finally by creation date
    return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
  });

  const totalGeneralTodos = generalTodos.length;
  const completedGeneralTodos = generalTodos.filter(t => t.status === 'completed').length;
  const totalStats = getTotalStats();
  const grandTotal = {
    completed: totalStats.completed + completedGeneralTodos,
    total: totalStats.total + totalGeneralTodos
  };

  // Show empty state if no todos and no job checklists
  if (sortedTodos.length === 0 && activeJobs.length === 0) {
    return (
      <div className={cn("text-center", compact ? "py-4" : "py-8")}>
        <div className="text-sm text-muted-foreground">
          No tasks at the moment
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Great! You're all caught up.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Overall stats */}
      {!compact && (
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {grandTotal.completed} / {grandTotal.total} items complete
          </Badge>
        </div>
      )}

      <div className="space-y-3">
        {/* General Todos Section */}
        {sortedTodos.length > 0 && (
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-blue-600" />
                  Personal Tasks
                </CardTitle>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                  {sortedTodos.length} active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {sortedTodos.slice(0, compact ? 3 : 10).map((todo) => {
                  const dueDateInfo = getDueDateDisplay(todo.due_date);
                  
                  return (
                    <div
                      key={todo.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        id={todo.id}
                        checked={todo.status === 'completed'}
                        onCheckedChange={() => toggleGeneralTodo(todo.id, todo.status)}
                        className="shrink-0 mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <label
                            htmlFor={todo.id}
                            className={cn(
                              "text-sm font-medium cursor-pointer break-words leading-tight",
                              todo.status === 'completed' && "line-through text-muted-foreground"
                            )}
                          >
                            {todo.task}
                          </label>
                          <div className="flex items-center gap-1 shrink-0">
                            {todo.is_getting_started && (
                              <div className="flex items-center gap-1 text-xs">
                                <Target className="h-3 w-3 text-green-600" />
                                <span className="text-green-600 hidden sm:inline">Getting Started</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {todo.description && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {todo.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getPriorityBadge(todo.priority))}
                          >
                            {todo.priority}
                          </Badge>
                          
                          {todo.estimated_time && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{todo.estimated_time}</span>
                            </div>
                          )}
                          
                          {dueDateInfo && (
                            <span className={cn("text-xs", dueDateInfo.color)}>
                              {dueDateInfo.text}
                            </span>
                          )}
                          
                          {todo.category && (
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {todo.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {compact && sortedTodos.length > 3 && (
                  <div className="text-center pt-2">
                    <button 
                      onClick={() => navigate('/jobs')}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      +{sortedTodos.length - 3} more tasks
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Job Checklists Section */}
        {activeJobs.length > 0 && (
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
                  className={cn("border rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden", colorScheme.border, colorScheme.bg)}
                >
                  <div className="flex items-center gap-2">
                    <AccordionTrigger className="hover:no-underline py-3 px-3 flex-1 [&[data-state=open]>div>svg]:rotate-180">
                      <div className="flex items-start justify-between w-full gap-2 min-w-0">
                        <div className="flex items-start gap-2 text-left min-w-0 flex-1 overflow-hidden">
                          <Briefcase className={cn("h-4 w-4 shrink-0 mt-0.5", colorScheme.icon)} />
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="font-medium break-words leading-tight">{job.job_title}</div>
                            <div className="text-xs text-muted-foreground break-words leading-tight">{job.company_name}</div>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn("shrink-0 text-xs px-1.5 py-0.5 leading-none font-medium", colorScheme.badge)}>
                          {jobStats.completed}/{jobStats.total}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGoToJob(job.id)}
                      className="shrink-0 px-2 h-8 text-xs"
                      aria-label={`View job details for ${job.job_title} at ${job.company_name}`}
                    >
                      View
                    </Button>
                  </div>
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
                                <span className="font-medium text-muted-foreground min-w-0 flex-1 break-words text-sm">{section.title}</span>
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
        )}
      </div>
    </div>
  );
}
