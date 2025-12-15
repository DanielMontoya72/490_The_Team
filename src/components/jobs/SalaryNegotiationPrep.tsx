import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, TrendingUp, MessageSquare, CheckCircle2, Target, Sparkles, Search, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface SalaryNegotiationPrepProps {
  jobId: string;
  noWrapper?: boolean;
}

export function SalaryNegotiationPrep({ jobId, noWrapper = false }: SalaryNegotiationPrepProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentSalary, setCurrentSalary] = useState("");
  const [targetSalary, setTargetSalary] = useState("");
  const [experience, setExperience] = useState("");
  const [achievements, setAchievements] = useState("");
  const [guidance, setGuidance] = useState<any>(null);
  const [outcome, setOutcome] = useState("");
  const [actualSalary, setActualSalary] = useState("");

  // Fetch user profile data
  const { data: userProfileData } = useQuery({
    queryKey: ['user-profile-for-negotiation'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const [profileRes, employmentRes, skillsRes, educationRes, certificationsRes, projectsRes] = await Promise.all([
        supabase.from("user_profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("employment_history").select("*").eq("user_id", user.id).order("start_date", { ascending: false }),
        supabase.from("skills").select("*").eq("user_id", user.id),
        supabase.from("education").select("*").eq("user_id", user.id).order("graduation_date", { ascending: false }),
        supabase.from("certifications").select("*").eq("user_id", user.id),
        supabase.from("projects").select("*").eq("user_id", user.id)
      ]);

      return {
        profile: profileRes.data,
        employment: employmentRes.data || [],
        skills: skillsRes.data || [],
        education: educationRes.data || [],
        certifications: certificationsRes.data || [],
        projects: projectsRes.data || []
      };
    },
  });

  const { data: job, isLoading: loadingJob } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
  });

  const { data: salaryResearch, isLoading: loadingResearch, refetch: refetchResearch } = useQuery({
    queryKey: ['salary-research', jobId],
    queryFn: async () => {
      console.log('Fetching salary research for job:', jobId);
      const { data, error } = await supabase
        .from('salary_research')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      console.log('Salary research query result:', { data, error });
      
      if (error) {
        console.error('Salary research query ERROR:', error);
        if (error.code !== 'PGRST116') {
          console.error('Non-PGRST116 error, throwing:', error);
          throw error;
        }
      }
      
      return data;
    },
    enabled: !!jobId,
  });

  // Research salary if not available
  const researchSalaryMutation = useMutation({
    mutationFn: async () => {
      console.log('Starting salary research for job:', jobId);
      toast({
        title: "Research Started",
        description: "Analyzing market data... This may take a moment.",
      });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Invoking research-salary function with:', {
        jobId,
        jobTitle: job?.job_title,
        location: job?.location,
        companySize: job?.company_size,
      });

      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout - please try again')), 30000)
        );
        
        const requestPromise = supabase.functions.invoke('research-salary', {
          body: {
            jobId,
            jobTitle: job?.job_title,
            location: job?.location,
            companySize: job?.company_size,
          }
        });

        const { data, error } = await Promise.race([requestPromise, timeoutPromise]) as any;

        console.log('Research response:', { data, error });

        if (error) {
          console.error('Research error:', error);
          throw new Error(error.message || 'Failed to research salary');
        }
        
        if (!data) {
          throw new Error('No data returned from research');
        }
        
        return data;
      } catch (err) {
        console.error('Exception during research:', err);
        throw err;
      }
    },
    onSuccess: async (data) => {
      console.log('Research successful, invalidating queries');
      console.log('Research data received:', data);
      
      // Wait a moment for the database to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Invalidate and refetch the query
      await queryClient.invalidateQueries({ queryKey: ['salary-research', jobId] });
      await refetchResearch();
      
      toast({
        title: "Salary Research Complete",
        description: "Market data has been retrieved and analyzed.",
      });
    },
    onError: (error: any) => {
      console.error('Research mutation error:', error);
      toast({
        title: "Research Failed",
        description: error.message || 'An error occurred while researching salary data',
        variant: "destructive",
      });
    },
  });

  const autoFillFromProfile = () => {
    if (!userProfileData) {
      toast({
        title: "No Profile Data",
        description: "Please complete your profile first to use auto-fill.",
        variant: "destructive",
      });
      return;
    }

    const { profile, employment, skills, education, certifications, projects } = userProfileData;

    // Generate experience summary
    const totalYears = employment.reduce((sum: number, e: any) => {
      const start = new Date(e.start_date);
      const end = e.is_current ? new Date() : new Date(e.end_date || new Date());
      return sum + Math.max(0, (end.getFullYear() - start.getFullYear()));
    }, 0);

    const recentRoles = employment.slice(0, 3).map((e: any) => 
      `${e.job_title} at ${e.company_name}`
    ).join(', ');

    const topSkills = skills.slice(0, 5).map((s: any) => s.skill_name).join(', ');
    
    const educationSummary = education.length > 0 
      ? `${education[0].degree_type} in ${education[0].field_of_study} from ${education[0].institution_name}`
      : '';

    const experienceSummary = `${totalYears} years of professional experience. Recent roles include: ${recentRoles}. ${educationSummary ? `Education: ${educationSummary}.` : ''} Core competencies: ${topSkills}.`;
    
    setExperience(experienceSummary);

    // Generate achievements
    const achievementsList = [];
    
    // From employment
    employment.slice(0, 3).forEach((e: any) => {
      if (e.job_description) {
        // Extract achievement-like sentences (with numbers or results)
        const desc = e.job_description;
        const sentences = desc.split(/[.!]\s+/);
        const achievements = sentences.filter((s: string) => 
          /\d+/.test(s) || /increased|reduced|improved|led|managed|grew|achieved/i.test(s)
        );
        achievementsList.push(...achievements.slice(0, 2));
      }
    });

    // From certifications
    if (certifications.length > 0) {
      achievementsList.push(`Earned ${certifications.length} professional certification${certifications.length > 1 ? 's' : ''}: ${certifications.slice(0, 3).map((c: any) => c.certification_name).join(', ')}`);
    }

    // From projects
    if (projects.length > 0) {
      achievementsList.push(`Completed ${projects.length} significant project${projects.length > 1 ? 's' : ''} demonstrating technical expertise and project management`);
    }

    const achievementsText = achievementsList.slice(0, 5).join('. ');
    setAchievements(achievementsText || "Professional achievements from employment history");

    toast({
      title: "Auto-filled from Profile",
      description: "Experience and achievements populated from your profile data.",
    });
  };

  const exportNegotiationData = () => {
    if (!salaryResearch) {
      toast({
        title: "No Data to Export",
        description: "Research salary data first before exporting.",
        variant: "destructive",
      });
      return;
    }

    const exportData = {
      job_title: job?.job_title || 'N/A',
      company: job?.company_name || 'N/A',
      location: job?.location || 'N/A',
      research_date: new Date().toISOString(),
      salary_ranges: {
        median: salaryResearch.median_salary,
        percentile_25: salaryResearch.percentile_25,
        percentile_75: salaryResearch.percentile_75,
      },
      compensation_breakdown: {
        base_salary: salaryResearch.base_salary_avg,
        bonus: salaryResearch.bonus_avg,
        equity: salaryResearch.equity_avg,
        benefits: salaryResearch.benefits_value,
        total_compensation: salaryResearch.total_compensation_avg,
      },
      market_comparisons: salaryResearch.market_comparisons || [],
      market_position: salaryResearch.market_position || 'unknown',
      compensation_gap: salaryResearch.compensation_gap,
      historical_trends: salaryResearch.historical_trends || [],
      negotiation_recommendations: salaryResearch.negotiation_recommendations || [],
      competitive_analysis: salaryResearch.competitive_analysis || '',
    };

    // Create JSON file
    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `negotiation-data-${job?.job_title?.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    jsonLink.click();
    URL.revokeObjectURL(jsonUrl);

    // Create CSV file
    const csvRows = [
      ['Negotiation Data Export', ''],
      ['Job Title', job?.job_title || 'N/A'],
      ['Company', job?.company_name || 'N/A'],
      ['Location', job?.location || 'N/A'],
      ['Research Date', new Date().toLocaleDateString()],
      ['', ''],
      ['Salary Ranges', ''],
      ['Median Salary', `$${salaryResearch.median_salary?.toLocaleString() || 'N/A'}`],
      ['25th Percentile', `$${salaryResearch.percentile_25?.toLocaleString() || 'N/A'}`],
      ['75th Percentile', `$${salaryResearch.percentile_75?.toLocaleString() || 'N/A'}`],
      ['', ''],
      ['Market Position', ''],
      ['Status', salaryResearch.market_position === 'above' ? 'Above Market' : salaryResearch.market_position === 'below' ? 'Below Market' : 'At Market'],
      ['Gap', salaryResearch.compensation_gap ? `${salaryResearch.compensation_gap > 0 ? '+' : '-'}$${Math.abs(salaryResearch.compensation_gap).toLocaleString()}` : 'N/A'],
      ['', ''],
      ['Negotiation Recommendations', ''],
      ...((Array.isArray(salaryResearch.negotiation_recommendations) ? salaryResearch.negotiation_recommendations : []) as any[]).map((rec: any, idx: number) => 
        [`${idx + 1}`, typeof rec === 'string' ? rec : rec.recommendation || rec.strategy || JSON.stringify(rec)]
      ),
    ];

    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = `negotiation-data-${job?.job_title?.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    csvLink.click();
    URL.revokeObjectURL(csvUrl);

    toast({
      title: "Data Exported",
      description: "Negotiation data exported as JSON and CSV files.",
    });
  };

  const generateGuidanceMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-negotiation-guidance', {
        body: {
          jobTitle: job?.job_title,
          companyName: job?.company_name,
          location: job?.location,
          marketSalaryData: salaryResearch || {},
          currentSalary: currentSalary || null,
          targetSalary: targetSalary || null,
          userExperience: experience,
          userAchievements: achievements
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setGuidance(data);
      toast({
        title: "Negotiation Guidance Generated",
        description: "Your personalized salary negotiation strategy is ready.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveOutcomeMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update salary_research table with negotiation outcome
      const { error } = await supabase
        .from('salary_research')
        .upsert({
          job_id: jobId,
          user_id: user.id,
          job_title: job?.job_title || '',
          negotiation_recommendations: {
            outcome: outcome,
            actual_salary: actualSalary ? parseInt(actualSalary) : null,
            negotiated_at: new Date().toISOString()
          }
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-research', jobId] });
      toast({
        title: "Outcome Saved",
        description: "Your negotiation outcome has been recorded.",
      });
      setOutcome("");
      setActualSalary("");
    },
  });

  if (loadingResearch || loadingJob) {
    if (noWrapper) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!job) {
    if (noWrapper) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>Job not found</p>
        </div>
      );
    }
    return (
      <Card>
        <CardContent className="text-center py-8 text-muted-foreground">
          <p>Job not found</p>
        </CardContent>
      </Card>
    );
  }

  console.log('Rendering with salaryResearch:', salaryResearch);
  console.log('Is salaryResearch truthy?', !!salaryResearch);

  const tabsContent = (
    <Tabs defaultValue="market-insights" className="w-full" key={`prep-${jobId}`}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="market-insights">Market Insights</TabsTrigger>
              <TabsTrigger value="guidance">Strategy</TabsTrigger>
              <TabsTrigger value="scripts">Scripts</TabsTrigger>
              <TabsTrigger value="practice">Practice</TabsTrigger>
              <TabsTrigger value="framework">Framework</TabsTrigger>
            </TabsList>

            {/* Market Insights Tab - Always visible */}
            <TabsContent value="market-insights" className="space-y-4">
              {(() => {
                console.log('Market Insights - salaryResearch:', salaryResearch);
                console.log('Market Insights - condition check:', !salaryResearch);
                return !salaryResearch ? (
                <div className="rounded-lg border-2 border-dashed p-8 text-center space-y-4">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Start with Market Research</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Research salary data to get comprehensive market insights, company comparisons, and negotiation recommendations
                    </p>
                    <Button
                      onClick={() => {
                        console.log('Research button clicked');
                        researchSalaryMutation.mutate();
                      }}
                      disabled={researchSalaryMutation.isPending}
                      size="lg"
                    >
                      {researchSalaryMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <Search className="h-4 w-4 mr-2" />
                      Research Market Salary
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Market Summary */}
                  <div className="rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-background border p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Market Research Summary
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          onClick={exportNegotiationData}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Export
                        </Button>
                        <Button
                          onClick={() => researchSalaryMutation.mutate()}
                          disabled={researchSalaryMutation.isPending}
                          variant="ghost"
                          size="sm"
                        >
                          {researchSalaryMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Refresh"
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      {salaryResearch.median_salary && (
                        <div className="p-4 rounded-lg bg-background/50 space-y-1">
                          <div className="text-xs text-muted-foreground">Median Salary</div>
                          <div className="text-2xl font-bold text-primary">${salaryResearch.median_salary.toLocaleString()}</div>
                        </div>
                      )}
                      {salaryResearch.percentile_25 && (
                        <div className="p-4 rounded-lg bg-background/50 space-y-1">
                          <div className="text-xs text-muted-foreground">25th Percentile</div>
                          <div className="text-xl font-bold">${salaryResearch.percentile_25.toLocaleString()}</div>
                        </div>
                      )}
                      {salaryResearch.percentile_75 && (
                        <div className="p-4 rounded-lg bg-background/50 space-y-1">
                          <div className="text-xs text-muted-foreground">75th Percentile</div>
                          <div className="text-xl font-bold">${salaryResearch.percentile_75.toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Compensation Breakdown */}
                  <div className="p-4 rounded-lg border space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Compensation Breakdown
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Base Salary</div>
                        <div className="font-semibold">${(salaryResearch.base_salary_avg || 0).toLocaleString()}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Bonus</div>
                        <div className="font-semibold">${(salaryResearch.bonus_avg || 0).toLocaleString()}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Equity</div>
                        <div className="font-semibold">${(salaryResearch.equity_avg || 0).toLocaleString()}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Benefits</div>
                        <div className="font-semibold">${(salaryResearch.benefits_value || 0).toLocaleString()}</div>
                      </div>
                      <div className="space-y-1 md:col-span-2 pt-2 border-t">
                        <div className="text-xs text-muted-foreground">Total Compensation</div>
                        <div className="font-bold text-lg">${(salaryResearch.total_compensation_avg || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  {/* Market Comparisons */}
                  {salaryResearch.market_comparisons && Array.isArray(salaryResearch.market_comparisons) && (salaryResearch.market_comparisons as any[]).length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold">Company Comparisons</h3>
                      <div className="space-y-2">
                        {(salaryResearch.market_comparisons as any[]).slice(0, 5).map((comp: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-lg border bg-muted/30">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium">{comp.company_name || comp.company}</p>
                                <p className="text-xs text-muted-foreground">{comp.location || 'Location not specified'}</p>
                              </div>
                              <Badge variant="outline">
                                ${comp.total_comp?.toLocaleString() || comp.base?.toLocaleString() || comp.salary?.toLocaleString() || comp.median_salary?.toLocaleString() || 'N/A'}
                              </Badge>
                            </div>
                            {comp.benefits && (
                              <p className="text-sm text-muted-foreground">{comp.benefits}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Market Position */}
                  {salaryResearch.market_position && (
                    <div className="p-4 rounded-lg border bg-primary/5 space-y-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Your Market Position
                      </h3>
                      <Badge variant={salaryResearch.market_position === 'above' ? "default" : "secondary"} className="text-sm">
                        {salaryResearch.market_position === 'above' ? "Above Market" : 
                         salaryResearch.market_position === 'below' ? "Below Market" : "At Market"}
                      </Badge>
                      {salaryResearch.compensation_gap && (
                        <p className="text-sm">
                          <span className="font-medium">Gap: </span>
                          {salaryResearch.compensation_gap > 0 ? '+' : '-'}
                          ${Math.abs(salaryResearch.compensation_gap).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Negotiation Recommendations */}
                  {salaryResearch.negotiation_recommendations && Array.isArray(salaryResearch.negotiation_recommendations) && (salaryResearch.negotiation_recommendations as any[]).length > 0 && (
                    <div className="p-4 rounded-lg border bg-green-500/5 space-y-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Market-Based Recommendations
                      </h3>
                      <ul className="space-y-2">
                        {(salaryResearch.negotiation_recommendations as any[]).map((rec: any, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                            <span className="text-sm">
                              {typeof rec === 'string' ? rec : rec.recommendation || rec.strategy || JSON.stringify(rec)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Historical Trends */}
                  {salaryResearch.historical_trends && Array.isArray(salaryResearch.historical_trends) && (salaryResearch.historical_trends as any[]).length > 0 && (
                    <div className="p-4 rounded-lg border space-y-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Market Trends
                      </h3>
                      <div className="space-y-2">
                        {(salaryResearch.historical_trends as any[]).map((trend: any, idx: number) => (
                          <div key={idx} className="text-sm p-2 bg-muted/30 rounded">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{trend.year || trend.period || `Period ${idx + 1}`}</span>
                              <span>${trend.median?.toLocaleString() || trend.median_salary?.toLocaleString() || 'N/A'}</span>
                            </div>
                            {trend.change_percent && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {trend.change_percent > 0 ? '↑' : '↓'} {Math.abs(trend.change_percent)}% {trend.trend || ''}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
              })()}
            </TabsContent>

            {/* Strategy/Guidance Tab */}
            <TabsContent value="guidance" className="space-y-4">
              {/* Generate Button Header */}
              <div className="rounded-lg border bg-gradient-to-br from-primary/10 via-primary/5 to-background p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Personalized Negotiation Strategy
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Generate talking points and confidence tips tailored to {job?.job_title} at {job?.company_name}
                    </p>
                  </div>
                  <Button
                    onClick={() => generateGuidanceMutation.mutate()}
                    disabled={generateGuidanceMutation.isPending}
                    variant={guidance ? "outline" : "default"}
                    size="sm"
                  >
                    {generateGuidanceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Sparkles className="h-4 w-4 mr-2" />
                    {guidance ? "Regenerate" : "Generate Strategy"}
                  </Button>
                </div>
              </div>

              {!guidance ? (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={autoFillFromProfile}
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Auto-fill from Profile
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="current-salary">Current Salary (Optional)</Label>
                      <Input
                        id="current-salary"
                        type="number"
                        placeholder="60000"
                        value={currentSalary}
                        onChange={(e) => setCurrentSalary(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target-salary">Target Salary (Optional)</Label>
                      <Input
                        id="target-salary"
                        type="number"
                        placeholder="75000"
                        value={targetSalary}
                        onChange={(e) => setTargetSalary(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience">Your Experience Summary</Label>
                    <Textarea
                      id="experience"
                      placeholder="5 years in software development, 3 years leading teams..."
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="achievements">Key Achievements</Label>
                    <Textarea
                      id="achievements"
                      placeholder="Led team that increased revenue by 40%, reduced costs by $200K..."
                      value={achievements}
                      onChange={(e) => setAchievements(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <p className="text-sm text-muted-foreground text-center">
                    Fill in the optional fields above for more personalized results, then click "Generate Strategy"
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Key Talking Points
                    </h3>
                    <ul className="space-y-2">
                      {(guidance.talking_points || []).map((point: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                          <span className="text-sm">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Confidence Building Tips
                    </h3>
                    <ul className="space-y-2">
                      {(guidance.confidence_tips || []).map((tip: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-0.5">{idx + 1}</Badge>
                          <span className="text-sm">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Scripts Tab */}
            <TabsContent value="scripts" className="space-y-4">
              {/* Generate Button Header */}
              <div className="rounded-lg border bg-gradient-to-br from-primary/10 via-primary/5 to-background p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Negotiation Scripts
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ready-to-use scripts for {job?.job_title} negotiation scenarios
                    </p>
                  </div>
                  <Button
                    onClick={() => generateGuidanceMutation.mutate()}
                    disabled={generateGuidanceMutation.isPending}
                    variant={guidance?.scripts ? "outline" : "default"}
                    size="sm"
                  >
                    {generateGuidanceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Sparkles className="h-4 w-4 mr-2" />
                    {guidance?.scripts ? "Regenerate" : "Generate Scripts"}
                  </Button>
                </div>
              </div>

              {!guidance || !guidance.scripts ? (
                <div className="rounded-lg border-2 border-dashed p-8 text-center space-y-4">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click "Generate Scripts" to get personalized negotiation scripts for initial offers, counteroffers, benefits discussions, and final negotiations.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {guidance.scripts.initial_offer && (
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Initial Offer Response
                      </h3>
                      <p className="text-sm leading-relaxed">{guidance.scripts.initial_offer}</p>
                    </div>
                  )}
                  {guidance.scripts.counteroffer && (
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Counteroffer Script
                      </h3>
                      <p className="text-sm leading-relaxed">{guidance.scripts.counteroffer}</p>
                    </div>
                  )}
                  {guidance.scripts.benefits_discussion && (
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Benefits Discussion
                      </h3>
                      <p className="text-sm leading-relaxed">{guidance.scripts.benefits_discussion}</p>
                    </div>
                  )}
                  {guidance.scripts.final_negotiation && (
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Final Negotiation
                      </h3>
                      <p className="text-sm leading-relaxed">{guidance.scripts.final_negotiation}</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Practice Tab */}
            <TabsContent value="practice" className="space-y-4">
              {/* Generate Button Header */}
              <div className="rounded-lg border bg-gradient-to-br from-primary/10 via-primary/5 to-background p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Practice Exercises
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Exercises to build negotiation confidence for {job?.job_title}
                    </p>
                  </div>
                  <Button
                    onClick={() => generateGuidanceMutation.mutate()}
                    disabled={generateGuidanceMutation.isPending}
                    variant={guidance?.negotiation_exercises ? "outline" : "default"}
                    size="sm"
                  >
                    {generateGuidanceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Sparkles className="h-4 w-4 mr-2" />
                    {guidance?.negotiation_exercises ? "Regenerate" : "Generate Exercises"}
                  </Button>
                </div>
              </div>

              {!guidance || !guidance.negotiation_exercises ? (
                <div className="rounded-lg border-2 border-dashed p-8 text-center space-y-4">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click "Generate Exercises" to get personalized practice scenarios that will help you build confidence and improve your negotiation skills.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(guidance.negotiation_exercises || []).map((exercise: string, idx: number) => (
                    <div key={idx} className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5">{idx + 1}</Badge>
                        <div className="flex-1">
                          <p className="text-sm leading-relaxed">{exercise}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Framework Tab */}
            <TabsContent value="framework" className="space-y-4">
              {/* Generate Button Header */}
              <div className="rounded-lg border bg-gradient-to-br from-primary/10 via-primary/5 to-background p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Total Compensation Framework
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Framework for evaluating the complete compensation package at {job?.company_name}
                    </p>
                  </div>
                  <Button
                    onClick={() => generateGuidanceMutation.mutate()}
                    disabled={generateGuidanceMutation.isPending}
                    variant={guidance?.compensation_framework ? "outline" : "default"}
                    size="sm"
                  >
                    {generateGuidanceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Sparkles className="h-4 w-4 mr-2" />
                    {guidance?.compensation_framework ? "Regenerate" : "Generate Framework"}
                  </Button>
                </div>
              </div>

              {!guidance || !guidance.compensation_framework ? (
                <div className="rounded-lg border-2 border-dashed p-8 text-center space-y-4">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click "Generate Framework" to get a comprehensive analysis framework for base salary, bonus, equity, benefits, perks, and work-life balance.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(guidance.compensation_framework || {}).map(([key, value]) => {
                    if (!value) return null;
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    
                    // Handle both string and object values
                    const renderValue = (val: any): React.ReactNode => {
                      if (typeof val === 'string') return val;
                      if (typeof val === 'number') return val.toString();
                      if (typeof val === 'object' && val !== null) {
                        return (
                          <div className="space-y-2">
                            {Object.entries(val).map(([subKey, subVal]) => (
                              <div key={subKey}>
                                <span className="font-medium text-xs uppercase text-muted-foreground">
                                  {subKey.replace(/_/g, ' ')}:
                                </span>
                                <p className="text-sm">{typeof subVal === 'string' ? subVal : JSON.stringify(subVal)}</p>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    };

                    return (
                      <div key={key} className="p-4 rounded-lg border bg-muted/30">
                        <h4 className="font-semibold mb-2 text-sm">{label}</h4>
                        <div className="text-sm leading-relaxed">{renderValue(value)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
  );

  if (noWrapper) {
    return tabsContent;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Salary Negotiation Preparation
          </CardTitle>
          <CardDescription>
            Get personalized guidance, scripts, and strategies for confident salary negotiations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {tabsContent}
        </CardContent>
      </Card>
    </div>
  );
}
