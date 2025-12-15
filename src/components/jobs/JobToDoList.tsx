import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  Flag,
  GripVertical
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface JobToDoListProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
}

interface ToDoItem {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  category: 'interview_prep' | 'research' | 'follow_up' | 'application' | 'other';
  completed: boolean;
  created_at: string;
}

const categoryLabels = {
  interview_prep: 'Interview Prep',
  research: 'Research',
  follow_up: 'Follow Up',
  application: 'Application',
  other: 'Other'
};

const priorityColors = {
  low: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200',
  high: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200'
};

export function JobToDoList({ jobId, jobTitle, companyName }: JobToDoListProps) {
  const [todos, setTodos] = useState<ToDoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    due_date: null as Date | null,
    priority: 'medium' as 'low' | 'medium' | 'high',
    category: 'interview_prep' as ToDoItem['category']
  });

  useEffect(() => {
    fetchTodos();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`job-todos-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_todos',
          filter: `job_id=eq.${jobId}`
        },
        () => {
          fetchTodos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const fetchTodos = async () => {
    try {
      const { data, error } = await supabase
        .from('job_todos' as any)
        .select('*')
        .eq('job_id', jobId)
        .order('completed', { ascending: true })
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setTodos((data as any) || []);
    } catch (error) {
      console.error('Error fetching todos:', error);
      toast.error('Failed to load to-do items');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTodo = async () => {
    if (!newTodo.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('job_todos' as any)
        .insert({
          job_id: jobId,
          user_id: user.id,
          title: newTodo.title.trim(),
          description: newTodo.description.trim() || null,
          due_date: newTodo.due_date?.toISOString() || null,
          priority: newTodo.priority,
          category: newTodo.category,
          completed: false
        });

      if (error) throw error;

      toast.success('To-do item added');
      setNewTodo({
        title: '',
        description: '',
        due_date: null,
        priority: 'medium',
        category: 'interview_prep'
      });
      setShowAddForm(false);
      fetchTodos();
    } catch (error) {
      console.error('Error adding todo:', error);
      toast.error('Failed to add to-do item');
    }
  };

  const handleToggleComplete = async (todoId: string, currentCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('job_todos' as any)
        .update({ completed: !currentCompleted })
        .eq('id', todoId);

      if (error) throw error;
      fetchTodos();
    } catch (error) {
      console.error('Error updating todo:', error);
      toast.error('Failed to update to-do item');
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    try {
      const { error } = await supabase
        .from('job_todos' as any)
        .delete()
        .eq('id', todoId);

      if (error) throw error;
      toast.success('To-do item deleted');
      fetchTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
      toast.error('Failed to delete to-do item');
    }
  };

  const getStats = () => {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const overdue = todos.filter(t => 
      !t.completed && t.due_date && new Date(t.due_date) < new Date()
    ).length;
    const highPriority = todos.filter(t => !t.completed && t.priority === 'high').length;

    return { total, completed, overdue, highPriority };
  };

  const stats = getStats();

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading to-do list...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">To-Do List</CardTitle>
              <CardDescription className="mt-1">
                {jobTitle} at {companyName}
              </CardDescription>
            </div>
            <Button 
              onClick={() => setShowAddForm(!showAddForm)}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>

          {/* Stats badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {stats.completed} / {stats.total} Complete
            </Badge>
            {stats.overdue > 0 && (
              <Badge variant="outline" className="gap-1 bg-red-500/10 text-red-700 dark:text-red-400 border-red-200">
                <AlertCircle className="h-3 w-3" />
                {stats.overdue} Overdue
              </Badge>
            )}
            {stats.highPriority > 0 && (
              <Badge variant="outline" className="gap-1 bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200">
                <Flag className="h-3 w-3" />
                {stats.highPriority} High Priority
              </Badge>
            )}
          </div>
        </CardHeader>

        {/* Add form */}
        {showAddForm && (
          <CardContent className="border-t bg-muted/30 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input
                placeholder="e.g., Practice behavioral questions"
                value={newTodo.title}
                onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Add more details..."
                value={newTodo.description}
                onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={newTodo.category}
                  onValueChange={(value) => setNewTodo({ ...newTodo, category: value as ToDoItem['category'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={newTodo.priority}
                  onValueChange={(value) => setNewTodo({ ...newTodo, priority: value as 'low' | 'medium' | 'high' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !newTodo.due_date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newTodo.due_date ? format(newTodo.due_date, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newTodo.due_date || undefined}
                      onSelect={(date) => setNewTodo({ ...newTodo, due_date: date || null })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTodo}>
                Add Task
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* To-do items */}
      <div className="space-y-3">
        {todos.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No tasks yet. Add your first to-do item!</p>
            </CardContent>
          </Card>
        ) : (
          todos.map((todo) => {
            const isOverdue = todo.due_date && !todo.completed && new Date(todo.due_date) < new Date();
            
            return (
              <Card 
                key={todo.id} 
                className={cn(
                  "transition-all hover:shadow-md",
                  todo.completed && "opacity-60",
                  isOverdue && "border-red-300 dark:border-red-800"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => handleToggleComplete(todo.id, todo.completed)}
                      className="mt-1"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className={cn(
                            "font-medium",
                            todo.completed && "line-through text-muted-foreground"
                          )}>
                            {todo.title}
                          </h4>
                          {todo.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {todo.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {categoryLabels[todo.category]}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", priorityColors[todo.priority])}
                            >
                              {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
                            </Badge>
                            {todo.due_date && (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs gap-1",
                                  isOverdue && "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200"
                                )}
                              >
                                <CalendarIcon className="h-3 w-3" />
                                {format(new Date(todo.due_date), 'MMM d')}
                                {isOverdue && " (Overdue)"}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
