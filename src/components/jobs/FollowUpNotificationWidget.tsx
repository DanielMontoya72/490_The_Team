import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Clock, ArrowRight, CheckCircle } from 'lucide-react';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function FollowUpNotificationWidget() {
  const navigate = useNavigate();

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['pending-follow-up-reminders'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('smart_follow_up_reminders')
        .select(`
          *,
          jobs:job_id (
            id,
            title,
            company,
            status
          )
        `)
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .eq('is_dismissed', false)
        .order('reminder_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const urgentReminders = reminders?.filter(r => {
    const date = new Date(r.reminder_date);
    return isPast(date) || isToday(date) || isTomorrow(date);
  }) || [];

  if (urgentReminders.length === 0) {
    return null; // Don't show widget if no urgent reminders
  }

  const getPriorityColor = (reminderDate: string) => {
    const date = new Date(reminderDate);
    if (isPast(date) && !isToday(date)) return 'destructive';
    if (isToday(date)) return 'default';
    return 'secondary';
  };

  const getPriorityLabel = (reminderDate: string) => {
    const date = new Date(reminderDate);
    if (isPast(date) && !isToday(date)) return 'Overdue';
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Follow-Up Reminders
          </CardTitle>
          <Badge variant="outline">{urgentReminders.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {urgentReminders.slice(0, 3).map((reminder: any) => (
          <div 
            key={reminder.id}
            className="flex items-center justify-between p-2 rounded-lg bg-background border cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate(`/jobs?jobId=${reminder.job_id}`)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {reminder.jobs?.title || 'Unknown Position'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {reminder.jobs?.company || 'Unknown Company'}
              </p>
            </div>
            <Badge variant={getPriorityColor(reminder.reminder_date) as any}>
              {getPriorityLabel(reminder.reminder_date)}
            </Badge>
          </div>
        ))}
        
        {urgentReminders.length > 3 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full"
            onClick={() => navigate('/jobs')}
          >
            View all {urgentReminders.length} reminders
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}