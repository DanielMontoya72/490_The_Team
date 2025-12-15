import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { useTextSize } from '@/components/text-size-provider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Briefcase, 
  Send, 
  Calendar, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  FileText,
  Target,
  Download
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

interface JobStatisticsProps {
  jobs: any[];
  onDataReady?: (data: { avgTimeInStage: Record<string, number>; monthlyData: any[] }) => void;
}

export function JobStatistics({ jobs, onDataReady }: JobStatisticsProps) {
  const { theme: currentTheme } = useTheme();
  const { textSize } = useTextSize();
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [avgTimeInStage, setAvgTimeInStage] = useState<Record<string, number>>({});
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [deadlineAdherence, setDeadlineAdherence] = useState({ met: 0, missed: 0 });
  const [timeToOffer, setTimeToOffer] = useState<number | null>(null);

  useEffect(() => {
    if (onDataReady) {
      onDataReady({ avgTimeInStage, monthlyData });
    }
  }, [avgTimeInStage, monthlyData, onDataReady]);

  // Define responsive text sizes based on textSize setting
  const getTextSizes = () => {
    switch (textSize) {
      case 'xs':
        return {
          title: 'text-sm',
          subtitle: 'text-xs',
          body: 'text-xs',
          number: 'text-lg',
          icon: 'h-4 w-4'
        };
      case 'sm':
        return {
          title: 'text-base',
          subtitle: 'text-sm',
          body: 'text-xs',
          number: 'text-xl',
          icon: 'h-4 w-4'
        };
      case 'md':
        return {
          title: 'text-lg',
          subtitle: 'text-base',
          body: 'text-sm',
          number: 'text-2xl',
          icon: 'h-5 w-5'
        };
      case 'lg':
        return {
          title: 'text-xl',
          subtitle: 'text-lg',
          body: 'text-base',
          number: 'text-3xl',
          icon: 'h-6 w-6'
        };
      case 'xl':
        return {
          title: 'text-2xl',
          subtitle: 'text-xl',
          body: 'text-lg',
          number: 'text-4xl',
          icon: 'h-8 w-8'
        };
      default:
        return {
          title: 'text-lg',
          subtitle: 'text-base',
          body: 'text-sm',
          number: 'text-2xl',
          icon: 'h-5 w-5'
        };
    }
  };

  const textSizes = getTextSizes();

  useEffect(() => {
    calculateStatistics();
  }, [jobs]);

  const calculateStatistics = async () => {
    // Count jobs by status
    const counts: Record<string, number> = {};
    jobs.forEach(job => {
      counts[job.status] = (counts[job.status] || 0) + 1;
    });
    setStatusCounts(counts);

    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Get job IDs for current user
      const jobIds = jobs.map(job => job.id);
      
      // Fetch status history for time analysis (filter by user's jobs)
      const { data: history, error: historyError } = await supabase
        .from('job_status_history' as any)
        .select('*')
        .in('job_id', jobIds)
        .order('job_id')
        .order('changed_at', { ascending: true });

      if (historyError) {
        console.error('Error fetching status history:', historyError);
        // If table doesn't exist, history will be null - just skip stats calculation
        if (historyError.code === '42P01') {
          console.warn('job_status_history table does not exist yet');
          return;
        }
        throw historyError;
      }
      
      // Initialize status history for jobs that don't have any records
      if (history) {
        const jobsWithHistory = new Set(history.map((h: any) => h.job_id));
        const jobsNeedingHistory = jobs.filter(job => !jobsWithHistory.has(job.id));
        
        if (jobsNeedingHistory.length > 0) {
          const initialRecords = jobsNeedingHistory.map(job => ({
            job_id: job.id,
            user_id: user.id,
            from_status: null,
            to_status: job.status,
            changed_at: job.created_at || new Date().toISOString()
          }));
          
          await supabase
            .from('job_status_history' as any)
            .insert(initialRecords);
          
          // Re-fetch history to include the new records
          const { data: updatedHistory } = await supabase
            .from('job_status_history' as any)
            .select('*')
            .in('job_id', jobIds)
            .order('job_id')
            .order('changed_at', { ascending: true });
          
          if (updatedHistory) {
            history.push(...updatedHistory.filter((h: any) => 
              !history.some((existing: any) => existing.id === h.id)
            ));
          }
        }
      }

      // Calculate average time in each stage based on how long jobs have been
      // in their CURRENT stage (matches "days in stage" shown on job cards)
      const stageTimeMap: { [key: string]: number[] } = {};

      const nowForStages = new Date();
      const MS_PER_DAY = 1000 * 60 * 60 * 24;

      jobs.forEach(job => {
        if (!job.status) return;
        const statusDate = job.updated_at || job.created_at;
        if (!statusDate) return;

        const statusUpdateDate = new Date(statusDate);
        const daysInStage = Math.max(0, Math.round((nowForStages.getTime() - statusUpdateDate.getTime()) / MS_PER_DAY));

        if (!stageTimeMap[job.status]) {
          stageTimeMap[job.status] = [];
        }
        stageTimeMap[job.status].push(daysInStage);
      });

      const avgTimes: Record<string, number> = {};
      Object.entries(stageTimeMap).forEach(([stage, times]) => {
        const sum = times.reduce((a, b) => a + b, 0);
        avgTimes[stage] = Math.round(sum / times.length);
      });

      setAvgTimeInStage(avgTimes);

      // Calculate monthly application volume
      const monthlyCounts: Record<string, number> = {};
      jobs.forEach(job => {
        const month = new Date(job.created_at).toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        });
        monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
      });
      
      const chartData = Object.entries(monthlyCounts)
        .map(([month, count]) => ({ month, applications: count }))
        .slice(-6);
      setMonthlyData(chartData);

      // Calculate deadline adherence
      const now = new Date();
      let met = 0;
      let missed = 0;
      
      jobs.forEach(job => {
        if (job.application_deadline) {
          const deadline = new Date(job.application_deadline);
          if (job.status === 'Applied' && job.created_at) {
            const appliedDate = new Date(job.created_at);
            if (appliedDate <= deadline) {
              met++;
            } else {
              missed++;
            }
          } else if (deadline < now && job.status === 'Interested') {
            missed++;
          }
        }
      });
      
      setDeadlineAdherence({ met, missed });

      // Calculate time-to-offer (average days from "Interested" to "Offer Received" or "Accepted")
      const offerJobs = jobs.filter(job => 
        job.status === 'Offer' || job.status === 'Offer Received' || job.status === 'Accepted'
      );
      
      if (offerJobs.length > 0 && history && Array.isArray(history) && history.length > 0) {
        const timeToOfferDays: number[] = [];
        
        offerJobs.forEach(job => {
          const jobHistory = history.filter((h: any) => h.job_id === job.id)
            .sort((a: any, b: any) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
          
          if (jobHistory.length > 0) {
            const firstStatus = jobHistory[0];
            const lastStatus = jobHistory[jobHistory.length - 1];
            
            if ((firstStatus as any)?.changed_at && (lastStatus as any)?.changed_at) {
              const startTime = new Date((firstStatus as any).changed_at).getTime();
              const endTime = new Date((lastStatus as any).changed_at).getTime();
              const days = Math.round((endTime - startTime) / (1000 * 60 * 60 * 24));
              
              if (days >= 0) timeToOfferDays.push(days);
            }
          }
        });
        
        if (timeToOfferDays.length > 0) {
          const avgDays = Math.round(
            timeToOfferDays.reduce((a, b) => a + b, 0) / timeToOfferDays.length
          );
          setTimeToOffer(avgDays);
        }
      }
    } catch (error) {
      console.error('Error calculating statistics:', error);
    }
  };

  const totalJobs = jobs.length;
  const applied = (statusCounts['Applied'] || 0);
  const interested = (statusCounts['Interested'] || 0);
  // Interview count should only include interview stages, not offers
  const interviewed = (statusCounts['Phone Screen'] || 0) + 
                      (statusCounts['Interview'] || 0) + 
                      (statusCounts['Interview Scheduled'] || 0);
  const offers = (statusCounts['Offer'] || 0) + (statusCounts['Offer Received'] || 0) + (statusCounts['Accepted'] || 0);
  const rejected = (statusCounts['Rejected'] || 0);
  
  // Response rate: (jobs that got a response) / (total applications) × 100
  // Jobs that got a response = interviews + offers + rejected
  // Total applications = currently applied + those that got responses
  const respondedJobs = interviewed + offers + rejected;
  const totalApplications = applied + respondedJobs;
  const responseRate = totalApplications > 0 
    ? Math.round((respondedJobs / totalApplications) * 100) 
    : 0;

  const stats = [
    {
      label: 'Total Jobs',
      value: totalJobs,
      icon: Briefcase,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      label: 'Applied',
      value: applied,
      icon: Send,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    },
    {
      label: 'Interviews',
      value: interviewed,
      icon: Calendar,
      color: 'text-accent',
      bgColor: 'bg-accent/10'
    },
    {
      label: 'Offers',
      value: offers,
      icon: CheckCircle,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      label: 'Response Rate',
      value: `${responseRate}%`,
      icon: TrendingUp,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    },
    {
      label: 'Deadlines Met',
      value: `${deadlineAdherence.met}/${deadlineAdherence.met + deadlineAdherence.missed}`,
      icon: Target,
      color: 'text-accent',
      bgColor: 'bg-accent/10'
    },
    {
      label: 'Time to Offer',
      value: timeToOffer !== null ? `${timeToOffer}d` : 'N/A',
      icon: Clock,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    }
  ];

  const exportToCSV = () => {
    const csvData = [
      ['Metric', 'Value'],
      ['Total Jobs', totalJobs],
      ['Interested', interested],
      ['Applied', applied],
      ['Interviews', interviewed],
      ['Offers', offers],
      ['Response Rate', `${responseRate}%`],
      ['Deadlines Met', deadlineAdherence.met],
      ['Deadlines Missed', deadlineAdherence.missed],
      ['Average Time to Offer (days)', timeToOffer !== null ? timeToOffer : 'N/A'],
      [''],
      ['Stage', 'Average Days'],
      ...Object.entries(avgTimeInStage).map(([stage, days]) => [stage, days]),
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-statistics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Statistics exported to CSV');
  };

  return (
  <div className="space-y-6 flex flex-col items-center">
      <div className="flex items-center justify-between">
        <h2 className={`${textSizes.title} font-bold`}>Job Application Statistics</h2>
        <Button onClick={exportToCSV} variant="outline" size="sm" className="ml-8">
          <Download className={`${textSizes.icon} mr-2`} />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6 min-h-[140px] flex flex-col items-center justify-center">
            <div className="flex flex-col gap-3 h-full items-center justify-center">
              <div className={`p-3 rounded-lg ${stat.bgColor} self-center`}>
                <stat.icon className={`${textSizes.icon} ${stat.color}`} />
              </div>
              <div className="flex-1 text-center">
                <p className={`${textSizes.number} font-bold leading-tight`}>{stat.value}</p>
                <p className={`${textSizes.body} text-muted-foreground mt-2 leading-tight`}>{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function JobStatisticsCharts({ jobs, avgTimeInStage, monthlyData }: any) {
  const { textSize } = useTextSize();
  
  const getTextSizes = () => {
    switch (textSize) {
      case 'xs':
        return { title: 'text-sm', body: 'text-xs', icon: 'h-4 w-4' };
      case 'sm':
        return { title: 'text-base', body: 'text-xs', icon: 'h-4 w-4' };
      case 'md':
        return { title: 'text-lg', body: 'text-sm', icon: 'h-5 w-5' };
      case 'lg':
        return { title: 'text-xl', body: 'text-base', icon: 'h-6 w-6' };
      case 'xl':
        return { title: 'text-2xl', body: 'text-lg', icon: 'h-8 w-8' };
      default:
        return { title: 'text-lg', body: 'text-sm', icon: 'h-5 w-5' };
    }
  };

  const textSizes = getTextSizes();
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6 flex flex-col items-center justify-center">
        <h3 className={`${textSizes.title} font-semibold mb-4 flex items-center gap-2`}>
          <FileText className={textSizes.icon} />
          Monthly Application Volume
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Bar dataKey="applications" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6 flex flex-col items-center justify-center">
        <h3 className={`${textSizes.title} font-semibold mb-4 flex items-center gap-2`}>
          <Clock className={textSizes.icon} />
          Average Time in Each Stage
        </h3>
        <div className="space-y-3">
          {Object.entries(avgTimeInStage).length > 0 ? (
            Object.entries(avgTimeInStage)
              .sort((a: any, b: any) => (b[1] as number) - (a[1] as number))
              .map(([stage, days]) => (
                <div key={stage} className="flex justify-between items-center gap-8 min-w-0">
                  <span className={`${textSizes.body} font-medium flex-1`}>{stage}</span>
                  <span className={`${textSizes.body} text-muted-foreground flex-shrink-0`}>
                    {days as number} {(days as number) === 1 ? 'day' : 'days'}
                  </span>
                </div>
              ))
          ) : (
            <p className={`${textSizes.body} text-muted-foreground`}>No stage data available yet</p>
          )}
        </div>
      </Card>
    </div>
  );
}
