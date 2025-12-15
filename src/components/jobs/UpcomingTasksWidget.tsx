import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  completed: boolean;
  job_id: string;
  job_title: string;
  company_name: string;
  source: 'checklist' | 'todo';
}

export function UpcomingTasksWidget() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();

    // Subscribe to real-time updates for both todos and checklists
    const todosChannel = supabase
      .channel('upcoming_tasks_todos')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_todos'
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    const checklistsChannel = supabase
      .channel('upcoming_tasks_checklists')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'application_checklists'
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(todosChannel);
      supabase.removeChannel(checklistsChannel);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const allTasks: TaskItem[] = [];

      // Fetch to-dos
      const { data: todos, error: todosError } = await supabase
        .from('job_todos')
        .select(`
          *,
          jobs (
            id,
            job_title,
            company_name
          )
        `)
        .eq('user_id', user.id)
        .eq('completed', false)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('priority', { ascending: false })
        .limit(10);

      if (todosError) throw todosError;

      if (todos) {
        todos.forEach(todo => {
          if (todo.jobs) {
            allTasks.push({
              id: `todo-${todo.id}`,
              title: todo.title,
              description: todo.description,
              due_date: todo.due_date,
              priority: (todo.priority || 'medium') as 'low' | 'medium' | 'high',
              category: todo.category,
              completed: todo.completed,
              job_id: todo.job_id,
              job_title: (todo.jobs as any).job_title,
              company_name: (todo.jobs as any).company_name,
              source: 'todo'
            });
          }
        });
      }

      // Fetch active jobs (not Accepted or Rejected) with incomplete checklist items
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, job_title, company_name, status, application_deadline')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .not('status', 'in', '("Accepted","Rejected")')
        .order('application_deadline', { ascending: true, nullsFirst: false });

      if (jobsError) throw jobsError;

      if (jobs) {
        for (const job of jobs.slice(0, 5)) {
          const { data: checklist } = await supabase
            .from('application_checklists')
            .select('checklist_items')
            .eq('job_id', job.id)
            .single();

          if (checklist?.checklist_items && Array.isArray(checklist.checklist_items)) {
            const items = checklist.checklist_items as any[];
            const incompleteItems = items.filter(item => !item.completed).slice(0, 2);

            incompleteItems.forEach(item => {
              allTasks.push({
                id: `checklist-${job.id}-${item.id}`,
                title: item.text,
                due_date: job.application_deadline,
                priority: 'medium',
                category: 'application',
                completed: false,
                job_id: job.id,
                job_title: job.job_title,
                company_name: job.company_name,
                source: 'checklist'
              });
            });
          }
        }
      }

      // Sort by due date (nulls last), then priority
      allTasks.sort((a, b) => {
        if (a.due_date && !b.due_date) return -1;
        if (!a.due_date && b.due_date) return 1;
        if (a.due_date && b.due_date) {
          const dateCompare = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          if (dateCompare !== 0) return dateCompare;
        }
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      setTasks(allTasks.slice(0, 8));
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (task: TaskItem) => {
    try {
      if (task.source === 'todo') {
        const todoId = task.id.replace('todo-', '');
        const { error } = await supabase
          .from('job_todos')
          .update({ completed: !task.completed })
          .eq('id', todoId);

        if (error) throw error;
      } else {
        // Checklist item
        const { data: checklist, error: fetchError } = await supabase
          .from('application_checklists')
          .select('id, checklist_items')
          .eq('job_id', task.job_id)
          .single();

        if (fetchError) throw fetchError;

        if (checklist?.checklist_items && Array.isArray(checklist.checklist_items)) {
          const items = checklist.checklist_items as any[];
          const updatedItems = items.map(item =>
            item.text === task.title ? { ...item, completed: !task.completed } : item
          );

          const { error: updateError } = await supabase
            .from('application_checklists')
            .update({ checklist_items: updatedItems })
            .eq('id', checklist.id);

          if (updateError) throw updateError;
        }
      }

      toast.success('Task updated');
      fetchTasks();
    } catch (error) {
      console.error('Error toggling task:', error);
      toast.error('Failed to update task');
    }
  };

  const getDaysUntil = (date: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);
    return differenceInDays(dueDate, now);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200';
      case 'medium':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200';
      case 'low':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Upcoming Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Upcoming Tasks
          </CardTitle>
          <CardDescription className="text-xs">You're all caught up!</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground text-sm">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50 text-green-600" />
            <p>No pending tasks</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Upcoming Tasks
        </CardTitle>
        <CardDescription className="text-xs">Next {tasks.length} tasks to complete</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map(task => {
          const daysUntil = task.due_date ? getDaysUntil(task.due_date) : null;
          const isOverdue = daysUntil !== null && daysUntil < 0;
          const isUrgent = daysUntil !== null && daysUntil >= 0 && daysUntil <= 3;

          return (
            <div
              key={task.id}
              className={cn(
                "p-3 rounded-lg border transition-all hover:shadow-sm",
                isOverdue && "border-red-300 bg-red-50 dark:bg-red-950/20",
                isUrgent && "border-orange-300 bg-orange-50 dark:bg-orange-950/20",
                !isOverdue && !isUrgent && "border-border bg-card"
              )}
            >
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => toggleTask(task)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight break-words">
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {task.job_title} • {task.company_name}
                      </p>
                    </div>
                    {task.priority === 'high' && (
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getPriorityColor(task.priority))}>
                        High
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    {task.due_date && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        {isOverdue ? (
                          <>
                            <AlertCircle className="h-3 w-3 text-red-600" />
                            <span className="text-red-600 font-medium">
                              {Math.abs(daysUntil!)} day{Math.abs(daysUntil!) !== 1 ? 's' : ''} overdue
                            </span>
                          </>
                        ) : isUrgent ? (
                          <>
                            <Clock className="h-3 w-3 text-orange-600" />
                            <span className="text-orange-600 font-medium">
                              Due in {daysUntil} day{daysUntil !== 1 ? 's' : ''}
                            </span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            <span>Due {format(new Date(task.due_date), 'MMM d')}</span>
                          </>
                        )}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-2 text-[10px] ml-auto"
                      onClick={() => navigate('/jobs')}
                    >
                      View <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => navigate('/jobs')}
        >
          View All Tasks
        </Button>
      </CardContent>
    </Card>
  );
}
