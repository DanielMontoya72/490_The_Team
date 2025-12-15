import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Target, CheckCircle, AlertTriangle, BookOpen, TrendingUp, 
  Play, ExternalLink, Clock, Award, Loader2, X 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SkillGapAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
}

export function SkillGapAnalysisDialog({ 
  open, 
  onOpenChange, 
  jobId,
  jobTitle 
}: SkillGapAnalysisDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("gaps");

  // Fetch latest analysis
  const { data: analysis, isLoading } = useQuery({
    queryKey: ['skill-gap-analysis', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skill_gap_analyses')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Auto-generate analysis if it doesn't exist
  const generateAnalysis = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('analyze-skill-gaps', {
        body: { jobId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-gap-analysis', jobId] });
      toast.success("Skill gap analysis generated!");
    },
    onError: (error) => {
      console.error('Skill gap analysis error:', error);
      toast.error("Failed to generate analysis");
    },
  });

  // Auto-generate analysis when dialog opens if none exists
  useEffect(() => {
    if (open && !analysis && !isLoading && !generateAnalysis.isPending) {
      generateAnalysis.mutate();
    }
  }, [open, analysis, isLoading]);

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'secondary'; // Will use custom pink styling
      default: return 'secondary';
    }
  };

  const getPriorityClassName = (priority: string) => {
    // Use theme accent pink for low priority (Steel pink #D24BB9)
    if (priority?.toLowerCase() === 'low') {
      return 'bg-[hsl(317,60%,56%)] text-white hover:bg-[hsl(317,60%,56%)]/80 dark:bg-[hsl(317,60%,56%)] dark:text-white dark:hover:bg-[hsl(317,60%,56%)]/80';
    }
    return '';
  };

  const getPriorityLabel = (priority: string) => {
    if (!priority) return 'Medium';
    // Capitalize first letter
    return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
  };

  const getSkillPriority = (skill: any): string => {
    // Check various priority/importance fields
    return skill.priority || skill.importance || 'Medium';
  };

  const startLearning = async (skillName: string, resources: any[]) => {
    try {
      if (!skillName) {
        toast.error("Skill name is required");
        return;
      }

      console.log('startLearning called with:', { skillName, resources });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      // Check if already tracking this skill
      const { data: existing } = await supabase
        .from('skill_development_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('skill_name', skillName)
        .eq('job_id', jobId)
        .maybeSingle();

      if (existing) {
        toast.info(`Already tracking "${skillName}"`);
        return;
      }

      const dataToInsert = {
        user_id: user.id,
        skill_name: skillName,
        job_id: jobId,
        learning_resources: resources,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        progress_percentage: 0,
      };

      console.log('Inserting skill with data:', dataToInsert);

      const { error } = await supabase
        .from('skill_development_progress')
        .insert(dataToInsert);

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      toast.success(`Started learning "${skillName}"! Track your progress in Skill Development.`);
      queryClient.invalidateQueries({ queryKey: ['skill-progress'] });
      queryClient.invalidateQueries({ queryKey: ['skill-development-progress'] });
    } catch (error) {
      console.error('Error starting learning:', error);
      toast.error("Failed to track learning progress");
    }
  };

  const addAllMissingSkills = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      // Get existing tracked skills to avoid duplicates
      const { data: existing } = await supabase
        .from('skill_development_progress')
        .select('skill_name')
        .eq('user_id', user.id)
        .eq('job_id', jobId);

      const existingSkills = new Set((existing || []).map(s => s.skill_name));
      
      // Filter out skills already being tracked
      const skillsToAdd = missingSkills.filter(
        (skill: any) => !existingSkills.has(getSkillName(skill))
      );

      if (skillsToAdd.length === 0) {
        toast.info("All missing skills are already being tracked");
        return;
      }

      const skillsData = skillsToAdd.map((skill: any) => {
        const skillName = getSkillName(skill);
        const resources = getResourcesForSkill(skillName);
        return {
          user_id: user.id,
          skill_name: skillName,
          job_id: jobId,
          learning_resources: resources,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          progress_percentage: 0,
        };
      });

      console.log('addAllMissingSkills - Inserting skills:', skillsData);

      const { error } = await supabase
        .from('skill_development_progress')
        .insert(skillsData);

      if (error) throw error;

      toast.success(`Added ${skillsToAdd.length} skill(s) to your development plan!`);
      queryClient.invalidateQueries({ queryKey: ['skill-progress'] });
      queryClient.invalidateQueries({ queryKey: ['skill-development-progress'] });
    } catch (error) {
      console.error('Error adding skills:', error);
      toast.error("Failed to add skills to progress");
    }
  };

  // Helper function to normalize skill data (handles both "skill" and "skill_name" fields)
  const getSkillName = (skill: any): string => {
    return skill.skill_name || skill.skill || skill.name || 'Unknown Skill';
  };

  const missingSkills = (analysis?.missing_skills as any[]) || [];
  const matchingSkills = (analysis?.matching_skills as any[]) || [];
  const prioritySkills = (analysis?.priority_skills as any[]) || [];
  const learningPath = (analysis?.learning_path as any[]) || [];
  
  // Create a map of skill names to their resources from learning_path
  const skillResourcesMap = new Map();
  learningPath.forEach((pathItem: any) => {
    const skillName = pathItem.skill || pathItem.skill_name || '';
    if (skillName && pathItem.resources) {
      skillResourcesMap.set(skillName.toLowerCase(), pathItem.resources);
    }
  });
  
  // Helper function to get resources for a skill
  const getResourcesForSkill = (skillName: string): any[] => {
    return skillResourcesMap.get(skillName.toLowerCase()) || [];
  };
  
  // Debug: Log the data to help troubleshoot
  console.log('Skill Gap Analysis Data:', {
    missingSkills,
    matchingSkills,
    prioritySkills,
    learningPath,
    skillResourcesMap: Array.from(skillResourcesMap.entries()),
    rawAnalysis: analysis
  });
  
  // Calculate match percentage based on matching vs total skills
  const totalSkills = missingSkills.length + matchingSkills.length;
  const matchPercentage = totalSkills > 0 
    ? Math.round((matchingSkills.length / totalSkills) * 100) 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Skill Gap Analysis - {jobTitle}
              </DialogTitle>
              <DialogDescription>
                Review your skill match and add skills to your development plan
              </DialogDescription>
            </div>
            {missingSkills.length > 0 && (
              <Button
                onClick={addAllMissingSkills}
                size="sm"
                variant="default"
              >
                <Play className="h-4 w-4 mr-2" />
                Track All Missing Skills
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-120px)] pr-4">
          <div className="pb-6">
          {isLoading || generateAnalysis.isPending ? (
            <div className="space-y-4 py-8">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-muted-foreground tracking-normal">
                  {generateAnalysis.isPending ? "Generating skill gap analysis..." : "Loading analysis..."}
                </p>
              </div>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : !analysis ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4 tracking-normal">
                No analysis available yet
              </p>
              <Button onClick={() => generateAnalysis.mutate()}>
                Generate Analysis
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overall Match Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg tracking-normal">Skills You Need to Develop</CardTitle>
                  <CardDescription className="tracking-normal leading-relaxed">
                    {missingSkills.length > 0 
                      ? `Develop ${missingSkills.length} skill${missingSkills.length > 1 ? 's' : ''} to match this position`
                      : "You have all the required skills for this position!"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{matchPercentage}%</span>
                      <Badge variant={matchPercentage >= 80 ? "default" : matchPercentage >= 60 ? "secondary" : "destructive"}>
                        {matchPercentage >= 80 ? "Strong Match" : matchPercentage >= 60 ? "Good Match" : "Needs Work"}
                      </Badge>
                    </div>
                    <Progress value={matchPercentage} className="h-3" />
                    <p className="text-sm text-muted-foreground tracking-normal leading-relaxed">
                      You match {matchPercentage}% of required skills
                    </p>
                    {missingSkills.length > 0 && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2 tracking-normal">Missing Skills:</p>
                        <div className="flex flex-wrap gap-2">
                          {missingSkills.slice(0, 8).map((skill: any, index: number) => (
                            <Badge key={index} variant="outline" className="tracking-normal">
                              {getSkillName(skill)}
                            </Badge>
                          ))}
                          {missingSkills.length > 8 && (
                            <Badge variant="outline" className="tracking-normal">+{missingSkills.length - 8} more</Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="gaps" className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Gaps ({missingSkills.length})
                  </TabsTrigger>
                  <TabsTrigger value="matching" className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Matching ({matchingSkills.length})
                  </TabsTrigger>
                  <TabsTrigger value="recommendations" className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    Learn
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="gaps" className="space-y-3 mt-4">
                  {missingSkills.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                      <h3 className="text-xl font-semibold mb-2">Excellent Match!</h3>
                      <p className="text-muted-foreground">
                        You have all the required skills for this position.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1 tracking-normal">
                              Skills to Develop
                            </h4>
                            <p className="text-sm text-yellow-800 dark:text-yellow-200 tracking-normal leading-relaxed">
                              Develop these {missingSkills.length} skill{missingSkills.length > 1 ? 's' : ''} to improve your match. Click "Add to My Progress" to start tracking.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {missingSkills.map((skill: any, index: number) => {
                        const skillName = getSkillName(skill);
                        const resources = getResourcesForSkill(skillName);
                        const priority = getSkillPriority(skill);
                        console.log('Missing skill card:', { skillName, resources, rawSkill: skill });
                        return (
                        <Card key={index} className="border-l-4 border-l-yellow-500">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <CardTitle className="text-base flex items-center gap-2 tracking-normal">
                                  <span className="flex-1">{skillName}</span>
                                  <Badge 
                                    variant={getPriorityColor(priority)} 
                                    className={`tracking-normal whitespace-nowrap ${getPriorityClassName(priority)}`}
                                  >
                                    {getPriorityLabel(priority)}
                                  </Badge>
                                </CardTitle>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {(skill.context || skill.reason) && (
                              <p className="text-sm text-muted-foreground tracking-normal leading-relaxed">{skill.context || skill.reason}</p>
                            )}
                            
                            {resources.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground tracking-normal">Recommended Resources:</p>
                                <div className="flex flex-wrap gap-2">
                                  {resources.slice(0, 2).map((resource: any, rIndex: number) => (
                                    <Badge key={rIndex} variant="secondary" className="text-xs tracking-normal">
                                      <BookOpen className="h-3 w-3 mr-1" />
                                      {resource.title || resource.name || `Resource ${rIndex + 1}`}
                                    </Badge>
                                  ))}
                                  {resources.length > 2 && (
                                    <Badge variant="secondary" className="text-xs tracking-normal">
                                      +{resources.length - 2} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <Button
                              size="sm"
                              onClick={() => startLearning(skillName, resources)}
                              className="w-full"
                            >
                              <Play className="h-3 w-3 mr-2" />
                              Add to My Progress
                            </Button>
                          </CardContent>
                        </Card>
                      );
                      })}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="matching" className="space-y-3 mt-4">
                  {matchingSkills.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 tracking-normal">
                      No matching skills found yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {matchingSkills.map((skill: any, index: number) => (
                        <Card key={index} className="overflow-hidden">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <CardTitle className="text-sm tracking-normal break-words overflow-wrap-anywhere min-w-0">{getSkillName(skill)}</CardTitle>
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="recommendations" className="space-y-3 mt-4">
                  {learningPath.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No learning recommendations available.
                    </p>
                  ) : (
                    learningPath.map((rec: any, index: number) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-base">{rec.title || rec.skill_name || rec.skill}</CardTitle>
                          <CardDescription>{rec.description || rec.reason}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {rec.resources && rec.resources.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Learning Resources:</p>
                              {rec.resources.slice(0, 3).map((resource: any, rIndex: number) => (
                                <div key={rIndex} className="flex items-center justify-between p-2 bg-muted rounded-md">
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" />
                                    <span className="text-sm">{resource.title || resource.name || 'Resource'}</span>
                                  </div>
                                  {resource.url && (
                                    <Button size="sm" variant="ghost" asChild>
                                      <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {rec.estimated_time && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              Estimated time: {rec.estimated_time}
                            </div>
                          )}
                          {analysis?.estimated_learning_time_weeks && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              Total estimated time: {analysis.estimated_learning_time_weeks} weeks
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
