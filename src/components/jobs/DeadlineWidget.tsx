import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle } from 'lucide-react';
import { useTextSize } from '@/components/text-size-provider';

interface DeadlineWidgetProps {
  jobs: any[];
  onViewJob: (job: any) => void;
}

export function DeadlineWidget({ jobs, onViewJob }: DeadlineWidgetProps) {
  const { textSize } = useTextSize();

  const getTextSizes = () => {
    switch (textSize) {
      case 'xs':
        return {
          title: 'text-sm',
          body: 'text-sm',
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
  const jobsWithDeadlines = jobs
    .filter(j => j.application_deadline && !j.is_archived)
    .map(j => ({
      ...j,
      deadline: new Date(j.application_deadline),
      daysRemaining: Math.ceil((new Date(j.application_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    }))
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
    .slice(0, 5);

  const getUrgencyColor = (daysRemaining: number) => {
    if (daysRemaining < 0) return 'destructive';
    if (daysRemaining <= 3) return 'destructive';
    if (daysRemaining <= 7) return 'default';
    return 'secondary';
  };

  const getUrgencyLabel = (daysRemaining: number) => {
    if (daysRemaining < 0) return `${Math.abs(daysRemaining)} days overdue`;
    if (daysRemaining === 0) return 'Due today';
    if (daysRemaining === 1) return '1 day left';
    return `${daysRemaining} days left`;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className={`${textSizes.icon} flex-shrink-0`} />
        <h3 className={`${textSizes.title} font-semibold leading-relaxed`}>Upcoming Deadlines</h3>
      </div>
      
      {jobsWithDeadlines.length === 0 ? (
        <p className={`${textSizes.body} text-muted-foreground leading-relaxed`}>No upcoming deadlines</p>
      ) : (
        <div className="space-y-4">
          {jobsWithDeadlines.map(job => (
            <div
              key={job.id}
              className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
              onClick={() => onViewJob(job)}
            >
              <div className="flex-1 min-w-0 space-y-2">
                <h4 className={`${textSizes.body} font-semibold line-clamp-2 leading-relaxed`}>{job.job_title}</h4>
                <p className={`${textSizes.small} text-muted-foreground line-clamp-1 opacity-80 leading-relaxed`}>{job.company_name}</p>
                <p className={`${textSizes.small} text-muted-foreground opacity-60 leading-relaxed`}>
                  {job.deadline.toLocaleDateString()}
                </p>
              </div>
              <Badge variant={getUrgencyColor(job.daysRemaining) as any} className="shrink-0 px-3 py-1.5">
                {job.daysRemaining < 0 && <AlertCircle className="h-3 w-3 mr-2 flex-shrink-0" />}
                <span className={`${textSizes.small} font-medium`}>{getUrgencyLabel(job.daysRemaining)}</span>
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}