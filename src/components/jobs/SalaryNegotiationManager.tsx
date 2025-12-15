import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Briefcase, Building2, MapPin, Calendar, TrendingUp, ChevronDown, ChevronUp, Download, Search, Loader2, Target, CheckCircle2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SalaryNegotiationPrep } from "./SalaryNegotiationPrep";

type NegotiationStatus = 
  | "not_started" 
  | "researching" 
  | "preparing" 
  | "negotiating" 
  | "accepted" 
  | "declined";

interface Job {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  salary_range_min: number | null;
  salary_range_max: number | null;
  status: string;
  salary_negotiation_notes: string | null;
  created_at: string;
  is_archived: boolean | null;
}

interface NegotiationData {
  status?: NegotiationStatus;
  notes?: string;
}

const statusColors = {
  not_started: "bg-gray-300 text-gray-800 hover:bg-gray-400 border-gray-400",
  researching: "bg-[#1E90FF] text-white hover:bg-[#1876d1] border-[#1E90FF]",
  preparing: "bg-[#7C2ADF] text-white hover:bg-[#6a24bd] border-[#7C2ADF]",
  negotiating: "bg-[#FF5800] text-white hover:bg-[#e04f00] border-[#FF5800]",
  accepted: "bg-[#FCBD16] text-black hover:bg-[#e0aa14] border-[#FCBD16]",
  declined: "bg-[#dc2626] text-white hover:bg-[#b91c1c] border-[#dc2626]",
};

const statusLabels = {
  not_started: "Not Started",
  researching: "Researching",
  preparing: "Preparing",
  negotiating: "Negotiating",
  accepted: "Accepted",
  declined: "Declined",
};

export function SalaryNegotiationManager() {
  const queryClient = useQueryClient();
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [jobGuidance, setJobGuidance] = useState<Record<string, any>>({});
  const [jobOutcomes, setJobOutcomes] = useState<Record<string, { outcome: string; actualSalary: string }>>({});
  const [selectedJobForPrep, setSelectedJobForPrep] = useState<string | null>(null);
  const [generatingJobId, setGeneratingJobId] = useState<string | null>(null);
  const [guidanceError, setGuidanceError] = useState<Record<string, string>>({});

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs-with-negotiation'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_title, company_name, location, salary_range_min, salary_range_max, status, salary_negotiation_notes, created_at, is_archived')
        .eq('user_id', user.id)
        .neq('is_archived', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Job[];
    },
  });

  // Fetch salary research for all jobs
  const { data: salaryResearchMap } = useQuery({
    queryKey: ['salary-research-all'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};

      const { data, error } = await supabase
        .from('salary_research')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Create a map of jobId -> research data
      const researchMap: Record<string, any> = {};
      (data || []).forEach((research) => {
        if (research.job_id) {
          researchMap[research.job_id] = research;
        }
      });
      return researchMap;
    },
    enabled: !!jobs && jobs.length > 0,
  });

  const recordOutcomeMutation = useMutation({
    mutationFn: async ({ jobId, outcome, actualSalary }: { jobId: string; outcome: string; actualSalary: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const job = jobs?.find(j => j.id === jobId);
      const salaryResearch = salaryResearchMap?.[jobId];

      // Update salary research with outcome
      if (salaryResearch) {
        const { error } = await supabase
          .from('salary_research')
          .update({
            negotiation_outcome: outcome,
            final_salary: actualSalary ? parseInt(actualSalary) : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', salaryResearch.id);

        if (error) throw error;
      }

      return { jobId, outcome, actualSalary };
    },
    onSuccess: ({ jobId, outcome, actualSalary }) => {
      setJobOutcomes(prev => ({ ...prev, [jobId]: { outcome, actualSalary } }));
      queryClient.invalidateQueries({ queryKey: ['salary-research-all'] });
      toast.success("Negotiation outcome recorded");
    },
    onError: (error: any) => {
      toast.error("Failed to record outcome: " + (error?.message || 'Unknown error'));
    },
  });

  const generateGuidanceMutation = useMutation({
    mutationFn: async (jobId: string) => {
      setGeneratingJobId(jobId);
      setGuidanceError(prev => { const newState = { ...prev }; delete newState[jobId]; return newState; });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const job = jobs?.find(j => j.id === jobId);
      const salaryResearch = salaryResearchMap?.[jobId];

      const { data, error } = await supabase.functions.invoke('generate-negotiation-guidance', {
        body: {
          jobTitle: job?.job_title,
          companyName: job?.company_name,
          location: job?.location,
          marketSalaryData: salaryResearch || {},
          currentSalary: null,
          targetSalary: null,
          userExperience: '',
          userAchievements: ''
        }
      });

      if (error) throw error;
      
      // Validate the response has expected structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from AI');
      }
      
      return { jobId, guidance: data };
    },
    onSuccess: ({ jobId, guidance }) => {
      setJobGuidance(prev => ({ ...prev, [jobId]: guidance }));
      setGeneratingJobId(null);
      toast.success("Negotiation strategy generated for this job");
    },
    onError: (error: any, jobId: string) => {
      setGeneratingJobId(null);
      setGuidanceError(prev => ({ ...prev, [jobId]: error?.message || 'Unknown error' }));
      toast.error("Failed to generate strategy: " + (error?.message || 'Unknown error'));
    },
  });

  const researchSalaryMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const job = jobs?.find(j => j.id === jobId);
      if (!job) throw new Error('Job not found');

      const { data, error } = await supabase.functions.invoke('research-salary', {
        body: {
          jobId,
          jobTitle: job.job_title,
          location: job.location,
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-research-all'] });
      toast.success("Salary research completed");
    },
    onError: (error: any) => {
      toast.error("Failed to research salary: " + (error?.message || 'Unknown error'));
    },
  });

  const exportSalaryData = (job: Job, research: any) => {
    const exportData = {
      job_title: job.job_title,
      company: job.company_name,
      location: job.location,
      research_date: new Date().toISOString(),
      posted_range: {
        min: job.salary_range_min,
        max: job.salary_range_max,
      },
      market_data: {
        median: research.median_salary,
        percentile_25: research.percentile_25,
        percentile_75: research.percentile_75,
      },
      compensation_breakdown: {
        base_salary: research.base_salary_avg,
        bonus: research.bonus_avg,
        equity: research.equity_avg,
        benefits: research.benefits_value,
        total_compensation: research.total_compensation_avg,
      },
      market_comparisons: research.market_comparisons || [],
      market_position: research.market_position || {},
      historical_trends: research.historical_trends || [],
      negotiation_recommendations: research.negotiation_recommendations || [],
      similar_positions: research.similar_positions || [],
    };

    // JSON Export
    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `salary-research-${job.job_title.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    jsonLink.click();
    URL.revokeObjectURL(jsonUrl);

    // CSV Export
    const csvRows = [
      ['Salary Research Export', ''],
      ['Job Title', job.job_title],
      ['Company', job.company_name],
      ['Location', job.location || 'N/A'],
      ['', ''],
      ['Posted Salary Range', ''],
      ['Minimum', `$${job.salary_range_min?.toLocaleString() || 'N/A'}`],
      ['Maximum', `$${job.salary_range_max?.toLocaleString() || 'N/A'}`],
      ['', ''],
      ['Market Data', ''],
      ['Median Salary', `$${research.median_salary?.toLocaleString() || 'N/A'}`],
      ['25th Percentile', `$${research.percentile_25?.toLocaleString() || 'N/A'}`],
      ['75th Percentile', `$${research.percentile_75?.toLocaleString() || 'N/A'}`],
      ['', ''],
      ['Market Position', ''],
      ['Status', research.research_summary?.market_position?.is_above_market ? 'Above Market' : 'Below Market'],
      ['', ''],
      ['Recommendations', ''],
      ...(research.research_summary?.negotiation_recommendations || []).map((rec: any, idx: number) => 
        [`${idx + 1}`, typeof rec === 'string' ? rec : rec.recommendation || JSON.stringify(rec)]
      ),
    ];

    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = `salary-research-${job.job_title.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    csvLink.click();
    URL.revokeObjectURL(csvUrl);

    toast.success("Salary data exported");
  };

  const updateNegotiationStatus = useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: NegotiationStatus }) => {
      // Get current job to preserve any existing notes
      const { data: currentJob, error: fetchError } = await supabase
        .from('jobs')
        .select('salary_negotiation_notes')
        .eq('id', jobId)
        .single();

      if (fetchError) {
        console.error('Error fetching current job:', fetchError);
        throw fetchError;
      }

      let existingData: NegotiationData = {};
      if (currentJob?.salary_negotiation_notes) {
        try {
          existingData = JSON.parse(currentJob.salary_negotiation_notes);
        } catch (e) {
          // If it's not JSON, treat it as plain notes
          console.log('Converting non-JSON notes to structured format');
          existingData = { notes: currentJob.salary_negotiation_notes };
        }
      }

      const updatedData: NegotiationData = {
        ...existingData,
        status
      };

      const { error: updateError } = await supabase
        .from('jobs')
        .update({ 
          salary_negotiation_notes: JSON.stringify(updatedData)
        })
        .eq('id', jobId);

      if (updateError) {
        console.error('Error updating negotiation status:', updateError);
        throw updateError;
      }

      return updatedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs-with-negotiation'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success("Negotiation status updated");
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      toast.error("Failed to update status: " + (error?.message || 'Unknown error'));
    },
  });

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Salary Negotiation Manager
          </CardTitle>
          <CardDescription>
            Track and manage salary negotiations for your job offers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No jobs with offers or negotiations found.</p>
            <p className="text-sm mt-2">Jobs with "Offer Received" or "Negotiating" status will appear here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <DollarSign className="h-6 w-6 text-primary" />
          Salary Negotiation Manager
        </CardTitle>
        <CardDescription className="text-base">
          Track and manage salary negotiations for {jobs.length} job {jobs.length === 1 ? 'offer' : 'offers'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="overview">Negotiation Overview</TabsTrigger>
            <TabsTrigger value="preparation">Preparation Tools</TabsTrigger>
          </TabsList>

          {/* Overview Tab - All Jobs */}
          <TabsContent value="overview" className="space-y-4">
        {jobs.map((job) => {
          // Parse negotiation status from salary_negotiation_notes
          let negotiationData: NegotiationData = {};
          if (job.salary_negotiation_notes) {
            try {
              negotiationData = JSON.parse(job.salary_negotiation_notes);
            } catch {
              // If it's not JSON, it's just plain notes
              negotiationData = { notes: job.salary_negotiation_notes };
            }
          }
          const currentStatus = (negotiationData.status || 'not_started') as NegotiationStatus;
          const isExpanded = expandedJob === job.id;
          const salaryResearch = salaryResearchMap?.[job.id];

          return (
            <div key={job.id} className="border-2 border-primary/20 rounded-lg p-4 space-y-3 bg-gradient-to-br from-primary/5 to-transparent hover:shadow-lg transition-shadow">
              {/* Job Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
                    <h3 className="font-semibold truncate">{job.job_title}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Building2 className="h-3 w-3 flex-shrink-0 text-secondary" />
                    <span className="truncate">{job.company_name}</span>
                  </div>
                  {job.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 flex-shrink-0 text-accent" />
                      <span className="truncate">{job.location}</span>
                    </div>
                  )}
                </div>

                {/* Salary Range */}
                {(job.salary_range_min || job.salary_range_max) && (
                  <div className="text-right bg-primary/10 px-3 py-2 rounded-lg border border-primary/30">
                    <div className="flex items-center gap-1 text-sm font-medium mb-1">
                      <TrendingUp className="h-3 w-3 text-primary" />
                      <span className="text-primary">Posted Range</span>
                    </div>
                    <div className="font-bold text-lg">
                      {formatCurrency(job.salary_range_min)} - {formatCurrency(job.salary_range_max)}
                    </div>
                  </div>
                )}
              </div>

              {/* Job Status Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Job Status:</span>
                <Badge className="bg-secondary/20 text-secondary border-secondary/30">{job.status.replace(/_/g, ' ').toUpperCase()}</Badge>
              </div>

              {/* Negotiation Status Buttons */}
              <div className="space-y-2">
                <span className="text-sm font-medium">Negotiation Status:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {(Object.keys(statusColors) as NegotiationStatus[]).map((status) => {
                    const isActive = currentStatus === status;
                    return (
                      <button
                        key={status}
                        onClick={() => updateNegotiationStatus.mutate({ jobId: job.id, status })}
                        disabled={updateNegotiationStatus.isPending}
                        className={cn(
                          "px-2 py-2 rounded-md font-medium transition-all border-2 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 whitespace-nowrap text-[10px] leading-tight",
                          isActive 
                            ? statusColors[status] + " shadow-md scale-105 ring-2 ring-offset-2"
                            : status === 'not_started' 
                              ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300 hover:scale-105"
                              : status === 'researching'
                                ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300 hover:scale-105"
                                : status === 'preparing'
                                  ? "bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-300 hover:scale-105"
                                  : status === 'negotiating'
                                    ? "bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300 hover:scale-105"
                                    : status === 'accepted'
                                      ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-300 hover:scale-105"
                                      : "bg-red-100 text-red-700 hover:bg-red-200 border-red-300 hover:scale-105"
                        )}
                      >
                        {updateNegotiationStatus.isPending ? (
                          <span className="flex items-center justify-center gap-1">
                            <span className="animate-spin">⏳</span>
                            <span>{statusLabels[status]}</span>
                          </span>
                        ) : (
                          statusLabels[status]
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Market Research Section */}
              <div className="pt-3 border-t border-primary/20">
                {!salaryResearch ? (
                  <div className="bg-muted/30 rounded-lg p-4 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">No salary research available yet</p>
                    <Button
                      onClick={() => researchSalaryMutation.mutate(job.id)}
                      disabled={researchSalaryMutation.isPending}
                      size="sm"
                      className="gap-2"
                    >
                      {researchSalaryMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Researching...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4" />
                          Research Salary Data
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Market Data Summary */}
                    <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Market Research Data
                        </h4>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => researchSalaryMutation.mutate(job.id)}
                            disabled={researchSalaryMutation.isPending}
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            title="Refresh salary research data"
                          >
                            {researchSalaryMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Search className="h-3 w-3" />
                            )}
                            Refresh
                          </Button>
                          <Button
                            onClick={() => exportSalaryData(job, salaryResearch)}
                            variant="outline"
                            size="sm"
                            className="gap-1"
                          >
                            <Download className="h-3 w-3" />
                            Export
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.preventDefault();
                              console.log('Details clicked, current:', isExpanded, 'jobId:', job.id);
                              setExpandedJob(isExpanded ? null : job.id);
                            }}
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-4 w-4" />
                                Less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4" />
                                Details
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-3">
                        {salaryResearch.median_salary && (
                          <div className="bg-background/80 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground mb-1">Median</div>
                            <div className="text-lg font-bold text-primary">
                              ${salaryResearch.median_salary.toLocaleString()}
                            </div>
                          </div>
                        )}
                        {salaryResearch.percentile_25 && (
                          <div className="bg-background/80 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground mb-1">25th %ile</div>
                            <div className="text-base font-semibold">
                              ${salaryResearch.percentile_25.toLocaleString()}
                            </div>
                          </div>
                        )}
                        {salaryResearch.percentile_75 && (
                          <div className="bg-background/80 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground mb-1">75th %ile</div>
                            <div className="text-base font-semibold">
                              ${salaryResearch.percentile_75.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Market Position */}
                      {salaryResearch.market_position && (
                        <div className="flex items-center gap-2">
                          <Badge variant={salaryResearch.market_position === 'above' ? "default" : "secondary"}>
                            {salaryResearch.market_position === 'above' ? "Above Market" : 
                             salaryResearch.market_position === 'below' ? "Below Market" : "At Market"}
                          </Badge>
                          {salaryResearch.compensation_gap && (
                            <span className="text-sm">
                              {salaryResearch.compensation_gap > 0 ? '+' : '-'}
                              ${Math.abs(salaryResearch.compensation_gap).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>


                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="space-y-3 border-t pt-3 mt-3">
                        <p className="text-xs text-muted-foreground italic">Detailed breakdown:</p>
                        
                        {/* Research Context Factors */}
                        {(salaryResearch.location || salaryResearch.experience_level || salaryResearch.company_size) && (
                          <div className="bg-[#1E90FF]/10 rounded-lg p-4 border border-[#1E90FF]/30">
                            <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Research Factors
                            </h5>
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              {salaryResearch.location && (
                                <div className="flex flex-col gap-1">
                                  <span className="text-muted-foreground">Location:</span>
                                  <span className="font-medium">{salaryResearch.location}</span>
                                </div>
                              )}
                              {salaryResearch.experience_level && (
                                <div className="flex flex-col gap-1">
                                  <span className="text-muted-foreground">Experience:</span>
                                  <span className="font-medium capitalize">{salaryResearch.experience_level.replace(/_/g, ' ')}</span>
                                </div>
                              )}
                              {salaryResearch.company_size && (
                                <div className="flex flex-col gap-1">
                                  <span className="text-muted-foreground">Company Size:</span>
                                  <span className="font-medium">{salaryResearch.company_size}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Similar Positions */}
                        {salaryResearch.similar_positions && Array.isArray(salaryResearch.similar_positions) && salaryResearch.similar_positions.length > 0 && (
                          <div className="bg-[#7C2ADF]/10 rounded-lg p-4 border border-[#7C2ADF]/30">
                            <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <Briefcase className="h-4 w-4" />
                              Similar Position Ranges
                            </h5>
                            <div className="space-y-2.5">
                              {salaryResearch.similar_positions.slice(0, 3).map((pos: any, idx: number) => (
                                <div key={idx} className="flex items-start justify-between text-xs p-4 bg-background/50 rounded gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium break-words">{pos.title || 'Similar Role'}</div>
                                    {pos.requirements_match && (
                                      <div className="text-xs text-muted-foreground mt-1">{pos.requirements_match}% match</div>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="shrink-0 text-xs whitespace-nowrap">
                                    {pos.salary_range || 'N/A'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Compensation Breakdown */}
                        {(salaryResearch.base_salary_avg != null || salaryResearch.bonus_avg != null || salaryResearch.equity_avg != null || salaryResearch.benefits_value != null || salaryResearch.total_compensation_avg != null) && (
                          <div className="bg-[#FF69B4]/10 rounded-lg p-4 border border-[#FF69B4]/30">
                            <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              Total Compensation Breakdown
                            </h5>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              {salaryResearch.base_salary_avg != null && (
                                <div className="flex items-center gap-2 py-1">
                                  <span className="text-muted-foreground whitespace-nowrap">Base Salary:</span>
                                  <span className="font-medium">${salaryResearch.base_salary_avg.toLocaleString()}</span>
                                </div>
                              )}
                              {salaryResearch.bonus_avg != null && (
                                <div className="flex items-center gap-2 py-1">
                                  <span className="text-muted-foreground whitespace-nowrap">Bonus:</span>
                                  <span className="font-medium">${salaryResearch.bonus_avg.toLocaleString()}</span>
                                </div>
                              )}
                              {salaryResearch.equity_avg != null && (
                                <div className="flex items-center gap-2 py-1">
                                  <span className="text-muted-foreground whitespace-nowrap">Equity:</span>
                                  <span className="font-medium">${salaryResearch.equity_avg.toLocaleString()}</span>
                                </div>
                              )}
                              {salaryResearch.benefits_value != null && (
                                <div className="flex items-center gap-2 py-1">
                                  <span className="text-muted-foreground whitespace-nowrap">Benefits Value:</span>
                                  <span className="font-medium">${salaryResearch.benefits_value.toLocaleString()}</span>
                                </div>
                              )}
                              {salaryResearch.total_compensation_avg != null && (
                                <div className="flex items-center gap-2 col-span-2 pt-3 mt-1 border-t">
                                  <span className="text-muted-foreground font-semibold whitespace-nowrap">Total Compensation:</span>
                                  <span className="font-bold">${salaryResearch.total_compensation_avg.toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Company Comparisons */}
                        {salaryResearch.market_comparisons && Array.isArray(salaryResearch.market_comparisons) && salaryResearch.market_comparisons.length > 0 && (
                          <div className="bg-[#FF5800]/10 rounded-lg p-4 border border-[#FF5800]/30">
                            <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Company Salary Comparisons
                            </h5>
                            <div className="space-y-2.5">
                              {salaryResearch.market_comparisons.slice(0, 3).map((comp: any, idx: number) => (
                                <div key={idx} className="flex items-center text-sm p-3 bg-background/50 rounded gap-2">
                                  <div className="flex-1 min-w-0 py-1">
                                    <div className="font-medium truncate text-xs">{comp.company_name || comp.company || 'Unknown Company'}</div>
                                    <div className="text-xs text-muted-foreground truncate mt-1">{comp.location || 'N/A'}</div>
                                  </div>
                                  <Badge variant="outline" className="shrink-0 text-xs">
                                    ${comp.total_comp?.toLocaleString() || comp.base?.toLocaleString() || comp.salary?.toLocaleString() || comp.median_salary?.toLocaleString() || comp.average_salary?.toLocaleString() || 'N/A'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Historical Trends */}
                        {salaryResearch.historical_trends && Array.isArray(salaryResearch.historical_trends) && salaryResearch.historical_trends.length > 0 && (
                          <div className="bg-[#1E90FF]/10 rounded-lg p-4 border border-[#1E90FF]/30">
                            <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Historical Salary Trends
                            </h5>
                            <div className="space-y-2">
                              {salaryResearch.historical_trends.slice(0, 3).map((trend: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-xs py-1">
                                  <span className="text-muted-foreground whitespace-nowrap">{trend.year || trend.period || `Period ${idx + 1}`}:</span>
                                  <span className="font-medium">${trend.median?.toLocaleString() || trend.median_salary?.toLocaleString() || trend.salary?.toLocaleString() || 'N/A'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Negotiation Recommendations */}
                        {salaryResearch.negotiation_recommendations && Array.isArray(salaryResearch.negotiation_recommendations) && salaryResearch.negotiation_recommendations.length > 0 && (
                          <div className="bg-[#7C2ADF]/10 rounded-lg p-4 border border-[#7C2ADF]/30">
                            <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              Negotiation Recommendations
                            </h5>
                            <ul className="space-y-2.5">
                              {salaryResearch.negotiation_recommendations.slice(0, 3).map((rec: any, idx: number) => (
                                <li key={idx} className="flex items-start gap-2 text-xs py-1">
                                  <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-600 flex-shrink-0" />
                                  <span className="leading-relaxed">{typeof rec === 'string' ? rec : rec.recommendation || rec.strategy || rec.tip || JSON.stringify(rec)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Negotiation Outcome Tracking */}
                        <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-lg p-4 border border-green-500/30">
                          <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Record Negotiation Outcome
                          </h5>
                          {!jobOutcomes[job.id] ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <label className="text-xs font-medium">Outcome</label>
                                  <select
                                    className="w-full px-3 py-2 text-xs border rounded-md bg-background"
                                    onChange={(e) => {
                                      const outcome = e.target.value;
                                      if (outcome) {
                                        const actualSalary = prompt('Enter final salary amount (optional):');
                                        recordOutcomeMutation.mutate({ jobId: job.id, outcome, actualSalary: actualSalary || '' });
                                      }
                                    }}
                                  >
                                    <option value="">Select outcome...</option>
                                    <option value="accepted">Accepted Offer</option>
                                    <option value="negotiated_higher">Negotiated Higher</option>
                                    <option value="declined">Declined Offer</option>
                                    <option value="withdrawn">Offer Withdrawn</option>
                                    <option value="pending">Still Negotiating</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-muted-foreground">Outcome</p>
                                  <Badge className="mt-1">{jobOutcomes[job.id].outcome.replace(/_/g, ' ').toUpperCase()}</Badge>
                                </div>
                                {jobOutcomes[job.id].actualSalary && (
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Final Salary</p>
                                    <p className="text-lg font-bold text-green-600">${parseInt(jobOutcomes[job.id].actualSalary).toLocaleString()}</p>
                                  </div>
                                )}
                              </div>
                              <Button
                                onClick={() => setJobOutcomes(prev => { const newState = { ...prev }; delete newState[job.id]; return newState; })}
                                variant="ghost"
                                size="sm"
                                className="w-full mt-2 text-xs"
                              >
                                Update Outcome
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Full Negotiation Strategy Details - Only in Expanded View */}
                        {jobGuidance[job.id] && (
                          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-500/30">
                            <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Complete Strategy Details
                            </h5>
                            <div className="space-y-3">
                              {jobGuidance[job.id].talking_points && jobGuidance[job.id].talking_points.length > 3 && (
                                <div>
                                  <h6 className="font-medium text-xs mb-2 flex items-center gap-2">
                                    <Target className="h-3 w-3" />
                                    All Talking Points
                                  </h6>
                                  <ul className="space-y-1.5">
                                    {jobGuidance[job.id].talking_points.map((point: string, idx: number) => (
                                      <li key={idx} className="flex items-start gap-2 text-xs">
                                        <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-600 flex-shrink-0" />
                                        <span>{point}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {jobGuidance[job.id].scripts && (
                                <>
                                  <Separator />
                                  <div>
                                    <h6 className="font-medium text-xs mb-2 flex items-center gap-2">
                                      <MessageSquare className="h-3 w-3" />
                                      Negotiation Scripts
                                    </h6>
                                    <div className="space-y-2">
                                      {jobGuidance[job.id].scripts.initial_offer && (
                                        <div className="bg-background/50 rounded p-2">
                                          <p className="text-[10px] font-medium text-muted-foreground mb-1">Initial Offer Response</p>
                                          <p className="text-xs">{jobGuidance[job.id].scripts.initial_offer}</p>
                                        </div>
                                      )}
                                      {jobGuidance[job.id].scripts.counteroffer && (
                                        <div className="bg-background/50 rounded p-2">
                                          <p className="text-[10px] font-medium text-muted-foreground mb-1">Counteroffer Script</p>
                                          <p className="text-xs">{jobGuidance[job.id].scripts.counteroffer}</p>
                                        </div>
                                      )}
                                      {jobGuidance[job.id].scripts.benefits_discussion && (
                                        <div className="bg-background/50 rounded p-2">
                                          <p className="text-[10px] font-medium text-muted-foreground mb-1">Benefits Discussion</p>
                                          <p className="text-xs">{jobGuidance[job.id].scripts.benefits_discussion}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}

                              {jobGuidance[job.id].negotiation_exercises && jobGuidance[job.id].negotiation_exercises.length > 0 && (
                                <>
                                  <Separator />
                                  <div>
                                    <h6 className="font-medium text-xs mb-2 flex items-center gap-2">
                                      <Target className="h-3 w-3" />
                                      Practice Exercises
                                    </h6>
                                    <ul className="space-y-1.5">
                                      {jobGuidance[job.id].negotiation_exercises.map((exercise: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2 text-xs">
                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 mt-0.5">{idx + 1}</Badge>
                                          <span>{exercise}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </>
                              )}

                              {jobGuidance[job.id].compensation_framework && (
                                <>
                                  <Separator />
                                  <div>
                                    <h6 className="font-medium text-xs mb-2 flex items-center gap-2">
                                      <DollarSign className="h-3 w-3" />
                                      Compensation Framework
                                    </h6>
                                    <div className="space-y-2 text-xs">
                                      {jobGuidance[job.id].compensation_framework.base_salary && (
                                        <div className="flex gap-2">
                                          <span className="text-muted-foreground min-w-[80px]">Base Salary:</span>
                                          <span>{jobGuidance[job.id].compensation_framework.base_salary}</span>
                                        </div>
                                      )}
                                      {jobGuidance[job.id].compensation_framework.bonus && (
                                        <div className="flex gap-2">
                                          <span className="text-muted-foreground min-w-[80px]">Bonus:</span>
                                          <span>{jobGuidance[job.id].compensation_framework.bonus}</span>
                                        </div>
                                      )}
                                      {jobGuidance[job.id].compensation_framework.equity && (
                                        <div className="flex gap-2">
                                          <span className="text-muted-foreground min-w-[80px]">Equity:</span>
                                          <span>{jobGuidance[job.id].compensation_framework.equity}</span>
                                        </div>
                                      )}
                                      {jobGuidance[job.id].compensation_framework.benefits && (
                                        <div className="flex gap-2">
                                          <span className="text-muted-foreground min-w-[80px]">Benefits:</span>
                                          <span>{jobGuidance[job.id].compensation_framework.benefits}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                              
                              {jobGuidance[job.id].confidence_tips && jobGuidance[job.id].confidence_tips.length > 3 && (
                                <>
                                  <Separator />
                                  <div>
                                    <h6 className="font-medium text-xs mb-2 flex items-center gap-2">
                                      <TrendingUp className="h-3 w-3" />
                                      All Confidence Building Tips
                                    </h6>
                                    <ul className="space-y-1.5">
                                      {jobGuidance[job.id].confidence_tips.map((tip: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2 text-xs">
                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 mt-0.5">{idx + 1}</Badge>
                                          <span>{tip}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* No detailed data message */}
                        {!salaryResearch.base_salary_avg && 
                         !salaryResearch.bonus_avg && 
                         !salaryResearch.equity_avg && 
                         !salaryResearch.benefits_value && 
                         !salaryResearch.total_compensation_avg &&
                         (!salaryResearch.market_comparisons || salaryResearch.market_comparisons.length === 0) && 
                         (!salaryResearch.historical_trends || salaryResearch.historical_trends.length === 0) && 
                         (!salaryResearch.negotiation_recommendations || salaryResearch.negotiation_recommendations.length === 0) && (
                          <div className="bg-muted/30 rounded-lg p-4 text-center text-sm text-muted-foreground">
                            <p className="mb-2">No detailed breakdown available yet.</p>
                            <p className="text-xs">The salary research function may need to populate more detailed market data.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Additional Info Toggle */}
              {job.created_at && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-primary/20">
                  <Calendar className="h-3 w-3 text-accent" />
                  <span>Added {new Date(job.created_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          );
        })}
          </TabsContent>

          {/* Preparation Tab */}
          <TabsContent value="preparation" className="space-y-4">
            {jobs.length > 0 ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border bg-muted/30">
                  <label className="text-sm font-medium mb-2 block">Select a job to prepare for:</label>
                  <select
                    className="w-full px-4 py-2 border rounded-md bg-background"
                    value={selectedJobForPrep || ''}
                    onChange={(e) => setSelectedJobForPrep(e.target.value)}
                  >
                    <option value="">Choose a job...</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.job_title} at {job.company_name}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedJobForPrep && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Preparation Tools
                      </CardTitle>
                      <CardDescription>
                        Comprehensive salary negotiation preparation for your selected position
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <SalaryNegotiationPrep jobId={selectedJobForPrep} noWrapper={true} />
                    </CardContent>
                  </Card>
                )}
                {!selectedJobForPrep && (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a job above to access preparation tools</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No jobs available for preparation</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
