import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  DollarSign,
  Calendar,
  Archive,
  ArchiveRestore,
  Trash2,
  Edit,
  Eye,
  CheckSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ChecklistItemAction } from './ChecklistItemAction';
import { ResponseTimeBadge } from './ResponseTimeBadge';
import { QualityScoreBadge } from './QualityScoreBadge';
import { CompetitiveBadge } from './CompetitiveBadge';

interface JobListProps {
  jobs: any[];
  loading: boolean;
  onViewJob: (job: any, tab?: string) => void;
  onEditJob?: (job: any) => void;
  onArchiveJob?: (jobId: string) => void;
  onRestoreJob?: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
  isArchived?: boolean;
  selectedJobIds?: string[];
  onToggleSelection?: (jobId: string) => void;
}

export function JobList({
  jobs,
  loading,
  onViewJob,
  onEditJob,
  onArchiveJob,
  onRestoreJob,
  onDeleteJob,
  isArchived = false,
  selectedJobIds = [],
  onToggleSelection
}: JobListProps) {
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set());
  const [checklistData, setChecklistData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (jobs.length > 0) {
      fetchAllChecklists();
    }
  }, [jobs]);

  const fetchAllChecklists = async () => {
    try {
      const jobIds = jobs.map(job => job.id);
      const { data, error } = await supabase
        .from('application_checklists' as any)
        .select('*')
        .in('job_id', jobIds);

      if (error) throw error;

      const checklistMap: Record<string, any> = {};
      data?.forEach((checklist: any) => {
        checklistMap[checklist.job_id] = checklist;
      });
      setChecklistData(checklistMap);
    } catch (error) {
      console.error('Error fetching checklists:', error);
    }
  };

  const toggleChecklist = (jobId: string) => {
    console.log('Toggling checklist for job:', jobId);
    setExpandedChecklists(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      console.log('New expanded checklists:', next);
      return next;
    });
  };

  const handleToggleChecklistItem = async (jobId: string, itemId: string, checked: boolean) => {
    console.log('Toggling item:', itemId, 'for job:', jobId, 'checked:', checked);
    const checklist = checklistData[jobId];
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

      setChecklistData(prev => ({
        ...prev,
        [jobId]: { ...checklist, checklist_items: updatedItems }
      }));
    } catch (error) {
      console.error('Error updating checklist:', error);
    }
  };

  const getChecklistProgress = (jobId: string) => {
    const checklist = checklistData[jobId];
    if (!checklist || !checklist.checklist_items || checklist.checklist_items.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }
    const completed = checklist.checklist_items.filter((item: any) => item.completed).length;
    const total = checklist.checklist_items.length;
    const percentage = Math.round((completed / total) * 100);
    return { completed, total, percentage };
  };
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">
          {isArchived ? 'No archived jobs' : 'No jobs yet'}
        </h3>
        <p className="text-muted-foreground mb-4">
          {isArchived 
            ? 'Archived jobs will appear here' 
            : 'Start tracking your job applications'}
        </p>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Interested': 'default',
      'Applied': 'secondary',
      'Phone Screen': 'default',
      'Interview': 'default',
      'Interview Scheduled': 'default',
      'Offer Received': 'default',
      'Accepted': 'default',
      'Rejected': 'destructive',
      'Withdrawn': 'outline'
    };
    return colors[status] || 'default';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {jobs.map((job) => (
        <Card key={job.id} className="p-6 hover:shadow-lg transition-shadow">
          <div className="space-y-4">
            <div>
              <div className="flex items-start justify-between mb-2 gap-2">
                {onToggleSelection && (
                  <Checkbox
                    checked={selectedJobIds.includes(job.id)}
                    onCheckedChange={() => onToggleSelection(job.id)}
                    className="mt-1"
                  />
                )}
                <h3 className="font-bold text-lg line-clamp-1 flex-1">{job.job_title}</h3>
                <div className="flex items-center gap-2">
                  <CompetitiveBadge jobId={job.id} />
                  <QualityScoreBadge jobId={job.id} />
                  <ResponseTimeBadge 
                    jobId={job.id} 
                    appliedDate={job.status === 'Applied' || job.status === 'Interview' || job.status === 'Phone Screen' ? job.updated_at : undefined}
                    status={job.status}
                  />
                  <Badge variant={getStatusColor(job.status) as any}>
                    {job.status}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center text-muted-foreground gap-2 mb-2">
                <Building2 className="h-4 w-4" />
                <span className="text-sm line-clamp-1">{job.company_name}</span>
              </div>
              {job.location && (
                <div className="flex items-center text-muted-foreground gap-2 mb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{job.location}</span>
                </div>
              )}
              {(job.salary_range_min || job.salary_range_max) && (
                <div className="flex items-center text-muted-foreground gap-2 mb-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">
                    {job.salary_range_min && job.salary_range_max
                      ? `$${job.salary_range_min.toLocaleString()} - $${job.salary_range_max.toLocaleString()}`
                      : job.salary_range_min
                      ? `$${job.salary_range_min.toLocaleString()}+`
                      : `Up to $${job.salary_range_max.toLocaleString()}`}
                  </span>
                </div>
              )}
              {job.application_deadline && (() => {
                const deadline = new Date(job.application_deadline);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                let colorClass = 'text-muted-foreground';
                if (daysRemaining < 0) colorClass = 'text-destructive';
                else if (daysRemaining <= 3) colorClass = 'text-destructive';
                else if (daysRemaining <= 7) colorClass = 'text-yellow-600 dark:text-yellow-500';
                else colorClass = 'text-green-600 dark:text-green-500';
                
                return (
                  <div className={`flex items-center gap-2 ${colorClass}`}>
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : 
                       daysRemaining === 0 ? 'Due today' : 
                       `${daysRemaining} days left`}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Checklist Preview */}
            {!isArchived && (() => {
              const progress = getChecklistProgress(job.id);
              const isExpanded = expandedChecklists.has(job.id);
              const checklist = checklistData[job.id];
              
              return (
                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Button clicked!');
                      toggleChecklist(job.id);
                    }}
                    className="w-full flex items-center justify-between p-2 h-auto hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Checklist</span>
                      {progress.total > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {progress.completed}/{progress.total}
                        </Badge>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>

                  {isExpanded && checklist && checklist.checklist_items && (
                    <div className="space-y-2 pl-2" onClick={(e) => e.stopPropagation()}>
                      {checklist.checklist_items.map((item: any) => (
                        <div key={item.id} className="flex items-start gap-2 py-1" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={(checked) => {
                              handleToggleChecklistItem(job.id, item.id, checked as boolean);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className="mt-0.5 cursor-pointer shrink-0"
                          />
                          <span className={`text-sm flex-1 ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {item.text}
                          </span>
                          <ChecklistItemAction
                            itemText={item.text}
                            job={job}
                            onTabChange={(tab) => onViewJob(job, tab)}
                            compact
                          />
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

            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewJob(job)}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
              
              {!isArchived && onEditJob && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditJob(job)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}

              {!isArchived && onArchiveJob && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onArchiveJob(job.id)}
                >
                  <Archive className="h-4 w-4" />
                </Button>
              )}

              {isArchived && onRestoreJob && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRestoreJob(job.id)}
                >
                  <ArchiveRestore className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => onDeleteJob(job.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
