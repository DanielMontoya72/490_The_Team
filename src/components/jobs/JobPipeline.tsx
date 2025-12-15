import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, KeyboardSensor, TouchSensor } from '@dnd-kit/core';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DraggableJobCard } from './DraggableJobCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTextSize } from '@/components/text-size-provider';
import { markChecklistItemComplete } from '@/lib/checklist-utils';
import { createApplicationReminder } from '@/lib/default-reminders';

interface JobPipelineProps {
  jobs: any[];
  onJobUpdate: () => void;
  onViewJob: (job: any) => void;
  selectedJobIds: string[];
  onToggleSelection: (jobId: string) => void;
}

const statusColumns = [
  { id: 'Interested', title: 'Interested', color: 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/30 hover:bg-purple-100 dark:hover:bg-purple-950/30' },
  { id: 'Applied', title: 'Applied', color: 'bg-primary/10 border-primary/20 hover:bg-primary/15' },
  { id: 'Phone Screen', title: 'Phone Screen', color: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30 hover:bg-blue-100 dark:hover:bg-blue-950/30' },
  { id: 'Interview', title: 'Interview', color: 'bg-accent/10 border-accent/20 hover:bg-accent/15' },
  { id: 'Offer', title: 'Offer', color: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/30 hover:bg-green-100 dark:hover:bg-green-950/30' },
  { id: 'Accepted', title: 'Accepted', color: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/30' },
  { id: 'Rejected', title: 'Rejected', color: 'bg-destructive/10 border-destructive/20 hover:bg-destructive/15' },
];

export default function JobPipeline({ jobs, onJobUpdate, onViewJob, selectedJobIds, onToggleSelection }: JobPipelineProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { textSize } = useTextSize();

  // Add mobile-specific body class management for better drag experience
  const handleMobileDragStart = () => {
    setIsDragging(true);
    if (typeof document !== 'undefined') {
      // Prevent scrolling during drag on mobile
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }
  };

  const handleMobileDragEnd = () => {
    setIsDragging(false);
    if (typeof document !== 'undefined') {
      // Restore scrolling after drag
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
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
          icon: 'h-4 w-4'
        };
      case 'md':
        return {
          title: 'text-lg',
          body: 'text-base',
          small: 'text-sm',
          icon: 'h-5 w-5'
        };
      case 'lg':
        return {
          title: 'text-xl',
          body: 'text-lg',
          small: 'text-base',
          icon: 'h-6 w-6'
        };
      case 'xl':
        return {
          title: 'text-2xl',
          body: 'text-xl',
          small: 'text-lg',
          icon: 'h-8 w-8'
        };
      default:
        return {
          title: 'text-lg',
          body: 'text-base',
          small: 'text-sm',
          icon: 'h-5 w-5'
        };
    }
  };

  const textSizes = getTextSizes();

  // Validate jobs array
  const validJobs = Array.isArray(jobs) ? jobs.filter(job => job && job.id) : [];

  // Set up sensors for better drag interaction with optimized mobile support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Slightly more distance for better pointer accuracy
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // Longer delay to distinguish from scrolling
        tolerance: 8, // More tolerance for finger movement
      },
    }),
    useSensor(KeyboardSensor)
  );

  const getDaysInStage = (job: any) => {
    // Use created_at or updated_at as fallback since status_updated_at doesn't exist
    const statusDate = job.updated_at || job.created_at;
    if (!statusDate) return 0;
    const now = new Date();
    const statusUpdateDate = new Date(statusDate);
    return Math.floor((now.getTime() - statusUpdateDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleDragStart = (event: DragStartEvent) => {
    console.log('Drag started:', event.active.id);
    setActiveId(event.active.id as string);
    handleMobileDragStart();
    
    // Add mobile-specific feedback
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      navigator.vibrate(50); // Haptic feedback on mobile
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('Drag ended:', { activeId: active.id, overId: over?.id });
    setActiveId(null);
    handleMobileDragEnd();

    if (!over) {
      console.log('No drop target');
      return;
    }

    const jobId = active.id as string;
    const newStatus = over.id as string;

    console.log('Attempting to move job:', { jobId, newStatus });

    // Find the job being moved
    const job = validJobs.find(j => j.id === jobId);
    if (!job) {
      console.error('Job not found:', jobId);
      toast.error('Job not found');
      return;
    }

    console.log('Found job:', { jobTitle: job.job_title, currentStatus: job.status });

    // Handle special case for "unknown" status
    if (newStatus === 'unknown') {
      toast.error('Cannot move job to unknown status');
      return;
    }

    // Check if the status is actually changing
    const currentStatus = job.status;
    if (currentStatus === newStatus) {
      console.log('Status unchanged, skipping update');
      return;
    }

    // Handle the case where we're dropping on "Offer" column but job might have "Offer Received" status
    if (newStatus === 'Offer' && (currentStatus === 'Offer' || currentStatus === 'Offer Received')) {
      console.log('Offer status unchanged, skipping update');
      return;
    }

    try {
      console.log('Updating job status in database...');
      const { error } = await supabase
        .from('jobs' as any)
        .update({ 
          status: newStatus
        } as any)
        .eq('id', jobId);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Create status history record
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('job_status_history' as any)
          .insert({
            job_id: jobId,
            user_id: user.id,
            from_status: currentStatus,
            to_status: newStatus,
            changed_at: new Date().toISOString()
          });
      }

      console.log('Job status updated successfully');
      
      // Auto-complete checklist items based on status change
      if (newStatus === 'Applied') {
        await markChecklistItemComplete(jobId, 'application');
        // Create automatic follow-up reminder
        if (user) {
          await createApplicationReminder(jobId, user.id);
        }
      }
      
      const targetColumn = statusColumns.find(col => col.id === newStatus);
      toast.success(`Job moved to ${targetColumn?.title || newStatus}`);
      onJobUpdate();
    } catch (error) {
      console.error('Error updating job status:', error);
      toast.error(`Failed to update job status: ${error.message || 'Unknown error'}`);
    }
  };

  const DroppableColumn = ({ id, title, color, children }: { id: string; title: string; color: string; children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    
    // Calculate job count for this column, handling merged offer statuses
    const jobCount = id === 'Offer' 
      ? validJobs.filter(job => job.status === 'Offer' || job.status === 'Offer Received').length
      : validJobs.filter(job => job.status === id).length;

    return (
      <Card 
        ref={setNodeRef} 
        className={`${color} min-h-[400px] w-full transition-all duration-200 border-2 ${
          isOver ? 'ring-2 ring-primary shadow-lg scale-[1.02] border-primary/40 bg-primary/5' : ''
        } touch-manipulation flex flex-col`}
        style={{
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        <CardHeader className="pb-3 md:pb-4 lg:pb-6">
          <CardTitle className={`${textSizes.title} font-semibold text-center text-foreground leading-relaxed`}>
            <div className="truncate px-2">{title}</div>
            <span className={`ml-2 text-muted-foreground font-normal ${textSizes.small} leading-relaxed`}>
              ({jobCount})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3 px-3 md:px-4 lg:px-6">
          {children}
        </CardContent>
      </Card>
    );
  };

  const DraggableJob = ({ job }: { job: any }) => {
    if (!job || !job.id) {
      console.warn('DraggableJob: Invalid job data', job);
      return null;
    }

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: job.id,
    });

    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
      <DraggableJobCard
        job={job}
        onViewJob={onViewJob}
        getDaysInStage={getDaysInStage}
        selectedJobIds={selectedJobIds}
        onToggleSelection={onToggleSelection}
        setNodeRef={setNodeRef}
        style={style}
        handleClick={() => onViewJob(job)}
        attributes={attributes}
        listeners={listeners}
        isDragging={isDragging}
      />
    );
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      sensors={sensors}
      onDragCancel={() => {
        console.log('Drag cancelled');
        setActiveId(null);
        handleMobileDragEnd();
        
        // Add mobile-specific feedback for cancellation
        if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
          navigator.vibrate([50, 50, 50]); // Triple vibration for cancellation
        }
      }}
    >
      {/* Mobile layout hint */}
      <div className="md:hidden mb-3 text-center">
        <p className={`${textSizes.small} text-muted-foreground`}>
          Drag jobs between sections below
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-4 sm:pb-6 px-2 sm:px-3 w-full" 
           style={{ 
             WebkitOverflowScrolling: 'touch',
             scrollbarWidth: 'thin'
           }}>
        {statusColumns.map(column => {
          // Handle both "Offer" and "Offer Received" statuses in the same column
          const columnJobs = validJobs.filter(job => 
            column.id === 'Offer' 
              ? (job.status === 'Offer' || job.status === 'Offer Received')
              : job.status === column.id
          );
          return (
            <DroppableColumn key={column.id} {...column}>
              <div className="space-y-2 sm:space-y-3">
                {columnJobs.map(job => (
                  <DraggableJob key={job.id} job={job} />
                ))}
              </div>
            </DroppableColumn>
          );
        })}
        
        {/* Show jobs with unknown status */}
        {(() => {
          const knownStatuses = statusColumns.map(col => col.id);
          // Add both offer variations to known statuses
          knownStatuses.push('Offer Received');
          
          const unknownStatusJobs = validJobs.filter(job => !knownStatuses.includes(job.status));
          
          if (unknownStatusJobs.length > 0) {
            return (
              <DroppableColumn 
                key="unknown" 
                id="unknown"
                title="Other" 
                color="bg-muted border-border hover:bg-muted/80"
              >
                <div className="space-y-3">
                  {unknownStatusJobs.map(job => (
                    <DraggableJob key={job.id} job={job} />
                  ))}
                </div>
              </DroppableColumn>
            );
          }
          return null;
        })()}
      </div>

      <DragOverlay>
        {activeId ? (() => {
          const activeJob = validJobs.find(job => job.id === activeId);
          return activeJob ? (
            <DraggableJobCard
              job={activeJob}
              onViewJob={onViewJob}
              getDaysInStage={getDaysInStage}
              selectedJobIds={selectedJobIds}
              onToggleSelection={onToggleSelection}
              setNodeRef={() => {}}
              style={{}}
              handleClick={() => {}}
              attributes={{}}
              listeners={{}}
            />
          ) : null;
        })() : null}
      </DragOverlay>
    </DndContext>
  );
}
