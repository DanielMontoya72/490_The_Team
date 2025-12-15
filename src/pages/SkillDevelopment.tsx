import { AppNav } from "@/components/layout/AppNav";
import { SkillDevelopmentProgress } from "@/components/jobs/SkillDevelopmentProgress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, TrendingUp, Target, Briefcase, AlertCircle, Plus, RefreshCw, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SkillGapAnalysisDialog } from "@/components/resume/SkillGapAnalysisDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SkillDemandChart } from "@/components/market/SkillDemandChart";
import { MarketTrendsOverview } from "@/components/market/MarketTrendsOverview";
import { CareerInsights } from "@/components/market/CareerInsights";
import { CompanyGrowthTracker } from "@/components/market/CompanyGrowthTracker";
import { toast } from "sonner";

export default function SkillDevelopment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedAnalyses, setExpandedAnalyses] = useState<Set<string>>(new Set());
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [showSkillGapDialog, setShowSkillGapDialog] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>("");
  const [showJobSelector, setShowJobSelector] = useState(false);
  const [generating, setGenerating] = useState(false);

  // User query
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });
  
  // Fetch all jobs for selection
  const { data: allJobs } = useQuery({
    queryKey: ['all-jobs-for-analysis'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_title, company_name, industry')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
  
  // Fetch all skill gap analyses to show trends
  const { data: analyses } = useQuery({
    queryKey: ['all-skill-gap-analyses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skill_gap_analyses')
        .select(`
          *,
          jobs!inner(
            job_title,
            company_name,
            is_archived
          )
        `)
        .eq('jobs.is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Calculate skill gap trends
  const skillGapTrends = analyses?.reduce((acc: any, analysis: any) => {
    const missingSkills = analysis.missing_skills as any[] || [];
    missingSkills.forEach((skill: any) => {
      const skillName = skill.skill || skill.skill_name || skill.name || 'Unknown';
      if (!acc[skillName]) {
        acc[skillName] = { count: 0, jobs: [] };
      }
      acc[skillName].count++;
      acc[skillName].jobs.push({
        title: analysis.jobs.job_title,
        company: analysis.jobs.company_name
      });
    });
    return acc;
  }, {});

  const topMissingSkills = skillGapTrends 
    ? Object.entries(skillGapTrends)
        .sort((a: any, b: any) => b[1].count - a[1].count)
        .slice(0, 10)
    : [];

  // Market Intelligence data queries - FILTERED BY USER
  // NOTE: Query keys do NOT include user.id so invalidation in child components works correctly
  const { data: skillTrends } = useQuery({
    queryKey: ['skill-demand-trends'],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('skill_demand_trends')
        .select('*')
        .eq('user_id', user.id)
        .order('analysis_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: marketTrends } = useQuery({
    queryKey: ['market-trends'],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('market_trends')
        .select('*')
        .eq('user_id', user.id)
        .order('analysis_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: marketInsights } = useQuery({
    queryKey: ['market-insights'],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('market_insights')
        .select('*')
        .eq('user_id', user.id)
        .eq('acknowledged', false)
        .order('priority_level', { ascending: false })
        .order('generated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: companyGrowth } = useQuery({
    queryKey: ['company-growth'],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('company_growth_tracking')
        .select('*')
        .eq('user_id', user.id)
        .order('analysis_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Generate market intelligence based on user's jobs
  const generateIntelligenceFromJobs = async () => {
    if (!user?.id || !allJobs || allJobs.length === 0) {
      toast.error("Add some jobs first to generate personalized market intelligence");
      return;
    }

    setGenerating(true);
    try {
      // Detect industry from user's jobs
      const industries = allJobs.map(j => (j as any).industry).filter(Boolean);
      const industry = industries[0] || "Technology";

      const { error } = await supabase.functions.invoke('generate-market-intelligence', {
        body: { industry, location: "" }
      });
      
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['skill-demand-trends'] });
      await queryClient.invalidateQueries({ queryKey: ['market-trends'] });
      await queryClient.invalidateQueries({ queryKey: ['market-insights'] });
      await queryClient.invalidateQueries({ queryKey: ['company-growth'] });
      
      toast.success("Market intelligence generated based on your jobs!");
    } catch (error) {
      console.error('Error generating intelligence:', error);
      toast.error("Failed to generate market intelligence");
    } finally {
      setGenerating(false);
    }
  };

  const hasMarketData = (skillTrends && skillTrends.length > 0) || 
                        (marketTrends && marketTrends.length > 0) || 
                        (marketInsights && marketInsights.length > 0) || 
                        (companyGrowth && companyGrowth.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Skill Development</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Track your learning progress and identify skill trends across opportunities
          </p>
        </div>

        <Tabs defaultValue="progress" className="space-y-6">
          <TabsList className="w-full h-14 grid grid-cols-5 gap-2 bg-transparent p-0 border-b-2 border-primary/20">
            <TabsTrigger value="progress" className="h-full text-base font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none">My Progress</TabsTrigger>
            <TabsTrigger value="analysis" className="h-full text-base font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none">Skill Gap Analysis</TabsTrigger>
            <TabsTrigger value="trends" className="h-full text-base font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none">Skill Trends</TabsTrigger>
            <TabsTrigger value="insights" className="h-full text-base font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none">Insights</TabsTrigger>
            <TabsTrigger value="market" className="h-full text-base font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none">Market Intel</TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="space-y-6">
            <SkillDevelopmentProgress />
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Skill Gap Analysis by Job
                    </CardTitle>
                    <CardDescription>
                      View detailed skill gap analysis for each job opportunity
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setShowJobSelector(true)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Analyze Job Skills
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {analyses && analyses.length > 0 ? (
                  <div className="space-y-4">
                    {analyses.map((analysis: any) => (
                      <div 
                        key={analysis.id} 
                        className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <Briefcase className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                              <h3 className="font-semibold">{analysis.jobs.job_title}</h3>
                              <p className="text-sm text-muted-foreground">{analysis.jobs.company_name}</p>
                            </div>
                          </div>
                          <Button 
                            className="bg-yellow-500 text-white hover:bg-yellow-600"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAnalysis(analysis);
                              setDetailsDialogOpen(true);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
                            <p className="text-2xl font-bold text-green-600">
                              {(analysis.matching_skills as any[])?.length || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">Matching Skills</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                            <p className="text-2xl font-bold text-orange-600">
                              {(analysis.missing_skills as any[])?.length || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">Missing Skills</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                            <p className="text-2xl font-bold text-blue-600">
                              {analysis.match_score || 0}%
                            </p>
                            <p className="text-xs text-muted-foreground">Match Score</p>
                          </div>
                        </div>

                        {(analysis.missing_skills as any[])?.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Skills to Develop:</p>
                            <div className="flex flex-wrap gap-2">
                              {(analysis.missing_skills as any[])
                                .slice(0, expandedAnalyses.has(analysis.id) ? undefined : 5)
                                .map((skill: any, idx: number) => (
                                  <Badge key={idx} className="bg-[#D24BB9] text-white hover:bg-[#D24BB9]/80">
                                    {skill.skill || skill.skill_name || skill.name || 'Unknown'}
                                  </Badge>
                                ))}
                              {(analysis.missing_skills as any[]).length > 5 && !expandedAnalyses.has(analysis.id) && (
                                <Badge 
                                  variant="secondary" 
                                  className="cursor-pointer hover:bg-secondary/80"
                                  onClick={() => setExpandedAnalyses(prev => new Set(prev).add(analysis.id))}
                                >
                                  +{(analysis.missing_skills as any[]).length - 5} more
                                </Badge>
                              )}
                              {expandedAnalyses.has(analysis.id) && (analysis.missing_skills as any[]).length > 5 && (
                                <Badge 
                                  variant="secondary" 
                                  className="cursor-pointer hover:bg-secondary/80"
                                  onClick={() => {
                                    const newSet = new Set(expandedAnalyses);
                                    newSet.delete(analysis.id);
                                    setExpandedAnalyses(newSet);
                                  }}
                                >
                                  Show less
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No skill gap analyses available yet. Run an analysis from the Resumes page!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Most Common Skill Gaps
                </CardTitle>
                <CardDescription>
                  Skills frequently missing across the jobs you're interested in
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topMissingSkills.length > 0 ? (
                  <div className="space-y-4">
                    {topMissingSkills.map(([skillName, data]: any, index: number) => {
                      // Cycle through colors: yellow, purple, pink
                      const colors = [
                        { bg: 'bg-yellow-500', text: 'text-yellow-500' },
                        { bg: 'bg-purple-500', text: 'text-purple-500' },
                        { bg: 'bg-[#D24BB9]', text: 'text-[#D24BB9]' } // Steel pink
                      ];
                      const color = colors[index % 3];
                      
                      return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${color.bg} text-white font-semibold text-sm`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-semibold">{skillName}</p>
                              <p className="text-sm text-muted-foreground">
                                Required by {data.count} job{data.count !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {Math.round((data.count / (analyses?.length || 1)) * 100)}% of jobs
                          </Badge>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${color.bg} transition-all duration-300`}
                            style={{ width: `${(data.count / (analyses?.length || 1)) * 100}%` }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 ml-11">
                          {data.jobs.slice(0, 3).map((job: any, jobIndex: number) => (
                            <Badge key={jobIndex} variant="secondary" className="text-xs">
                              {job.title} @ {job.company}
                            </Badge>
                          ))}
                          {data.jobs.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{data.jobs.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No skill gap data available yet. Analyze some jobs to see trends!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Learning Recommendations
                </CardTitle>
                <CardDescription>
                  Prioritize these skills to maximize your job opportunities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg border bg-muted/50">
                  <h3 className="font-semibold mb-2">High Priority Skills</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    These skills appear most frequently in jobs you're interested in
                  </p>
                  <div className="space-y-3">
                    {topMissingSkills.slice(0, 3).map(([skillName, data]: any, index: number) => (
                      <div key={index} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{skillName}</p>
                          <Badge variant="destructive">Critical</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Learning this skill would qualify you for {data.count} more position{data.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2">Quick Wins</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Skills that can be learned relatively quickly but have high impact
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Focus on skills with abundant learning resources
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Look for skills appearing in multiple job descriptions
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2">Long-term Investments</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Advanced skills that take time but open significant opportunities
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        Advanced technical skills frequently required
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        Leadership and management capabilities
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="market" className="space-y-6">
            {!hasMarketData ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Market Intelligence Yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Generate personalized market intelligence based on your job applications and skills
                  </p>
                  <Button 
                    onClick={generateIntelligenceFromJobs}
                    disabled={generating || !allJobs || allJobs.length === 0}
                    size="lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Analyzing Your Jobs...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2" />
                        Generate Market Intelligence
                      </>
                    )}
                  </Button>
                  {(!allJobs || allJobs.length === 0) && (
                    <p className="text-sm text-muted-foreground mt-4">
                      Add some job applications first to get personalized insights
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex justify-end mb-4">
                  <Button 
                    onClick={generateIntelligenceFromJobs}
                    disabled={generating}
                    variant="outline"
                    size="sm"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </>
                    )}
                  </Button>
                </div>
                <Tabs defaultValue="skills" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="skills">Skill Demand</TabsTrigger>
                    <TabsTrigger value="trends">Market Trends</TabsTrigger>
                    <TabsTrigger value="insights">Career Insights</TabsTrigger>
                    <TabsTrigger value="companies">Companies</TabsTrigger>
                  </TabsList>

                  <TabsContent value="skills" className="space-y-4 mt-4">
                    <SkillDemandChart skillTrends={skillTrends || []} />
                  </TabsContent>

                  <TabsContent value="trends" className="space-y-4 mt-4">
                    <MarketTrendsOverview trends={marketTrends || []} />
                  </TabsContent>

                  <TabsContent value="insights" className="space-y-4 mt-4">
                    <CareerInsights insights={marketInsights || []} />
                  </TabsContent>

                  <TabsContent value="companies" className="space-y-4 mt-4">
                    <CompanyGrowthTracker companies={companyGrowth || []} />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Skill Gap Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 tracking-normal">
              <Target className="h-5 w-5" />
              Skill Gap Details - {selectedAnalysis?.jobs.job_title}
            </DialogTitle>
            <DialogDescription className="tracking-normal">
              {selectedAnalysis?.jobs.company_name}
            </DialogDescription>
          </DialogHeader>

          {selectedAnalysis && (
            <div className="space-y-6">
              {/* Missing Skills Section */}
              {(selectedAnalysis.missing_skills as any[])?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2 tracking-normal">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    Skills to Develop ({(selectedAnalysis.missing_skills as any[]).length})
                  </h3>
                  <div className="space-y-3">
                    {(selectedAnalysis.missing_skills as any[]).map((skill: any, idx: number) => (
                      <Card key={idx} className="border-l-4 border-l-orange-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <CardTitle className="text-base tracking-normal">
                              {skill.skill || skill.skill_name || skill.name || 'Unknown'}
                            </CardTitle>
                            <Badge 
                              variant={
                                skill.importance?.toLowerCase() === 'high' ? 'destructive' :
                                skill.importance?.toLowerCase() === 'medium' ? 'default' : 'secondary'
                              }
                              className="tracking-normal"
                            >
                              {skill.importance || 'Medium'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground tracking-normal leading-relaxed">
                            {skill.reason || skill.context || 'This skill is required for the position.'}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Learning Path Section */}
              {(selectedAnalysis.learning_path as any[])?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2 tracking-normal">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    Recommended Learning Path
                  </h3>
                  <div className="space-y-3">
                    {(selectedAnalysis.learning_path as any[]).map((item: any, idx: number) => (
                      <Card key={idx}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm tracking-normal">
                                {item.order || idx + 1}
                              </div>
                              <CardTitle className="text-base tracking-normal">
                                {item.skill || item.skill_name || `Step ${idx + 1}`}
                              </CardTitle>
                            </div>
                            {item.estimated_weeks && (
                              <Badge variant="outline" className="tracking-normal whitespace-nowrap">
                                {item.estimated_weeks} week{item.estimated_weeks !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {item.resources && item.resources.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium tracking-normal">Learning Resources:</p>
                              <div className="space-y-2">
                                {item.resources.map((resource: any, rIdx: number) => (
                                  <div key={rIdx} className="flex items-start justify-between p-2 bg-muted rounded-md">
                                    <div className="flex items-start gap-2 flex-1">
                                      <BookOpen className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium tracking-normal">{resource.title || resource.name || 'Resource'}</p>
                                        {resource.description && (
                                          <p className="text-xs text-muted-foreground mt-1 tracking-normal leading-relaxed">{resource.description}</p>
                                        )}
                                        {resource.type && (
                                          <Badge variant="outline" className="text-xs mt-1 tracking-normal">
                                            {resource.type}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    {resource.url && (
                                      <Button size="sm" variant="ghost" asChild className="flex-shrink-0">
                                        <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                          Open
                                        </a>
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {item.milestones && item.milestones.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium tracking-normal">Key Milestones:</p>
                              <ul className="space-y-1">
                                {item.milestones.map((milestone: string, mIdx: number) => (
                                  <li key={mIdx} className="text-sm text-muted-foreground flex items-start gap-2 tracking-normal leading-relaxed">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                    {milestone}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Job Selector Dialog */}
      <Dialog open={showJobSelector} onOpenChange={setShowJobSelector}>
        <DialogContent className="max-w-[800px] w-[90vw]">
          <DialogHeader>
            <DialogTitle>Select Job to Analyze</DialogTitle>
            <DialogDescription>
              Choose a job to run skill gap analysis
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Job</Label>
              <Select 
                value={selectedJobId} 
                onValueChange={(value) => {
                  setSelectedJobId(value);
                  const job = allJobs?.find(j => j.id === value);
                  if (job) setSelectedJobTitle(job.job_title);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a job..." />
                </SelectTrigger>
                <SelectContent className="max-w-[90vw]">
                  {allJobs?.map((job: any) => (
                    <SelectItem key={job.id} value={job.id} className="max-w-full">
                      {job.job_title} - {job.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowJobSelector(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (selectedJobId) {
                    setShowJobSelector(false);
                    setShowSkillGapDialog(true);
                  }
                }}
                disabled={!selectedJobId}
              >
                Analyze Skills
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Skill Gap Analysis Dialog */}
      <SkillGapAnalysisDialog
        open={showSkillGapDialog}
        onOpenChange={setShowSkillGapDialog}
        jobId={selectedJobId}
        jobTitle={selectedJobTitle}
      />
    </div>
  );
}
