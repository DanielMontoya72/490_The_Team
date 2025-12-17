import { Card } from '@/components/ui/card';
import { useTextSize } from '@/components/text-size-provider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, Building2, DollarSign, Calendar, CheckSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { JobMatchScore } from './JobMatchScore';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useId } from '@/hooks/useAccessibility';

export function DraggableJobCard({ job, onViewJob, getDaysInStage, selectedJobIds = [], onToggleSelection, setNodeRef, style, handleClick, attributes, listeners, isDragging = false }: any) {
  const { textSize } = useTextSize();
  const textSizeClass = `text-size-${textSize}`;
  const [checklistExpanded, setChecklistExpanded] = useState(false);
  const [checklist, setChecklist] = useState<any>(null);
  
  // Generate unique IDs for accessibility
  const cardId = useId('job-card');
  const checklistId = useId('checklist');
  const checkboxId = useId('checkbox');

  useEffect(() => {
    if (job?.id) {
      fetchChecklist();
    }
  }, [job?.id]);

  const fetchChecklist = async () => {
    try {
      const { data, error } = await supabase
        .from('application_checklists' as any)
        .select('*')
        .eq('job_id', job.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setChecklist(data);
      }
    } catch (error) {
      console.error('Error fetching checklist:', error);
    }
  };

  const handleToggleChecklistItem = async (itemId: string, checked: boolean) => {
    if (!checklist) return;

    const updatedItems = checklist.checklist_items.map((item: any) =>
      item.id === itemId ? { ...item, completed: checked } : item
    );

    try {
      const { error } = await supabase
        .from('application_checklists' as any)
        .update({ checklist_items: updatedItems })
        .eq('id', checklist.id);

      if (error) throw error;

      setChecklist({ ...checklist, checklist_items: updatedItems });
    } catch (error) {
      console.error('Error updating checklist:', error);
    }
  };

  const getChecklistProgress = () => {
    if (!checklist || !checklist.checklist_items || checklist.checklist_items.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }
    const completed = checklist.checklist_items.filter((item: any) => item.completed).length;
    const total = checklist.checklist_items.length;
    const percentage = Math.round((completed / total) * 100);
    return { completed, total, percentage };
  };
  
  // Define responsive text sizes based on textSize setting
  const getTextSizes = () => {
    switch (textSize) {
      case 'xs':
        return {
          title: 'text-sm',
          body: 'text-xs',
          small: 'text-xs',
          icon: 'h-3 w-3'
        };
      case 'sm':
        return {
          title: 'text-base',
          body: 'text-sm',
          small: 'text-xs',
          icon: 'h-3 w-3'
        };
      case 'md':
        return {
          title: 'text-lg',
          body: 'text-base',
          small: 'text-sm',
          icon: 'h-4 w-4'
        };
      case 'lg':
        return {
          title: 'text-xl',
          body: 'text-lg',
          small: 'text-base',
          icon: 'h-5 w-5'
        };
      case 'xl':
        return {
          title: 'text-2xl',
          body: 'text-xl',
          small: 'text-lg',
          icon: 'h-6 w-6'
        };
      default:
        return {
          title: 'text-lg',
          body: 'text-base',
          small: 'text-sm',
          icon: 'h-4 w-4'
        };
    }
  };

  const textSizes = getTextSizes();

  if (!job) return null;

  const getDeadlineUrgency = () => {
    if (!job.application_deadline) return null;
    const deadline = new Date(job.application_deadline);
    const now = new Date();
    const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return { text: 'Overdue', color: 'text-destructive', bgColor: 'bg-destructive/10' };
    if (daysUntil <= 3) return { text: `${daysUntil}d left`, color: 'text-destructive', bgColor: 'bg-destructive/10' };
    if (daysUntil <= 7) return { text: `${daysUntil}d left`, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/20' };
    return { text: `${daysUntil}d left`, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/20' };
  };

  const urgency = getDeadlineUrgency();

  return (
    <Card
      ref={setNodeRef}
      id={cardId}
      style={{
        ...style,
        transition: style?.transition || 'transform 200ms cubic-bezier(0.25, 0.8, 0.25, 1), opacity 200ms ease',
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none'
      }}
      className={`p-3 sm:p-4 transition-all duration-200 bg-card group ${textSizeClass} border ${
        isDragging ? 'opacity-50 shadow-2xl scale-105 cursor-grabbing' : 'hover:shadow-md hover:scale-[1.02] cursor-grab'
      } touch-manipulation`}
      role="article"
      aria-label={`Job: ${job.job_title} at ${job.company_name}`}
      tabIndex={isDragging ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      {...attributes}
      {...listeners}
    >
      <div 
        className="flex items-start gap-2 sm:gap-3"
        onClick={handleClick}
        aria-describedby={checklistExpanded ? checklistId : undefined}
      >
        {onToggleSelection && (
          <div onClick={e => e.stopPropagation()}>
            <Checkbox
              id={checkboxId}
              checked={selectedJobIds.includes(job.id)}
              onCheckedChange={() => onToggleSelection(job.id)}
              onClick={e => e.stopPropagation()}
              className="mt-1.5 flex-shrink-0"
              aria-label={`Select job ${job.job_title} at ${job.company_name}`}
            />
          </div>
        )}
        <div className="touch-none select-none flex-shrink-0" aria-hidden="true">
          <GripVertical className={`${textSizes.icon} text-muted-foreground flex-shrink-0 mt-0.5 sm:mt-1 transition-colors min-h-[18px] min-w-[18px] sm:min-h-[20px] sm:min-w-[20px]`} />
        </div>
        <div className="flex-1 min-w-0 space-y-1 md:space-y-1.5 lg:space-y-2">
          <h4 className={`font-semibold ${textSizes.title} line-clamp-2 leading-tight md:leading-relaxed`}>{job.job_title}</h4>
          <div className={`flex items-center ${textSizes.body} text-muted-foreground gap-1.5 md:gap-2 leading-tight md:leading-relaxed`}>
            <Building2 className={`${textSizes.icon} flex-shrink-0`} />
            <span className="line-clamp-1 min-w-0">{job.company_name}</span>
          </div>
          <div className={`${textSizes.small} text-muted-foreground leading-tight md:leading-relaxed`}>
            {getDaysInStage(job)} days in stage
          </div>
          {job.salary_range_min && (
            <div className={`flex items-center ${textSizes.small} text-muted-foreground gap-1.5 md:gap-2 leading-tight md:leading-relaxed`}>
              <DollarSign className={`${textSizes.icon} flex-shrink-0`} />
              <span className="min-w-0">{job.salary_range_min.toLocaleString()}</span>
            </div>
          )}
          {urgency && (
            <div className={`flex items-center ${textSizes.small} gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-md ${urgency.bgColor} ${urgency.color} font-medium leading-tight md:leading-relaxed mt-1 md:mt-1.5 lg:mt-2`}>
              <Calendar className={`${textSizes.icon} flex-shrink-0`} />
              <span className="min-w-0">{urgency.text}</span>
            </div>
          )}
          <div className="mt-2">
            <JobMatchScore 
              jobId={job.id} 
              compact 
              showRefresh={false}
              onMatchClick={() => onViewJob(job, 'match')}
            />
          </div>

          {/* Checklist Preview */}
          {checklist && (() => {
            const progress = getChecklistProgress();
            
            return (
              <div className="space-y-2 mt-2" onClick={e => e.stopPropagation()}>
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setChecklistExpanded(!checklistExpanded);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      setChecklistExpanded(!checklistExpanded);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  aria-expanded={checklistExpanded}
                  aria-label={`${checklistExpanded ? 'Collapse' : 'Expand'} checklist for ${job.job_title}`}
                >
                  <div className="flex items-center gap-2">
                    <CheckSquare className={`${textSizes.icon} text-primary`} />
                    <span className={`${textSizes.small} font-medium`}>Checklist</span>
                    {progress.total > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {progress.completed}/{progress.total}
                      </Badge>
                    )}
                  </div>
                  {checklistExpanded ? (
                    <ChevronUp className={textSizes.icon} />
                  ) : (
                    <ChevronDown className={textSizes.icon} />
                  )}
                </div>

                {checklistExpanded && checklist.checklist_items && (
                  <div className="space-y-2 pl-2" onClick={e => e.stopPropagation()}>
                    {checklist.checklist_items.map((item: any) => (
                      <div key={item.id} className="flex items-start gap-2 py-1" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={(checked) => handleToggleChecklistItem(item.id, checked as boolean)}
                          onClick={e => {
                            e.stopPropagation();
                          }}
                          className="mt-0.5 cursor-pointer"
                        />
                        <span className={`${textSizes.small} flex-1 ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                    {progress.total > 0 && (
                      <div className="pt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{progress.percentage}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </Card>
  );
}
