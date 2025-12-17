import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  Download, FileText, FileSpreadsheet, Calendar as CalendarIcon, 
  BarChart3, PieChart, LineChart, TrendingUp, Filter, Share2, 
  Save, Loader2, Plus, Trash2, Eye, Settings, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { BarChart, Bar, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from 'next-themes';

const COLORS = [
  '#ec4899', // pink
  '#3b82f6', // blue
  '#eab308', // yellow
  '#a855f7', // purple
  '#22c55e', // green
  '#f97316', // orange
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#ef4444', // red
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#ec4899', // pink (repeat)
  '#6366f1', // indigo
  '#10b981', // emerald
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3 backdrop-blur-sm">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm text-muted-foreground">
            {entry.name}: <span className="font-medium text-foreground">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface DateRange {
  from: Date;
  to: Date;
}

interface ReportMetric {
  id: string;
  label: string;
  category: string;
  enabled: boolean;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  metrics: string[];
  filters: any;
  visualizations: string[];
}

const DEFAULT_METRICS: ReportMetric[] = [
  // Application Metrics
  { id: 'total_applications', label: 'Total Applications', category: 'applications', enabled: true },
  { id: 'active_applications', label: 'Active Applications', category: 'applications', enabled: true },
  { id: 'response_rate', label: 'Response Rate', category: 'applications', enabled: true },
  { id: 'applications_by_status', label: 'Applications by Status', category: 'applications', enabled: false },
  { id: 'applications_by_company', label: 'Top Companies Applied', category: 'applications', enabled: false },
  { id: 'applications_by_role', label: 'Applications by Role Type', category: 'applications', enabled: false },
  { id: 'applications_by_industry', label: 'Applications by Industry', category: 'applications', enabled: false },
  
  // Interview Metrics
  { id: 'total_interviews', label: 'Total Interviews', category: 'interviews', enabled: true },
  { id: 'upcoming_interviews', label: 'Upcoming Interviews', category: 'interviews', enabled: true },
  { id: 'interview_conversion', label: 'Interview Conversion Rate', category: 'interviews', enabled: true },
  { id: 'interviews_by_stage', label: 'Interviews by Stage', category: 'interviews', enabled: false },
  { id: 'interview_success_rate', label: 'Interview Success Rate', category: 'interviews', enabled: false },
  
  // Offer Metrics
  { id: 'total_offers', label: 'Total Offers Received', category: 'offers', enabled: true },
  { id: 'offer_conversion', label: 'Offer Conversion Rate', category: 'offers', enabled: true },
  { id: 'avg_salary_offered', label: 'Average Salary Offered', category: 'offers', enabled: false },
  
  // Time Metrics
  { id: 'avg_time_to_response', label: 'Avg Time to Response', category: 'time', enabled: false },
  { id: 'avg_time_to_interview', label: 'Avg Time to Interview', category: 'time', enabled: false },
  { id: 'avg_time_to_offer', label: 'Avg Time to Offer', category: 'time', enabled: false },
  
  // Networking Metrics
  { id: 'total_contacts', label: 'Total Network Contacts', category: 'networking', enabled: false },
  { id: 'new_contacts', label: 'New Contacts Added', category: 'networking', enabled: false },
  { id: 'referral_rate', label: 'Referral Success Rate', category: 'networking', enabled: false },
  
  // Productivity Metrics
  { id: 'total_time_tracked', label: 'Total Time Tracked', category: 'productivity', enabled: false },
  { id: 'most_productive_day', label: 'Most Productive Day', category: 'productivity', enabled: false },
  { id: 'activity_breakdown', label: 'Activity Time Breakdown', category: 'productivity', enabled: false },
];

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'weekly_summary',
    name: 'Weekly Summary',
    description: 'Quick overview of the past week\'s job search activity',
    metrics: ['total_applications', 'total_interviews', 'response_rate', 'upcoming_interviews'],
    filters: { datePreset: 'last_7_days' },
    visualizations: ['summary_cards', 'trend_chart']
  },
  {
    id: 'monthly_performance',
    name: 'Monthly Performance',
    description: 'Comprehensive analysis of monthly job search metrics',
    metrics: ['total_applications', 'total_interviews', 'total_offers', 'response_rate', 'interview_conversion', 'offer_conversion', 'applications_by_status'],
    filters: { datePreset: 'this_month' },
    visualizations: ['summary_cards', 'trend_chart', 'status_pie']
  },
  {
    id: 'company_analysis',
    name: 'Company & Industry Analysis',
    description: 'Breakdown of applications by company and industry',
    metrics: ['applications_by_company', 'applications_by_industry', 'applications_by_role', 'response_rate'],
    filters: { datePreset: 'last_30_days' },
    visualizations: ['company_bar', 'industry_pie']
  },
  {
    id: 'interview_pipeline',
    name: 'Interview Pipeline',
    description: 'Detailed view of interview stages and conversion rates',
    metrics: ['total_interviews', 'interviews_by_stage', 'interview_conversion', 'interview_success_rate', 'upcoming_interviews'],
    filters: { datePreset: 'last_30_days' },
    visualizations: ['pipeline_funnel', 'stage_breakdown']
  },
  {
    id: 'networking_impact',
    name: 'Networking Impact',
    description: 'Measure the effectiveness of your networking efforts',
    metrics: ['total_contacts', 'new_contacts', 'referral_rate', 'total_applications'],
    filters: { datePreset: 'last_30_days' },
    visualizations: ['summary_cards', 'referral_impact']
  },
  {
    id: 'time_efficiency',
    name: 'Time & Efficiency Analysis',
    description: 'Track time invested and productivity patterns',
    metrics: ['total_time_tracked', 'most_productive_day', 'activity_breakdown', 'avg_time_to_response', 'avg_time_to_interview'],
    filters: { datePreset: 'last_30_days' },
    visualizations: ['time_allocation', 'efficiency_trends']
  }
];

export function CustomReportBuilder() {
  const { theme } = useTheme();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedMetrics, setSelectedMetrics] = useState<ReportMetric[]>(
    DEFAULT_METRICS.filter(m => m.enabled)
  );
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [visualizationType, setVisualizationType] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportName, setReportName] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareEmail, setShareEmail] = useState('');

  // Fetch user session
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    }
  });

  // Fetch jobs data
  const { data: jobs } = useQuery({
    queryKey: ['jobs', session?.user?.id, dateRange],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', session!.user!.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Fetch interviews data
  const { data: interviews } = useQuery({
    queryKey: ['interviews', session?.user?.id, dateRange],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interviews')
        .select('*, jobs(*)')
        .eq('user_id', session!.user!.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      if (error) throw error;
      return data;
    }
  });

  // Fetch contacts data
  const { data: contacts } = useQuery({
    queryKey: ['contacts', session?.user?.id, dateRange],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professional_contacts')
        .select('*')
        .eq('user_id', session!.user!.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      if (error) throw error;
      return data;
    }
  });

  // Fetch all contacts (for total count)
  const { data: allContacts } = useQuery({
    queryKey: ['all-contacts', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professional_contacts')
        .select('*')
        .eq('user_id', session!.user!.id);

      if (error) throw error;
      return data;
    }
  });

  // Fetch time tracking data
  const { data: timeEntries } = useQuery({
    queryKey: ['time-entries', session?.user?.id, dateRange],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_tracking_entries')
        .select('*')
        .eq('user_id', session!.user!.id)
        .gte('started_at', dateRange.from.toISOString())
        .lte('started_at', dateRange.to.toISOString());

      if (error) throw error;
      return data;
    }
  });

  // Calculate metrics
  const calculatedMetrics = useMemo(() => {
    if (!jobs) return {};

    const filteredJobs = jobs.filter(job => {
      if (selectedCompanies.length && !selectedCompanies.includes(job.company_name)) return false;
      if (selectedRoles.length && !selectedRoles.includes(job.job_title)) return false;
      if (selectedIndustries.length && job.industry && !selectedIndustries.includes(job.industry)) return false;
      return true;
    });

    const totalApplications = filteredJobs.length;
    const activeApplications = filteredJobs.filter(j => !j.archived_at).length;
    const responsesReceived = filteredJobs.filter(j => (j.status || '').toLowerCase() !== 'applied').length;
    const responseRate = totalApplications > 0 ? (responsesReceived / totalApplications) * 100 : 0;

    const totalInterviews = interviews?.length || 0;
    const upcomingInterviews = interviews?.filter(i => new Date(i.interview_date) > new Date()).length || 0;
    const interviewConversion = totalApplications > 0 ? (totalInterviews / totalApplications) * 100 : 0;

    const offeredJobs = filteredJobs.filter(j => {
      const status = (j.status || '').toLowerCase();
      return status === 'offered' || status === 'offer' || status === 'accepted' || status === 'offer received';
    });
    const totalOffers = offeredJobs.length;
    const offerConversion = totalApplications > 0 ? (totalOffers / totalApplications) * 100 : 0;

    // Status breakdown
    const statusBreakdown = filteredJobs.reduce((acc, job) => {
      const status = job.status || 'applied';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Company breakdown
    const companyBreakdown = filteredJobs.reduce((acc, job) => {
      acc[job.company_name] = (acc[job.company_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Industry breakdown
    const industryBreakdown = filteredJobs.reduce((acc, job) => {
      if (job.industry) {
        acc[job.industry] = (acc[job.industry] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Role breakdown
    const roleBreakdown = filteredJobs.reduce((acc, job) => {
      acc[job.job_title] = (acc[job.job_title] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Interview stages
    const interviewStages = interviews?.reduce((acc, interview) => {
      const stage = interview.interview_type || 'screening';
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Time tracking
    const totalTimeTracked = timeEntries?.reduce((sum, entry) => {
      if (entry.ended_at) {
        const duration = (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / (1000 * 60 * 60);
        return sum + duration;
      }
      return sum;
    }, 0) || 0;

    // Activity breakdown
    const activityBreakdown = timeEntries?.reduce((acc, entry) => {
      const activity = entry.activity_type || 'other';
      const duration = entry.ended_at 
        ? (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / (1000 * 60 * 60)
        : 0;
      if (duration > 0) {
        acc[activity] = (acc[activity] || 0) + duration;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    // If no time entries, return empty object (not undefined)
    const finalActivityBreakdown = Object.keys(activityBreakdown).length > 0 
      ? activityBreakdown 
      : {};

    // Average salaries
    const avgSalaryOffered = offeredJobs.length > 0
      ? offeredJobs.reduce((sum, job) => {
          const salary = (job as any).salary_max || 0;
          return sum + salary;
        }, 0) / offeredJobs.length
      : 0;

    // Interview success rate (offers / interviews)
    const interviewSuccessRate = totalInterviews > 0 
      ? (totalOffers / totalInterviews) * 100 
      : 0;

    // Referral rate (applications from referrals)
    const referredApplications = filteredJobs.filter(j => (j as any).referral_source).length;
    const referralRate = totalApplications > 0 
      ? (referredApplications / totalApplications) * 100 
      : 0;

    // Most productive day
    const dayBreakdown = timeEntries?.reduce((acc, entry) => {
      const day = format(new Date(entry.started_at), 'EEEE');
      const duration = entry.ended_at 
        ? (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / (1000 * 60 * 60)
        : 0;
      acc[day] = (acc[day] || 0) + duration;
      return acc;
    }, {} as Record<string, number>) || {};

    const mostProductiveDay = Object.entries(dayBreakdown).length > 0
      ? Object.entries(dayBreakdown).sort(([, a], [, b]) => b - a)[0][0]
      : 'N/A';

    // Average time to response
    const jobsWithResponse = filteredJobs.filter(j => 
      j.status !== 'applied' && j.created_at && j.updated_at
    );
    const avgTimeToResponse = jobsWithResponse.length > 0
      ? jobsWithResponse.reduce((sum, job) => {
          const days = (new Date(job.updated_at).getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / jobsWithResponse.length
      : 0;

    // Average time to interview
    const jobsWithInterviews = interviews?.filter(i => i.jobs && (i.jobs as any).created_at) || [];
    const avgTimeToInterview = jobsWithInterviews.length > 0
      ? jobsWithInterviews.reduce((sum, interview) => {
          const job = interview.jobs as any;
          const days = (new Date(interview.interview_date).getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / jobsWithInterviews.length
      : 0;

    // Average time to offer
    const avgTimeToOffer = offeredJobs.length > 0
      ? offeredJobs.reduce((sum, job) => {
          const days = (new Date(job.updated_at).getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / offeredJobs.length
      : 0;

    return {
      total_applications: totalApplications,
      active_applications: activeApplications,
      response_rate: responseRate,
      total_interviews: totalInterviews,
      upcoming_interviews: upcomingInterviews,
      interview_conversion: interviewConversion,
      interview_success_rate: interviewSuccessRate,
      total_offers: totalOffers,
      offer_conversion: offerConversion,
      applications_by_status: statusBreakdown,
      applications_by_company: companyBreakdown,
      applications_by_industry: industryBreakdown,
      applications_by_role: roleBreakdown,
      interviews_by_stage: interviewStages,
      total_contacts: allContacts?.length || 0,
      new_contacts: contacts?.length || 0,
      referral_rate: referralRate,
      total_time_tracked: totalTimeTracked,
      most_productive_day: mostProductiveDay,
      activity_breakdown: finalActivityBreakdown,
      avg_time_to_response: avgTimeToResponse,
      avg_time_to_interview: avgTimeToInterview,
      avg_time_to_offer: avgTimeToOffer,
      avg_salary_offered: avgSalaryOffered,
    };
  }, [jobs, interviews, contacts, allContacts, timeEntries, selectedCompanies, selectedRoles, selectedIndustries]);

  // Get unique values for filters
  const uniqueCompanies = useMemo(() => 
    Array.from(new Set(jobs?.map(j => j.company_name).filter(Boolean) || [])).sort(),
    [jobs]
  );

  const uniqueRoles = useMemo(() => 
    Array.from(new Set(jobs?.map(j => j.job_title).filter(Boolean) || [])).sort(),
    [jobs]
  );

  const uniqueIndustries = useMemo(() => 
    Array.from(new Set(jobs?.map(j => j.industry).filter(Boolean) || [])).sort(),
    [jobs]
  );

  const toggleMetric = (metricId: string) => {
    const metric = DEFAULT_METRICS.find(m => m.id === metricId);
    if (!metric) return;

    if (selectedMetrics.find(m => m.id === metricId)) {
      setSelectedMetrics(selectedMetrics.filter(m => m.id !== metricId));
    } else {
      setSelectedMetrics([...selectedMetrics, metric]);
    }
  };

  const applyTemplate = (template: ReportTemplate) => {
    const templateMetrics = DEFAULT_METRICS.filter(m => template.metrics.includes(m.id));
    
    if (templateMetrics.length === 0) {
      toast.error(`No valid metrics found for template: ${template.name}`);
      return;
    }
    
    // Add to existing metrics instead of replacing
    const existingMetricIds = new Set(selectedMetrics.map(m => m.id));
    const newMetrics = templateMetrics.filter(m => !existingMetricIds.has(m.id));
    
    if (newMetrics.length === 0) {
      toast.info(`All metrics from "${template.name}" are already added`);
    } else {
      setSelectedMetrics([...selectedMetrics, ...newMetrics]);
      toast.success(`Added ${newMetrics.length} metric${newMetrics.length > 1 ? 's' : ''} from ${template.name}`);
    }
    
    if (template.filters.datePreset) {
      const now = new Date();
      switch (template.filters.datePreset) {
        case 'last_7_days':
          setDateRange({ from: subDays(now, 7), to: now });
          break;
        case 'last_30_days':
          setDateRange({ from: subDays(now, 30), to: now });
          break;
        case 'this_month':
          setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
          break;
      }
    }
  };

  const exportAsPDF = async () => {
    setIsGenerating(true);
    try {
      const reportElement = document.getElementById('report-content');
      if (!reportElement) {
        throw new Error('Report content not found');
      }

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`job-search-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportAsExcel = () => {
    setIsGenerating(true);
    try {
      const csvRows: string[] = [];
      
      // Header
      csvRows.push(`Job Search Report - ${format(dateRange.from, 'MMM d, yyyy')} to ${format(dateRange.to, 'MMM d, yyyy')}\n`);
      csvRows.push('');
      
      // Metrics
      csvRows.push('Metric,Value');
      selectedMetrics.forEach(metric => {
        const value = calculatedMetrics[metric.id];
        if (typeof value === 'number') {
          csvRows.push(`${metric.label},${value.toFixed(2)}`);
        } else if (typeof value === 'object') {
          csvRows.push(`\n${metric.label}`);
          Object.entries(value).forEach(([key, val]) => {
            csvRows.push(`${key},${val}`);
          });
        }
      });

      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `job-search-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Excel/CSV exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export file');
    } finally {
      setIsGenerating(false);
    }
  };

  const shareReport = async () => {
    if (!shareEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setIsGenerating(true);
    try {
      // In a real implementation, this would send the report via email
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Report shared with ${shareEmail}`);
      setShowShareDialog(false);
      setShareEmail('');
    } catch (error) {
      toast.error('Failed to share report');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderMetricValue = (metric: ReportMetric) => {
    const value = calculatedMetrics[metric.id];
    
    if (value === undefined || value === null) {
      return <span className="text-muted-foreground">N/A</span>;
    }

    if (typeof value === 'number') {
      if (metric.id.includes('rate') || metric.id.includes('conversion')) {
        return <span className="text-2xl font-bold">{value.toFixed(1)}%</span>;
      }
      if (metric.id === 'avg_salary_offered') {
        return <span className="text-2xl font-bold">${(value / 1000).toFixed(0)}k</span>;
      }
      if (metric.id === 'total_time_tracked') {
        return <span className="text-2xl font-bold">{value.toFixed(1)} hrs</span>;
      }
      if (metric.id.includes('avg_time_to')) {
        return <span className="text-2xl font-bold">{value.toFixed(1)} days</span>;
      }
      return <span className="text-2xl font-bold">{Math.round(value)}</span>;
    }

    if (typeof value === 'string') {
      return <span className="text-2xl font-bold">{value}</span>;
    }

    return null;
  };

  const renderVisualization = (metric: ReportMetric) => {
    const value = calculatedMetrics[metric.id];
    
    if (typeof value !== 'object' || !value) return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No data available for this metric
      </div>
    );

    // For activity breakdown, format the values to show hours with proper rounding
    const isActivityBreakdown = metric.id === 'activity_breakdown';
    
    const chartData = Object.entries(value)
      .filter(([, count]) => (count as number) > 0) // Filter out zero values
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([name, count]) => ({ 
        name: name,
        value: isActivityBreakdown ? Math.round((count as number) * 10) / 10 : count // Round to 1 decimal for time
      }));

    if (chartData.length === 0) return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground space-y-2">
        <p className="font-medium">No data available for this time period</p>
        {metric.id === 'activity_breakdown' && (
          <p className="text-sm text-center max-w-md">
            Track your time using the Productivity features to see your activity breakdown here.
          </p>
        )}
      </div>
    );

    const isDark = theme === 'dark';
    const axisColor = isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))';
    const gridColor = isDark ? 'hsl(var(--border))' : '#e5e7eb';
    const labelColor = isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))';

    // Custom tick component for wrapping text
    const CustomizedAxisTick = (props: any) => {
      const { x, y, payload } = props;
      const words = payload.value.split(' ');
      const maxWidth = 100;
      const lines: string[] = [];
      let currentLine = '';

      words.forEach((word: string) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length * 6 > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) lines.push(currentLine);

      return (
        <g transform={`translate(${x},${y})`}>
          {lines.map((line, index) => (
            <text
              key={index}
              x={0}
              y={0}
              dy={index * 16 + 10}
              textAnchor="middle"
              fill={labelColor}
              fontSize={13}
              fontWeight={500}
            >
              {line}
            </text>
          ))}
        </g>
      );
    };

    if (metric.id.includes('by_status') || metric.id.includes('by_stage')) {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <RechartsPieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-in-out"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ 
                color: labelColor,
              }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      );
    }

    // Calculate dynamic height based on number of items and max label length
    const maxLabelLength = Math.max(...chartData.map(d => d.name.length));
    const estimatedLines = Math.ceil(maxLabelLength / 15); // Roughly 15 chars per line
    const bottomMargin = estimatedLines * 18 + 30; // Dynamic based on text lines + padding
    const chartHeight = 280 + bottomMargin;

    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart 
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: bottomMargin }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.3} />
          <XAxis 
            dataKey="name" 
            stroke={axisColor}
            interval={0}
            tick={<CustomizedAxisTick />}
          />
          <YAxis 
            stroke={axisColor}
            tick={{ fill: labelColor }}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const isActivityBreakdown = metric.id === 'activity_breakdown';
                const displayValue = isActivityBreakdown 
                  ? `${payload[0].value} hrs` 
                  : payload[0].value;
                
                return (
                  <div className="bg-background border border-border rounded-lg shadow-lg p-3 backdrop-blur-sm max-w-xs">
                    <p className="text-sm font-medium text-foreground mb-1 break-words">{payload[0].payload.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {isActivityBreakdown ? 'Hours' : 'Count'}: <span className="font-medium text-foreground">{displayValue}</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
            cursor={{ fill: isDark ? 'hsl(var(--muted) / 0.2)' : 'rgba(0, 0, 0, 0.05)' }} 
          />
          <Bar 
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-in-out"
            radius={[8, 8, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Report Configuration
          </CardTitle>
          <CardDescription>
            Customize your report by selecting metrics, date ranges, and filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="metrics" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="metrics" className="text-xs sm:text-sm px-1 sm:px-2">Metrics</TabsTrigger>
              <TabsTrigger value="dates" className="text-xs sm:text-sm px-1 sm:px-2">Date Range</TabsTrigger>
              <TabsTrigger value="filters" className="text-xs sm:text-sm px-1 sm:px-2">Filters</TabsTrigger>
              <TabsTrigger value="templates" className="text-xs sm:text-sm px-1 sm:px-2">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="metrics" className="space-y-4">
              <div className="space-y-4">
                {['applications', 'interviews', 'offers', 'time', 'networking', 'productivity'].map(category => (
                  <div key={category} className="space-y-2">
                    <h4 className="font-semibold capitalize">{category} Metrics</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {DEFAULT_METRICS.filter(m => m.category === category).map(metric => (
                        <div key={metric.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={metric.id}
                            checked={selectedMetrics.some(m => m.id === metric.id)}
                            onCheckedChange={() => toggleMetric(metric.id)}
                          />
                          <Label htmlFor={metric.id} className="cursor-pointer">
                            {metric.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="dates" className="space-y-4">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                  >
                    Last 30 Days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange({ from: subMonths(new Date(), 3), to: new Date() })}
                  >
                    Last 3 Months
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}
                  >
                    This Month
                  </Button>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(dateRange.from, 'PPP')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.from}
                          onSelect={(date) => date && setDateRange({ ...dateRange, from: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(dateRange.to, 'PPP')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(date) => date && setDateRange({ ...dateRange, to: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="filters" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Filter by Company</Label>
                  <Select
                    value={selectedCompanies[0] || 'all'}
                    onValueChange={(value) => setSelectedCompanies(value === 'all' ? [] : [value])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {uniqueCompanies.map(company => (
                        <SelectItem key={company} value={company}>{company}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCompanies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedCompanies.map(company => (
                        <Badge key={company} variant="secondary">
                          {company}
                          <button
                            onClick={() => setSelectedCompanies(selectedCompanies.filter(c => c !== company))}
                            className="ml-1 text-xs"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Filter by Role</Label>
                  <Select
                    value={selectedRoles[0] || 'all'}
                    onValueChange={(value) => setSelectedRoles(value === 'all' ? [] : [value])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {uniqueRoles.slice(0, 20).map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Filter by Industry</Label>
                  <Select
                    value={selectedIndustries[0] || 'all'}
                    onValueChange={(value) => setSelectedIndustries(value === 'all' ? [] : [value])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All industries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Industries</SelectItem>
                      {uniqueIndustries.map(industry => (
                        <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Click templates to add their metrics to your report
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedMetrics([])}
                >
                  Clear All Metrics
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {REPORT_TEMPLATES.map((template, index) => {
                  const colors = [
                    { bg: 'bg-pink-50 dark:bg-pink-950/30', border: 'border-pink-200 dark:border-pink-800', text: 'text-pink-700 dark:text-pink-300', button: 'bg-pink-500 hover:bg-pink-600' },
                    { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', button: 'bg-blue-500 hover:bg-blue-600' },
                    { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', button: 'bg-amber-500 hover:bg-amber-600' },
                    { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', button: 'bg-purple-500 hover:bg-purple-600' },
                    { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300', button: 'bg-green-500 hover:bg-green-600' },
                    { bg: 'bg-cyan-50 dark:bg-cyan-950/30', border: 'border-cyan-200 dark:border-cyan-800', text: 'text-cyan-700 dark:text-cyan-300', button: 'bg-cyan-500 hover:bg-cyan-600' },
                  ];
                  const color = colors[index % colors.length];
                  
                  return (
                    <Card key={template.id} className={`cursor-pointer ${color.bg} ${color.border} border-2 transition-all hover:shadow-lg hover:scale-[1.02]`}>
                      <CardHeader className="pb-3">
                        <CardTitle className={`text-base ${color.text} font-semibold`}>
                          {template.name}
                        </CardTitle>
                        <CardDescription className="text-sm">{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          onClick={() => applyTemplate(template)} 
                          size="sm" 
                          className={`w-full ${color.button} text-white border-0`}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add to Report
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Report Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Report Preview
              </CardTitle>
              <CardDescription>
                {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Share Report</DialogTitle>
                    <DialogDescription>
                      Share this report with mentors, coaches, or accountability partners
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="share-email">Email Address</Label>
                      <Input
                        id="share-email"
                        type="email"
                        placeholder="mentor@example.com"
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                      />
                    </div>
                    <Button onClick={shareReport} disabled={isGenerating} className="w-full">
                      {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
                      Send Report
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={exportAsExcel} disabled={isGenerating}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={exportAsPDF} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div id="report-content" className="space-y-6 bg-background p-6 rounded-lg border">
            {/* Report Header */}
            <div className="text-center border-b border-border pb-4">
              <h2 className="text-2xl font-bold text-foreground">Job Search Performance Report</h2>
              <p className="text-muted-foreground">
                {format(dateRange.from, 'MMMM d, yyyy')} - {format(dateRange.to, 'MMMM d, yyyy')}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Generated on {format(new Date(), 'PPP')}
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {selectedMetrics
                .filter(m => typeof calculatedMetrics[m.id] === 'number' || typeof calculatedMetrics[m.id] === 'string')
                .map((metric, index) => {
                  const cardColors = [
                    { bg: 'bg-pink-50 dark:bg-pink-950/30', border: 'border-pink-300 dark:border-pink-700', text: 'text-pink-700 dark:text-pink-300' },
                    { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-300' },
                    { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-300' },
                    { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-700 dark:text-purple-300' },
                    { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-300 dark:border-green-700', text: 'text-green-700 dark:text-green-300' },
                    { bg: 'bg-cyan-50 dark:bg-cyan-950/30', border: 'border-cyan-300 dark:border-cyan-700', text: 'text-cyan-700 dark:text-cyan-300' },
                    { bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-300 dark:border-rose-700', text: 'text-rose-700 dark:text-rose-300' },
                    { bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-300 dark:border-indigo-700', text: 'text-indigo-700 dark:text-indigo-300' },
                  ];
                  const color = cardColors[index % cardColors.length];
                  
                  return (
                    <Card key={metric.id} className={`${color.bg} ${color.border} border-2`}>
                      <CardHeader className="pb-2">
                        <CardTitle className={`text-sm font-medium ${color.text}`}>
                          {metric.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {renderMetricValue(metric)}
                      </CardContent>
                    </Card>
                  );
                })}
            </div>

            {/* Visualizations */}
            {selectedMetrics
              .filter(m => typeof calculatedMetrics[m.id] === 'object')
              .map((metric, index) => {
                const vizColors = [
                  { bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-300 dark:border-violet-700', title: 'text-violet-700 dark:text-violet-300' },
                  { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-300 dark:border-emerald-700', title: 'text-emerald-700 dark:text-emerald-300' },
                  { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-300 dark:border-orange-700', title: 'text-orange-700 dark:text-orange-300' },
                  { bg: 'bg-sky-50 dark:bg-sky-950/30', border: 'border-sky-300 dark:border-sky-700', title: 'text-sky-700 dark:text-sky-300' },
                  { bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/30', border: 'border-fuchsia-300 dark:border-fuchsia-700', title: 'text-fuchsia-700 dark:text-fuchsia-300' },
                  { bg: 'bg-lime-50 dark:bg-lime-950/30', border: 'border-lime-300 dark:border-lime-700', title: 'text-lime-700 dark:text-lime-300' },
                ];
                const color = vizColors[index % vizColors.length];
                
                return (
                  <Card key={metric.id} className={`${color.bg} ${color.border} border-2`}>
                    <CardHeader>
                      <CardTitle className={`text-base ${color.title} font-semibold`}>{metric.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="bg-background/50 rounded-md">
                      {renderVisualization(metric)}
                    </CardContent>
                  </Card>
                );
              })}

            {/* Insights */}
            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Key Insights & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {calculatedMetrics.response_rate !== undefined && (
                  <p className="text-sm text-foreground">
                    • Your response rate is <strong>{calculatedMetrics.response_rate.toFixed(1)}%</strong>
                    {calculatedMetrics.response_rate < 20 && " - Consider improving your application materials or targeting more suitable positions."}
                    {calculatedMetrics.response_rate >= 20 && calculatedMetrics.response_rate < 40 && " - This is a solid response rate. Keep applying consistently."}
                    {calculatedMetrics.response_rate >= 40 && " - Excellent response rate! Your applications are resonating well with employers."}
                  </p>
                )}
                {calculatedMetrics.interview_conversion !== undefined && (
                  <p className="text-sm text-foreground">
                    • Your interview conversion rate is <strong>{calculatedMetrics.interview_conversion.toFixed(1)}%</strong>
                    {calculatedMetrics.interview_conversion < 10 && " - Focus on strengthening your resume and cover letters."}
                    {calculatedMetrics.interview_conversion >= 10 && calculatedMetrics.interview_conversion < 25 && " - Good progress! Continue refining your approach."}
                    {calculatedMetrics.interview_conversion >= 25 && " - Outstanding conversion rate!"}
                  </p>
                )}
                {calculatedMetrics.total_applications !== undefined && calculatedMetrics.total_applications < 10 && (
                  <p className="text-sm text-foreground">
                    • You've submitted {calculatedMetrics.total_applications} applications in this period. Consider increasing your application volume.
                  </p>
                )}
                {calculatedMetrics.upcoming_interviews !== undefined && calculatedMetrics.upcoming_interviews > 0 && (
                  <p className="text-sm text-foreground">
                    • You have {calculatedMetrics.upcoming_interviews} upcoming interviews. Make sure to prepare thoroughly!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
