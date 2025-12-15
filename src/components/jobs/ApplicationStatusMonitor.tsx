import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Activity, Clock, TrendingUp, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ApplicationStatusMonitorProps {
  jobId: string;
}

interface StatusHistoryItem {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  notes: string | null;
}

export function ApplicationStatusMonitor({ jobId }: ApplicationStatusMonitorProps) {
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageResponseTime, setAverageResponseTime] = useState<number | null>(null);

  useEffect(() => {
    fetchStatusHistory();
    calculateResponseMetrics();
  }, [jobId]);

  const fetchStatusHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('job_status_history' as any)
        .select('*')
        .eq('job_id', jobId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setStatusHistory((data as any) || []);
    } catch (error) {
      console.error('Error fetching status history:', error);
      toast.error('Failed to load status history');
    } finally {
      setLoading(false);
    }
  };

  const calculateResponseMetrics = async () => {
    try {
      // Get all status changes for this job
      const { data, error } = await supabase
        .from('job_status_history' as any)
        .select('*')
        .eq('job_id', jobId)
        .order('changed_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 1) {
        // Calculate average time between status changes
        const timeDiffs: number[] = [];
        const items = data as any[];
        for (let i = 1; i < items.length; i++) {
          const prevDate = new Date(items[i - 1].changed_at);
          const currDate = new Date(items[i].changed_at);
          const diffInHours = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60);
          timeDiffs.push(diffInHours);
        }

        const avgTime = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
        setAverageResponseTime(avgTime);
      }
    } catch (error) {
      console.error('Error calculating response metrics:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('offer') || statusLower.includes('accepted')) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (statusLower.includes('rejected') || statusLower.includes('declined')) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (statusLower.includes('interview')) {
      return <Activity className="h-4 w-4 text-blue-500" />;
    }
    if (statusLower.includes('applied')) {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('offer') || statusLower.includes('accepted')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
    if (statusLower.includes('rejected') || statusLower.includes('declined')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
    if (statusLower.includes('interview')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
    if (statusLower.includes('applied')) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
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

  return (
    <div className="space-y-4">
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Status Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusHistory.length}</div>
            <p className="text-xs text-muted-foreground">Total transitions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageResponseTime 
                ? `${Math.round(averageResponseTime)}h` 
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Between status changes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Current Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusHistory.length > 0 ? (
              <Badge className={getStatusColor(statusHistory[0].to_status)}>
                {statusHistory[0].to_status}
              </Badge>
            ) : (
              <div className="text-sm text-muted-foreground">No status yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Application Timeline
          </CardTitle>
          <CardDescription>
            Track all status changes and progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No status changes recorded yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {statusHistory.map((item, index) => (
                  <div key={item.id} className="relative pl-8 pb-4">
                    {/* Timeline line */}
                    {index !== statusHistory.length - 1 && (
                      <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-border" />
                    )}
                    
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1 flex items-center justify-center w-4 h-4 rounded-full bg-background border-2 border-primary">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.to_status)}
                            {item.from_status && (
                              <>
                                <Badge variant="outline" className="text-xs">
                                  {item.from_status}
                                </Badge>
                                <span className="text-muted-foreground">→</span>
                              </>
                            )}
                            <Badge className={getStatusColor(item.to_status)}>
                              {item.to_status}
                            </Badge>
                          </div>
                          {item.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground text-right flex flex-col gap-2 min-w-[120px]">
                          <div className="font-medium">{format(new Date(item.changed_at), 'MMM d, yyyy')}</div>
                          <div className="text-xs opacity-75">
                            {formatDistanceToNow(new Date(item.changed_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}