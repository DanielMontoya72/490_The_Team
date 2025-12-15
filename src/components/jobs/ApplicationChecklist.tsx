import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, CheckSquare, ChevronDown } from 'lucide-react';
import { createDefaultTodos } from '@/lib/default-todos';
import { createDefaultReminders } from '@/lib/default-reminders';
import { ChecklistItemAction } from './ChecklistItemAction';
import { format } from 'date-fns';

interface ApplicationChecklistProps {
  jobId: string;
  job?: any;
  onTabChange?: (tab: string) => void;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface InterviewPreparationTask {
  category: string;
  task: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  estimated_time_minutes?: number;
}

interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
  isInterview?: boolean;
  interviewType?: string;
  interviewDate?: string;
}

export function ApplicationChecklist({ jobId, job, onTabChange }: ApplicationChecklistProps) {
  const [checklist, setChecklist] = useState<any>(null);
  const [sections, setSections] = useState<ChecklistSection[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchChecklist();
  }, [jobId]);

  const fetchChecklist = async () => {
    try {
      // Fetch application checklist
      const { data: checklistData, error: checklistError } = await supabase
        .from('application_checklists' as any)
        .select('*')
        .eq('job_id', jobId)
        .single();

      if (checklistError && checklistError.code !== 'PGRST116') throw checklistError;

      // Fetch interviews with preparation tasks
      const { data: interviews, error: interviewsError } = await supabase
        .from('interviews')
        .select('id, interview_type, interview_date, preparation_tasks')
        .eq('job_id', jobId)
        .order('interview_date', { ascending: true });

      if (interviewsError) throw interviewsError;

      if (checklistData) {
        setChecklist(checklistData);
        
        // Build sections array
        const newSections: ChecklistSection[] = [];
        
        // General section with default items
        newSections.push({
          id: 'general',
          title: 'General',
          items: (checklistData as any).checklist_items || []
        });

        // Add interview sections
        if (interviews && interviews.length > 0) {
          interviews.forEach(interview => {
            if (interview.preparation_tasks && Array.isArray(interview.preparation_tasks)) {
              const tasks = interview.preparation_tasks as unknown as InterviewPreparationTask[];
              const interviewItems: ChecklistItem[] = tasks.map(task => ({
                id: `${interview.id}-${task.task}`,
                text: task.task,
                completed: task.completed
              }));

              newSections.push({
                id: interview.id,
                title: `${interview.interview_type} - ${format(new Date(interview.interview_date), 'MMM d, yyyy')}`,
                items: interviewItems,
                isInterview: true,
                interviewType: interview.interview_type,
                interviewDate: interview.interview_date
              });
            }
          });
        }

        setSections(newSections);
      } else {
        // Create a new checklist with default items
        await createDefaultChecklist();
      }
    } catch (error) {
      console.error('Error fetching checklist:', error);
      toast.error('Failed to load checklist');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultChecklist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch the job to check for matching automation rules
      const { data: job, error: jobError } = await supabase
        .from('jobs' as any)
        .select('industry, job_type')
        .eq('id', jobId)
        .single();

      // Fetch automation rules to find matching checklist templates
      const { data: rules, error: rulesError } = await supabase
        .from('application_automation_rules' as any)
        .select('*')
        .eq('is_active', true);

      let defaultItems: ChecklistItem[] = [
        { id: crypto.randomUUID(), text: 'Tailor resume for this position', completed: false },
        { id: crypto.randomUUID(), text: 'Write customized cover letter', completed: false },
        { id: crypto.randomUUID(), text: 'Research company background', completed: false },
        { id: crypto.randomUUID(), text: 'Prepare portfolio or work samples', completed: false },
        { id: crypto.randomUUID(), text: 'Complete online application', completed: false },
        { id: crypto.randomUUID(), text: 'Follow up after application', completed: false }
      ];

      // Check if there's a matching rule with checklist items
      if (!jobError && !rulesError && rules && rules.length > 0 && job) {
        const matchingRule = (rules as any[]).find((rule: any) => {
          const conditions = rule.conditions as any;
          const jobData = job as any;
          const jobTitle = jobData.job_title?.toLowerCase() || '';
          const jobIndustry = jobData.industry?.toLowerCase() || '';
          const jobType = jobData.job_type?.toLowerCase() || '';
          const ruleJobTitle = conditions.job_title?.toLowerCase() || '';
          const ruleIndustry = conditions.industry?.toLowerCase() || '';
          const ruleJobType = conditions.jobType?.toLowerCase() || '';
          
          const titleMatch = !ruleJobTitle || jobTitle.includes(ruleJobTitle) || ruleJobTitle.includes(jobTitle);
          const industryMatch = !ruleIndustry || jobIndustry.includes(ruleIndustry) || ruleIndustry.includes(jobIndustry);
          const jobTypeMatch = !ruleJobType || jobType.includes(ruleJobType) || ruleJobType.includes(jobType);
          
          return titleMatch && industryMatch && jobTypeMatch && rule.actions?.checklist_template;
        });

        if (matchingRule?.actions?.checklist_template) {
          defaultItems = (matchingRule.actions.checklist_template as string[]).map((text: string) => ({
            id: crypto.randomUUID(),
            text,
            completed: false
          }));
        }
      }

      const { data, error } = await supabase
        .from('application_checklists' as any)
        .insert({
          job_id: jobId,
          user_id: user.id,
          checklist_items: defaultItems,
          completion_percentage: 0
        })
        .select()
        .single();

      if (error) throw error;

      setChecklist(data);
      setSections([{
        id: 'general',
        title: 'General',
        items: defaultItems
      }]);
      
      // Also create default to-do items and reminders
      await createDefaultTodos(jobId, user.id);
      await createDefaultReminders(jobId, user.id);
    } catch (error) {
      console.error('Error creating checklist:', error);
      toast.error('Failed to create checklist');
    }
  };

  const updateGeneralSection = async (newItems: ChecklistItem[]) => {
    try {
      // Calculate overall completion percentage
      const generalCompleted = newItems.filter(item => item.completed).length;
      const generalTotal = newItems.length;
      
      // Get interview items completion
      const interviewSections = sections.filter(s => s.isInterview);
      const interviewItems = interviewSections.flatMap(s => s.items);
      const interviewCompleted = interviewItems.filter(item => item.completed).length;
      
      const totalItems = generalTotal + interviewItems.length;
      const totalCompleted = generalCompleted + interviewCompleted;
      const percentage = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

      const { error } = await supabase
        .from('application_checklists' as any)
        .update({
          checklist_items: newItems,
          completion_percentage: percentage
        })
        .eq('id', checklist.id);

      if (error) throw error;

      // Update local state after successful database update
      setSections(prevSections => prevSections.map(section => 
        section.id === 'general' ? { ...section, items: newItems } : section
      ));
      
      toast.success('Checklist updated');
    } catch (error) {
      console.error('Error updating checklist:', error);
      toast.error('Failed to update checklist');
      // Revert local state on error by re-fetching
      fetchChecklist();
    }
  };

  const updateInterviewTask = async (interviewId: string, taskText: string, completed: boolean) => {
    try {
      // Fetch current interview data
      const { data: interview, error: fetchError } = await supabase
        .from('interviews')
        .select('preparation_tasks')
        .eq('id', interviewId)
        .single();

      if (fetchError) throw fetchError;

      // Update the specific task
      const tasks = (interview.preparation_tasks as unknown as InterviewPreparationTask[]) || [];
      const updatedTasks = tasks.map(task => 
        task.task === taskText ? { ...task, completed } : task
      );

      // Save back to database
      const { error: updateError } = await supabase
        .from('interviews')
        .update({ preparation_tasks: updatedTasks as any })
        .eq('id', interviewId);

      if (updateError) throw updateError;

      // Update local state after successful database update
      setSections(prevSections => prevSections.map(section => {
        if (section.id === interviewId) {
          return {
            ...section,
            items: section.items.map(item => 
              item.text === taskText ? { ...item, completed } : item
            )
          };
        }
        return section;
      }));
      
      toast.success('Task updated');
    } catch (error) {
      console.error('Error updating interview task:', error);
      toast.error('Failed to update task');
      // Revert local state on error by re-fetching
      fetchChecklist();
    }
  };

  const toggleItem = (sectionId: string, itemId: string, itemText: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    if (section.isInterview) {
      // Update interview preparation task
      const item = section.items.find(i => i.id === itemId);
      if (item) {
        updateInterviewTask(sectionId, itemText, !item.completed);
      }
    } else {
      // Update general checklist
      const newItems = section.items.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );
      updateGeneralSection(newItems);
    }
  };

  const addItem = () => {
    if (!newItemText.trim()) return;

    const generalSection = sections.find(s => s.id === 'general');
    if (!generalSection) return;

    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: newItemText.trim(),
      completed: false
    };

    const newItems = [...generalSection.items, newItem];
    updateGeneralSection(newItems);
    setNewItemText('');
    toast.success('Checklist item added to General section');
  };

  const deleteItem = (itemId: string) => {
    const generalSection = sections.find(s => s.id === 'general');
    if (!generalSection) return;

    const newItems = generalSection.items.filter(item => item.id !== itemId);
    updateGeneralSection(newItems);
    toast.success('Checklist item removed');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const allItems = sections.flatMap(s => s.items);
  const completedCount = allItems.filter(item => item.completed).length;
  const completionPercentage = allItems.length > 0 ? Math.round((completedCount / allItems.length) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Application Checklist
        </CardTitle>
        <CardDescription>
          Track your application progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Completion</span>
            <span className="font-medium">{completedCount} / {allItems.length} completed</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        {/* Add new item */}
        <div className="flex gap-2">
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Add new item to General section..."
            onKeyPress={(e) => e.key === 'Enter' && addItem()}
          />
          <Button onClick={addItem} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Checklist sections */}
        {sections.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No checklist items yet. Add one above!
          </p>
        ) : (
          <Accordion type="multiple" defaultValue={['general']} className="w-full">
            {sections.map((section) => {
              const sectionCompleted = section.items.filter(i => i.completed).length;
              const sectionTotal = section.items.length;

              return (
                <AccordionItem key={section.id} value={section.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-medium">{section.title}</span>
                      <Badge variant="outline" className="ml-2">
                        {sectionCompleted}/{sectionTotal}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {section.items.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No items in this section
                        </p>
                      ) : (
                        section.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <Checkbox
                              id={item.id}
                              checked={item.completed}
                              onCheckedChange={() => toggleItem(section.id, item.id, item.text)}
                              className="shrink-0"
                            />
                            <label
                              htmlFor={item.id}
                              className={`flex-1 text-sm cursor-pointer ${
                                item.completed ? 'line-through text-muted-foreground' : ''
                              }`}
                            >
                              {item.text}
                            </label>
                            {!section.isInterview && (
                              <>
                                <ChecklistItemAction 
                                  itemText={item.text}
                                  job={job}
                                  onTabChange={onTabChange}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteItem(item.id)}
                                  className="shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}