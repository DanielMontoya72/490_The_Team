import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/layout/AppNav";
import { JobSidebar } from "@/components/layout/JobSidebar";
import { JobStatistics, JobStatisticsCharts } from "@/components/jobs/JobStatistics";
import { JobList } from "@/components/jobs/JobList";
import { ArchiveDialog } from "@/components/jobs/ArchiveDialog";
import { DeleteConfirmDialog } from "@/components/jobs/DeleteConfirmDialog";
import { JobSearchFilter } from "@/components/jobs/JobSearchFilter";
import JobPipeline from "@/components/jobs/JobPipeline";
import { DeadlineWidget } from "@/components/jobs/DeadlineWidget";
import { DeadlineCalendar } from "@/components/jobs/DeadlineCalendar";
import { JobDetailsDialog } from "@/components/jobs/JobDetailsDialog";
import { SimpleJobForm } from "@/components/jobs/SimpleJobForm";
import { BulkActionsBar } from "@/components/jobs/BulkActionsBar";
import { SavedSearchesManager } from "@/components/jobs/SavedSearchesManager";
import { CoverLetterPerformance } from "@/components/jobs/CoverLetterPerformance";
import { PlatformTrackingDashboard } from "@/components/platforms/PlatformTrackingDashboard";
import { InterviewCalendar } from "@/components/jobs/InterviewCalendar";
import { InlineInterviewCalendar } from "@/components/jobs/InlineInterviewCalendar";
import { GeneralizedToDoList } from "@/components/jobs/GeneralizedToDoList";
import { ApplicationAnalyticsDashboard } from "@/components/jobs/ApplicationAnalyticsDashboard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Archive, Undo2, LayoutGrid, LayoutList, BarChart3, Zap, Package, Users, DollarSign, Award,
  Briefcase, ChevronRight, Calendar, Clock, CheckCircle, Building2, TrendingUp, Send, Target
} from "lucide-react";
import { toast } from "sonner";
import { useTextSize } from "@/components/text-size-provider";
import { ApplicationWorkflowAutomation } from "@/components/jobs/ApplicationWorkflowAutomation";
import { BulkStatusUpdate } from "@/components/jobs/BulkStatusUpdate";
import { JobSearchPerformanceTab } from "@/components/jobs/JobSearchPerformanceTab";
import { JobMatchingTab } from "@/components/jobs/JobMatchingTab";
import { ReferralRequestManager } from "@/components/contacts/ReferralRequestManager";
import { InterviewPreparednessComparison } from "@/components/jobs/InterviewPreparednessComparison";
import { InterviewPredictionAccuracy } from "@/components/jobs/InterviewPredictionAccuracy";
import { AllInterviewsPreparationChecklists } from "@/components/jobs/AllInterviewsPreparationChecklists";
import { SalaryNegotiationManager } from "@/components/jobs/SalaryNegotiationManager";
import { AllInterviewsFollowUps } from "@/components/jobs/AllInterviewsFollowUps";
import { TimeTrackingWidget } from "@/components/productivity/TimeTrackingWidget";
import { TimeAllocationChart } from "@/components/productivity/TimeAllocationChart";
import { ProductivityPatterns } from "@/components/productivity/ProductivityPatterns";
import { ProductivityInsights } from "@/components/productivity/ProductivityInsights";
import { BurnoutMonitoring } from "@/components/productivity/BurnoutMonitoring";
import SuccessOptimization from "@/pages/SuccessOptimization";
import { TimeInvestmentAnalysis } from "@/components/productivity/TimeInvestmentAnalysis";
import { SkillDemandChart } from "@/components/market/SkillDemandChart";
import { MarketTrendsOverview } from "@/components/market/MarketTrendsOverview";
import { CareerInsights } from "@/components/market/CareerInsights";
import { CompanyGrowthTracker } from "@/components/market/CompanyGrowthTracker";
import { CompetitivePositioning } from "@/components/competitive/CompetitivePositioning";
import { PeerComparison } from "@/components/competitive/PeerComparison";
import { SkillGapsComparison } from "@/components/competitive/SkillGapsComparison";
import { DifferentiationStrategies } from "@/components/competitive/DifferentiationStrategies";
import { MarketPositioning } from "@/components/competitive/MarketPositioning";
import { PerformanceMetrics } from "@/components/competitive/PerformanceMetrics";
import { CompetitiveRecommendations } from "@/components/competitive/CompetitiveRecommendations";

export default function Jobs() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { textSize } = useTextSize();

  // Define responsive text sizes based on textSize setting
  const getTextSizes = () => {
    switch (textSize) {
      case 'xs':
        return {
          title: 'text-xl',
          subtitle: 'text-lg',
          body: 'text-sm',
          icon: 'h-4 w-4'
        };
      case 'sm':
        return {
          title: 'text-2xl',
          subtitle: 'text-xl',
          body: 'text-base',
          icon: 'h-4 w-4'
        };
      case 'md':
        return {
          title: 'text-3xl sm:text-4xl',
          subtitle: 'text-xl sm:text-2xl',
          body: 'text-lg',
          icon: 'h-5 w-5'
        };
      case 'lg':
        return {
          title: 'text-4xl sm:text-5xl',
          subtitle: 'text-2xl sm:text-3xl',
          body: 'text-xl',
          icon: 'h-6 w-6'
        };
      case 'xl':
        return {
          title: 'text-5xl sm:text-6xl',
          subtitle: 'text-3xl sm:text-4xl',
          body: 'text-2xl',
          icon: 'h-8 w-8'
        };
      default:
        return {
          title: 'text-3xl sm:text-4xl',
          subtitle: 'text-xl sm:text-2xl',
          body: 'text-lg',
          icon: 'h-5 w-5'
        };
    }
  };

  const textSizes = getTextSizes();
  const [session, setSession] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeTab, setActiveTab] = useState("active");
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [jobToArchive, setJobToArchive] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('pipeline');
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [selectedArchivedJobIds, setSelectedArchivedJobIds] = useState<string[]>([]);
  const [workflowAutomationOpen, setWorkflowAutomationOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<string>('details');
  const [bulkStatusUpdateOpen, setBulkStatusUpdateOpen] = useState(false);
  const [packageJobData, setPackageJobData] = useState<{ jobId: string; jobTitle: string; companyName: string } | null>(null);
  const [selectedPeriod] = useState(30);
  const [chartsData, setChartsData] = useState<{ avgTimeInStage: Record<string, number>; monthlyData: any[] }>({ 
    avgTimeInStage: {}, 
    monthlyData: [] 
  });

  // Add hub tab state
  const [hubActiveTab, setHubActiveTab] = useState("overview");

  // Productivity data queries
  const { data: timeEntries } = useQuery({
    queryKey: ['time-entries', session?.user?.id, selectedPeriod],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const startDate = new Date(Date.now() - selectedPeriod * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from('time_tracking_entries')
        .select('*')
        .eq('user_id', session!.user!.id)
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: productivityMetrics } = useQuery({
    queryKey: ['productivity-metrics', session?.user?.id, selectedPeriod],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const startDate = new Date(Date.now() - selectedPeriod * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from('productivity_metrics')
        .select('*')
        .eq('user_id', session!.user!.id)
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: productivityInsights } = useQuery({
    queryKey: ['productivity-insights', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('productivity_insights')
        .select('*')
        .eq('user_id', session!.user!.id)
        .gte('valid_until', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Market intelligence data queries
  const { data: skillTrends } = useQuery({
    queryKey: ['skill-demand-trends', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skill_demand_trends')
        .select('*')
        .order('analysis_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: marketTrends } = useQuery({
    queryKey: ['market-trends', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_trends')
        .select('*')
        .order('analysis_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: marketInsights } = useQuery({
    queryKey: ['market-insights', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_insights')
        .select('*')
        .eq('acknowledged', false)
        .order('priority_level', { ascending: false })
        .order('generated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: companyGrowth } = useQuery({
    queryKey: ['company-growth', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_growth_tracking')
        .select('*')
        .order('analysis_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Competitive Analysis data
  const { data: competitiveAnalysis } = useQuery({
    queryKey: ['competitive-analysis', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('competitive_analysis')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          navigate("/login");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session) {
      fetchJobs();
    }
  }, [session]);

  // Open job dialog from URL parameter
  useEffect(() => {
    const jobId = searchParams.get('jobId');
    if (jobId && jobs.length > 0) {
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        setSelectedJob(job);
        // Remove the parameter from URL after opening
        setSearchParams({});
      }
    }
  }, [searchParams, jobs]);

  // Open job dialog from navigation state
  useEffect(() => {
    const openJobId = location.state?.openJobId;
    if (openJobId && jobs.length > 0) {
      const job = jobs.find(j => j.id === openJobId);
      if (job) {
        setSelectedJob(job);
        // Clear the state after opening
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, jobs, navigate, location.pathname]);

  const fetchJobs = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('jobs' as any)
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
      
      // Update selectedJob if it's currently open
      if (selectedJob && data) {
        const updatedJob = data.find((j: any) => j.id === selectedJob.id);
        if (updatedJob) {
          setSelectedJob(updatedJob);
        }
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleAddJob = () => {
    setEditingJob(null);
    setSelectedJob(null);
    setShowForm(true);
  };

  const handleEditJob = (job) => {
    setEditingJob(job);
    setShowForm(true);
  };

  const handleViewJob = (job, tab = 'details') => {
    setSelectedJob(job);
    setInitialTab(tab);
  };

  const handleInterviewClick = async (jobId: string) => {
    try {
      // Find job in all jobs (not filtered)
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        // IMPORTANT: Set initialTab FIRST before selectedJob
        // This ensures the prop is updated before the dialog opens
        setInitialTab('interviews');
        
        // Use setTimeout to ensure state update completes
        setTimeout(() => {
          // Switch to active tab if the job is not archived
          if (!job.is_archived) {
            setActiveTab('active');
          }
          // Open the job details with interviews tab
          setSelectedJob(job);
        }, 0);
      } else {
        toast.error('Job not found');
      }
    } catch (error) {
      console.error('Error opening job from interview:', error);
      toast.error('Failed to open job details');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingJob(null);
  };

  const handleFormSuccess = () => {
    fetchJobs();
    setShowForm(false);
  };

  const handleJobUpdate = () => {
    fetchJobs();
  };

  const handleArchiveJobClick = (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    setJobToArchive(job);
    setArchiveDialogOpen(true);
  };

  const handleArchiveConfirm = async (reason: string) => {
    if (!jobToArchive) return;

    try {
      const { error } = await supabase
        .from('jobs' as any)
        .update({ 
          is_archived: true, 
          archived_at: new Date().toISOString(),
          archive_reason: reason
        } as any)
        .eq('id', jobToArchive.id);

      if (error) throw error;

      const archivedJobId = jobToArchive.id;
      
      // Show success toast with undo option
      toast.success('Job archived successfully', {
        duration: 5000,
        action: {
          label: <div className="flex items-center gap-1"><Undo2 className="h-3 w-3" />Undo</div>,
          onClick: () => handleRestoreJob(archivedJobId),
        },
      });

      fetchJobs();
      setArchiveDialogOpen(false);
      setJobToArchive(null);

      if (selectedJob?.id === archivedJobId) {
        setSelectedJob(null);
      }
    } catch (error) {
      console.error('Error archiving job:', error);
      toast.error('Failed to archive job');
    }
  };

  const handleRestoreJob = async (jobId) => {
    try {
      const { error } = await supabase
        .from('jobs' as any)
        .update({ 
          is_archived: false, 
          archived_at: null,
          archive_reason: null
        } as any)
        .eq('id', jobId);

      if (error) throw error;
      toast.success('Job restored successfully');
      fetchJobs();
    } catch (error) {
      console.error('Error restoring job:', error);
      toast.error('Failed to restore job');
    }
  };

  const handleDeleteJob = (jobId) => {
    setJobToDelete(jobId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteJob = async () => {
    if (!jobToDelete) return;

    try {
      const { error } = await supabase
        .from('jobs' as any)
        .delete()
        .eq('id', jobToDelete);

      if (error) throw error;
      toast.success('Job deleted permanently');
      fetchJobs();
      if (selectedJob?.id === jobToDelete) {
        setSelectedJob(null);
      }
      setDeleteDialogOpen(false);
      setJobToDelete(null);
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete job');
    }
  };

  const filterJobs = (jobList: any[]) => {
    return jobList.filter(job => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          job.job_title?.toLowerCase().includes(query) ||
          job.company_name?.toLowerCase().includes(query) ||
          job.job_description?.toLowerCase().includes(query) ||
          job.location?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status && job.status !== filters.status) return false;

      // Job type filter
      if (filters.jobType && job.job_type !== filters.jobType) return false;

      // Industry filter
      if (filters.industry && job.industry !== filters.industry) return false;

      // Location filter
      if (filters.location && !job.location?.toLowerCase().includes(filters.location.toLowerCase())) return false;

      // Salary filters
      if (filters.salaryMin && (!job.salary_range_min || job.salary_range_min < parseInt(filters.salaryMin))) return false;
      if (filters.salaryMax && (!job.salary_range_max || job.salary_range_max > parseInt(filters.salaryMax))) return false;

      // Deadline filters
      if (filters.deadlineFrom && job.application_deadline && new Date(job.application_deadline) < new Date(filters.deadlineFrom)) return false;
      if (filters.deadlineTo && job.application_deadline && new Date(job.application_deadline) > new Date(filters.deadlineTo)) return false;

      return true;
    });
  };

  const activeJobs = filterJobs(jobs.filter(j => !j.is_archived));
  const archivedJobs = jobs.filter(j => j.is_archived);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className={`${textSizes.subtitle} font-semibold mb-2 leading-tight`}>Loading...</h2>
          <p className={`text-muted-foreground ${textSizes.body} leading-relaxed`}>
            Checking authentication status. If you are not redirected, please{' '}
            <a href="/login" className="text-primary underline touch-manipulation">login</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Skip Links for Screen Readers */}
      <div className="sr-only focus-within:not-sr-only">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:p-4 focus:underline focus:outline-none focus:ring-2 focus:ring-primary-foreground"
          tabIndex={0}
        >
          Skip to main content
        </a>
        <a
          href="#job-hub-nav"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-20 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:p-4 focus:underline focus:outline-none focus:ring-2 focus:ring-primary-foreground"
          tabIndex={0}
        >
          Skip to job hub navigation
        </a>
        <a
          href="#job-stats"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-40 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:p-4 focus:underline focus:outline-none focus:ring-2 focus:ring-primary-foreground"
          tabIndex={0}
        >
          Skip to job statistics
        </a>
      </div>
      
      <AppNav />
      
      <div className="flex min-h-screen bg-background pt-16">
        <JobSidebar activeTab={hubActiveTab} onTabChange={setHubActiveTab} />

        {/* Main Content */}
        <main 
          id="main-content" 
          className="flex-1 overflow-hidden lg:ml-56" 
          tabIndex={-1}
          role="main"
          aria-label="Job Application Hub"
        >
          <div className="h-full overflow-y-auto">
            <div className="container mx-auto px-4 py-8 max-w-7xl lg:pt-0 pt-16">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <Briefcase className="h-8 w-8 text-primary" />
                  <h1 className="text-4xl font-bold">Job Application Hub</h1>
                </div>
                <p className="text-muted-foreground text-lg">
                  Your central command center for job applications, platforms, and interview management
                </p>
              </div>

              <div className="space-y-6">
                {hubActiveTab === "overview" && (
                  <div className="space-y-6">
                    {/* Quick Stats */}
                    <div id="job-stats" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                      {/* Total Jobs */}
                      <div title="Total number of job applications you've tracked">
                        <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
                          <CardContent className="p-4 text-center">
                            <Briefcase className="h-5 w-5 text-primary mx-auto mb-2" />
                            <div className="text-2xl font-bold text-primary">{jobs?.length || 0}</div>
                            <div className="text-xs text-muted-foreground">Total Jobs</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Applied */}
                      <div title="Jobs where you've submitted applications">
                        <Card className="border-2 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                          <CardContent className="p-4 text-center">
                            <Send className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{jobs?.filter(j => j.status === 'Applied')?.length || 0}</div>
                            <div className="text-xs text-muted-foreground">Applied</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Interviews */}
                      <div title="Jobs that progressed to interview stage">
                        <Card className="border-2 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700 transition-colors">
                          <CardContent className="p-4 text-center">
                            <Calendar className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {(jobs?.filter(j => j.status === 'Phone Screen' || j.status === 'Interview' || j.status === 'Interview Scheduled')?.length || 0)}
                            </div>
                            <div className="text-xs text-muted-foreground">Interviews</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Offers */}
                      <div title="Job offers you've received">
                        <Card className="border-2 border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                          <CardContent className="p-4 text-center">
                            <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                              {(jobs?.filter(j => j.status === 'Offer' || j.status === 'Offer Received' || j.status === 'Accepted')?.length || 0)}
                            </div>
                            <div className="text-xs text-muted-foreground">Offers</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Response Rate - Fixed Calculation */}
                      <div title="Percentage of applications that received any response (interview, offer, or rejection)">
                        <Card className="border-2 border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700 transition-colors">
                          <CardContent className="p-4 text-center">
                            <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                              {(() => {
                                const interviewed = jobs?.filter(j => j.status === 'Phone Screen' || j.status === 'Interview' || j.status === 'Interview Scheduled')?.length || 0;
                                const offers = jobs?.filter(j => j.status === 'Offer' || j.status === 'Offer Received' || j.status === 'Accepted')?.length || 0;
                                const rejected = jobs?.filter(j => j.status === 'Rejected')?.length || 0;
                                const total = jobs?.length || 0;
                                const responded = interviewed + offers + rejected;
                                return total > 0 ? Math.round((responded / total) * 100) : 0;
                              })()}%
                            </div>
                            <div className="text-xs text-muted-foreground">Response Rate</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Active Applications */}
                      <div title="Applications currently in progress (not archived)">
                        <Card className="border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                          <CardContent className="p-4 text-center">
                            <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                              {jobs?.filter(j => !j.is_archived)?.length || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">Active</div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Dashboard Overview */}
                    <div className="space-y-6">
                      {/* Welcome Section */}
                      <div className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 rounded-xl p-6 border border-primary/20">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-3 w-3 rounded-full bg-gradient-to-r from-primary to-secondary animate-pulse"></div>
                          <h3 className="text-lg font-semibold text-foreground">Welcome to your Job Search Hub</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Track interviews, manage deadlines, and stay organized with your job applications
                        </p>
                      </div>

                      {/* Main Dashboard Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Interview Calendar */}
                        <div className="lg:col-span-2">
                          <Card className="h-full border-2 border-blue-200/50 dark:border-blue-800/50 shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="pb-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">Upcoming Interviews</CardTitle>
                                    <CardDescription>Your scheduled interviews and important dates</CardDescription>
                                  </div>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setHubActiveTab("interviews")}
                                  className="text-xs"
                                >
                                  View All
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <InlineInterviewCalendar 
                                jobs={jobs} 
                                onViewJob={handleViewJob}
                                onInterviewClick={handleInterviewClick}
                              />
                            </CardContent>
                          </Card>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                          {/* Tasks Card */}
                          <Card className="border-2 border-green-200/50 dark:border-green-800/50 shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="pb-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">Today's Tasks</CardTitle>
                                    <CardDescription>Keep your job search on track</CardDescription>
                                  </div>
                                </div>
                                <Badge variant="outline" className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
                                  Active
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0 max-h-64 overflow-y-auto">
                              <GeneralizedToDoList compact />
                            </CardContent>
                          </Card>

                          {/* Deadlines Card */}
                          <Card className="border-2 border-orange-200/50 dark:border-orange-800/50 shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="pb-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                    <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
                                    <CardDescription>Don't miss application deadlines</CardDescription>
                                  </div>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setHubActiveTab("applications")}
                                  className="text-xs"
                                >
                                  Manage
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <DeadlineWidget jobs={jobs} onViewJob={handleViewJob} />
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setHubActiveTab("applications")}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <LayoutGrid className="h-5 w-5 text-primary" />
                            Manage Applications
                          </CardTitle>
                          <CardDescription>
                            View and manage all your job applications in one place
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button variant="outline" className="w-full">
                            View Applications
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setHubActiveTab("platforms")}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            Platform Tracking
                          </CardTitle>
                          <CardDescription>
                            Track applications across different job platforms
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button variant="outline" className="w-full">
                            Manage Platforms
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setHubActiveTab("interviews")}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            Interview Management
                          </CardTitle>
                          <CardDescription>
                            Schedule, prepare, and track interview progress
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button variant="outline" className="w-full">
                            Manage Interviews
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setHubActiveTab("analytics")}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            Application Analytics
                          </CardTitle>
                          <CardDescription>
                            Analyze application performance and trends
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button variant="outline" className="w-full">
                            View Analytics
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setHubActiveTab("success-optimization")}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            Success Optimization
                          </CardTitle>
                          <CardDescription>
                            Optimize your application strategy for better results
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button variant="outline" className="w-full">
                            Optimize Strategy
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowForm(true)}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-primary" />
                            Add New Application
                          </CardTitle>
                          <CardDescription>
                            Quick add a new job application to track
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button variant="outline" className="w-full">
                            Add Application
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setWorkflowAutomationOpen(true)}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary" />
                            Workflow Automation
                          </CardTitle>
                          <CardDescription>
                            Set up automated workflows and reminders
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button variant="outline" className="w-full">
                            Setup Automation
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {hubActiveTab === "applications" && (
                  <div className="space-y-6">
                    <Card className="shadow-sm">
                      <CardHeader className="pb-4 sm:pb-6">
                        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:justify-between sm:items-start">
                          <div className="min-w-0 flex-1">
                            <CardTitle className={`${textSizes.title} leading-tight break-words`}>Job Applications</CardTitle>
                            <CardDescription className={`${textSizes.body} leading-relaxed mt-1 sm:mt-2`}>Manage and track your job applications</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => setWorkflowAutomationOpen(true)}
                              size="lg"
                              variant="outline"
                              className="w-auto sm:min-w-[140px] touch-manipulation"
                            >
                              <Zap className={`${textSizes.icon} mr-2 flex-shrink-0`} />
                              <span className={`${textSizes.body} hidden sm:inline`}>Automation</span>
                            </Button>
                            <Button 
                              onClick={handleAddJob} 
                              size="lg" 
                              className="w-auto sm:min-w-[140px] touch-manipulation"
                            >
                              <Plus className={`${textSizes.icon} mr-2 flex-shrink-0`} />
                              <span className={`${textSizes.body}`}>Add Job</span>
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        {/* Content can be added here if needed */}
                      </CardContent>
                    </Card>

                    <Card className="w-full shadow-sm">
                      <CardContent className="pt-4 sm:pt-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                          <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
                            <TabsList className="w-full h-auto sm:h-14 flex flex-wrap sm:flex-nowrap gap-2 bg-transparent px-1 py-0 border-b-2 border-primary/20 overflow-x-auto scrollbar-thin">
                              <TabsTrigger value="active" className={`h-full ${textSizes.body} font-semibold touch-manipulation whitespace-nowrap px-4`}>
                                <span className="inline">Active Jobs</span>
                                <span className="ml-1 text-xs sm:text-sm">({activeJobs.length})</span>
                              </TabsTrigger>
                              <TabsTrigger value="archived" className={`h-full ${textSizes.body} font-semibold touch-manipulation whitespace-nowrap px-4`}>
                                <Archive className={`mr-2 ${textSizes.icon} flex-shrink-0`} />
                                <span className="inline">Archived</span>
                                <span className="ml-1 text-xs sm:text-sm">({archivedJobs.length})</span>
                              </TabsTrigger>
                            </TabsList>

                            {activeTab === "active" && (
                              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center w-full">
                                <div className="flex gap-2 order-2 sm:order-1">
                                  <DeadlineCalendar jobs={activeJobs} onViewJob={handleViewJob} />
                                  <SavedSearchesManager
                                    currentFilters={filters}
                                    currentSearchQuery={searchQuery}
                                    onLoadSearch={(loadedFilters, loadedQuery) => {
                                      setFilters(loadedFilters);
                                      setSearchQuery(loadedQuery);
                                    }}
                                  />
                                </div>
                                
                                <div className="flex gap-1 sm:gap-2 order-1 sm:order-2">
                                  <Button
                                    variant={viewMode === 'list' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setViewMode('list')}
                                    className="flex-1 sm:flex-none touch-manipulation min-h-[36px]"
                                  >
                                    <LayoutList className={`${textSizes.icon} mr-1 sm:mr-2 flex-shrink-0`} />
                                    <span className={`text-xs sm:text-sm ${textSizes.body}`}>List</span>
                                  </Button>
                                  <Button
                                    variant={viewMode === 'pipeline' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setViewMode('pipeline')}
                                    className="flex-1 sm:flex-none touch-manipulation min-h-[36px]"
                                  >
                                    <LayoutGrid className={`${textSizes.icon} mr-1 sm:mr-2 flex-shrink-0`} />
                                    <span className={`text-xs sm:text-sm ${textSizes.body}`}>Pipeline</span>
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>

                          <TabsContent value="active" className="mt-0">
                            <div className="space-y-4 sm:space-y-6">
                              <div className="sm:sticky sm:top-0 sm:z-10 sm:bg-background/95 sm:backdrop-blur-sm sm:py-2 sm:-mx-4 sm:px-4 sm:rounded-lg">
                                <JobSearchFilter 
                                  onFilterChange={setFilters}
                                  onSearchChange={setSearchQuery}
                                  initialFilters={filters}
                                  initialSearch={searchQuery}
                                />
                              </div>
                              
                              {viewMode === 'pipeline' ? (
                                <div className="bg-muted/20 rounded-lg p-2 sm:p-3 -mx-2 sm:-mx-3 overflow-x-auto">
                                  <JobPipeline
                                    jobs={activeJobs}
                                    onJobUpdate={fetchJobs}
                                    onViewJob={handleViewJob}
                                    selectedJobIds={selectedJobIds}
                                    onToggleSelection={(jobId) => {
                                      setSelectedJobIds(prev => 
                                        prev.includes(jobId) 
                                          ? prev.filter(id => id !== jobId)
                                          : [...prev, jobId]
                                      );
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <JobList
                                    jobs={activeJobs}
                                    loading={loading}
                                    onViewJob={handleViewJob}
                                    onEditJob={handleEditJob}
                                    onArchiveJob={handleArchiveJobClick}
                                    onDeleteJob={handleDeleteJob}
                                    selectedJobIds={selectedJobIds}
                                    onToggleSelection={(jobId) => {
                                      setSelectedJobIds(prev => 
                                        prev.includes(jobId) 
                                          ? prev.filter(id => id !== jobId)
                                          : [...prev, jobId]
                                      );
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </TabsContent>

                          <TabsContent value="archived" className="mt-0">
                            <div className="overflow-x-auto">
                              <JobList
                                jobs={archivedJobs}
                                loading={loading}
                                onViewJob={handleViewJob}
                                onRestoreJob={handleRestoreJob}
                                onDeleteJob={handleDeleteJob}
                                isArchived
                                selectedJobIds={selectedArchivedJobIds}
                                onToggleSelection={(jobId) => {
                                  setSelectedArchivedJobIds(prev => 
                                    prev.includes(jobId) 
                                      ? prev.filter(id => id !== jobId)
                                      : [...prev, jobId]
                                  );
                                }}
                              />
                            </div>
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {hubActiveTab === "platforms" && (
                  <PlatformTrackingDashboard />
                )}

                {hubActiveTab === "interviews" && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-6 w-6 text-primary" />
                          Interview Management
                        </CardTitle>
                        <CardDescription>
                          Schedule, prepare, and track your interview progress
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    
                    <Tabs defaultValue="calendar" className="w-full">
                      <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                        <TabsTrigger value="calendar" className="text-xs sm:text-sm px-1 sm:px-2">Calendar</TabsTrigger>
                        <TabsTrigger value="preparation" className="text-xs sm:text-sm px-1 sm:px-2">Preparation</TabsTrigger>
                        <TabsTrigger value="followups" className="text-xs sm:text-sm px-1 sm:px-2">Follow-Ups</TabsTrigger>
                      </TabsList>
                      <TabsContent value="calendar">
                        <InterviewCalendar onInterviewClick={handleInterviewClick} />
                      </TabsContent>
                      <TabsContent value="preparation">
                        <AllInterviewsPreparationChecklists />
                      </TabsContent>
                      <TabsContent value="followups">
                        <AllInterviewsFollowUps />
                      </TabsContent>
                    </Tabs>
                    
                    <div className="mt-8">
                      <h3 className={`${textSizes.subtitle} font-semibold mb-4`}>Interview Insights</h3>
                      <Tabs defaultValue="comparison" className="w-full">
                        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
                          <TabsTrigger value="comparison" className="text-xs sm:text-sm px-1 sm:px-2">Preparedness Comparison</TabsTrigger>
                          <TabsTrigger value="accuracy" className="text-xs sm:text-sm px-1 sm:px-2">Prediction Accuracy</TabsTrigger>
                        </TabsList>
                        <TabsContent value="comparison">
                          <InterviewPreparednessComparison />
                        </TabsContent>
                        <TabsContent value="accuracy">
                          <InterviewPredictionAccuracy />
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                )}

                {hubActiveTab === "salary" && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-6 w-6 text-primary" />
                          Salary Negotiation
                        </CardTitle>
                        <CardDescription>
                          Manage salary negotiations and track compensation discussions
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    
                    <SalaryNegotiationManager />
                  </div>
                )}

                {hubActiveTab === "analytics" && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-6 w-6 text-primary" />
                          Application Analytics
                        </CardTitle>
                        <CardDescription>
                          Analyze your job search performance and trends
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <CoverLetterPerformance />
                    <ApplicationAnalyticsDashboard />
                  </div>
                )}

                {hubActiveTab === "success-optimization" && (
                  <div className="space-y-6">
                    <SuccessOptimization />
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto">
            <DialogHeader className="pb-2 sm:pb-4">
              <DialogTitle className={`${textSizes.subtitle} leading-tight`}>Add New Job Opportunity</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto">
              <SimpleJobForm onSuccess={handleFormSuccess} />
            </div>
          </DialogContent>
        </Dialog>

        <JobDetailsDialog
          key={`${selectedJob?.id}-${initialTab}`}
          job={selectedJob}
          open={!!selectedJob}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedJob(null);
              setInitialTab('details');
            }
          }}
          onArchive={handleArchiveJobClick}
          onDelete={handleDeleteJob}
          onUpdate={handleJobUpdate}
          initialTab={initialTab}
        />

        {selectedJobIds.length > 0 && (
          <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-50">
            <BulkActionsBar
              selectedJobs={selectedJobIds}
              onClearSelection={() => setSelectedJobIds([])}
              onComplete={fetchJobs}
            />
          </div>
        )}

        {selectedArchivedJobIds.length > 0 && (
          <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-50">
            <BulkActionsBar
              selectedJobs={selectedArchivedJobIds}
              onClearSelection={() => setSelectedArchivedJobIds([])}
              onComplete={fetchJobs}
              isArchived
            />
          </div>
        )}

        <ArchiveDialog
          open={archiveDialogOpen}
          onOpenChange={setArchiveDialogOpen}
          onConfirm={handleArchiveConfirm}
          jobTitle={jobToArchive?.job_title}
        />

        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDeleteJob}
        />

        <ApplicationWorkflowAutomation
          open={workflowAutomationOpen}
          onOpenChange={setWorkflowAutomationOpen}
        />

        <BulkStatusUpdate
          open={bulkStatusUpdateOpen}
          onOpenChange={setBulkStatusUpdateOpen}
          selectedJobIds={selectedJobIds}
          onUpdate={fetchJobs}
        />
      </div>
    </>
  );
}
