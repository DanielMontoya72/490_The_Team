import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Target, CheckCircle, AlertTriangle, BookOpen, TrendingUp, 
  Play, ExternalLink, Clock, Award, Loader2, Plus, User 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SkillGapAnalysisProps {
  jobId: string;
}

export function SkillGapAnalysis({ jobId }: SkillGapAnalysisProps) {
  const { toast } = useToast();
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
  });

  // Generate analysis mutation
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
      toast({
        title: "Analysis Complete",
        description: "Your skill gap analysis has been generated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to generate analysis",
        variant: "destructive",
      });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const startLearning = async (skillName: string, resources: any[]) => {
    try {
      if (!skillName) {
        console.error('Skill name is missing');
        toast({
          title: "Error",
          description: "Skill name is required to track progress",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('skill_development_progress')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          skill_name: skillName,
          job_id: jobId,
          learning_resources: resources,
          status: 'in_progress',
          started_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Learning Started",
        description: `You've started learning ${skillName}`,
      });
    } catch (error) {
      console.error('Error starting learning:', error);
      toast({
        title: "Error",
        description: "Failed to track learning progress",
        variant: "destructive",
      });
    }
  };

  const addAllMissingSkills = async () => {
    try {
      const missingSkillsArray = analysis?.missing_skills as any[];
      if (!missingSkillsArray || !Array.isArray(missingSkillsArray) || missingSkillsArray.length === 0) {
        toast({
          title: "No Skills to Add",
          description: "There are no missing skills to add",
          variant: "destructive",
        });
        return;
      }

      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("Not authenticated");

      // Get existing skills in progress to avoid duplicates
      const { data: existingProgress } = await supabase
        .from('skill_development_progress')
        .select('skill_name')
        .eq('user_id', userId);

      const existingSkillNames = new Set(
        existingProgress?.map(p => p.skill_name.toLowerCase()) || []
      );

      // Prepare skills to add (only new ones)
      const skillsToAdd = missingSkillsArray
        .filter((skill: any) => {
          const skillName = skill.skill || skill.skill_name || skill.name;
          return skillName && !existingSkillNames.has(skillName.toLowerCase());
        })
        .map((skill: any) => ({
          user_id: userId,
          skill_name: skill.skill || skill.skill_name || skill.name,
          job_id: jobId,
          learning_resources: skill.resources || [],
          status: 'not_started',
          current_level: 'beginner',
          target_level: 'advanced',
          priority: skill.importance || 'medium',
        }));

      if (skillsToAdd.length === 0) {
        toast({
          title: "Skills Already Added",
          description: "All missing skills are already in your development progress",
        });
        return;
      }

      const { error } = await supabase
        .from('skill_development_progress')
        .insert(skillsToAdd);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['skill-progress'] });
      queryClient.invalidateQueries({ queryKey: ['skill-development-progress'] });

      toast({
        title: "Skills Added",
        description: `Added ${skillsToAdd.length} skill${skillsToAdd.length > 1 ? 's' : ''} to your development plan`,
      });
    } catch (error) {
      console.error('Error adding skills:', error);
      toast({
        title: "Error",
        description: "Failed to add skills to development plan",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Skill Gap Analysis
          </CardTitle>
          <CardDescription>
            Identify skill gaps and get personalized learning recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Analyze your skills against this job's requirements to identify what you need to learn.
          </p>
          <Button 
            onClick={() => generateAnalysis.mutate()}
            disabled={generateAnalysis.isPending}
          >
            {generateAnalysis.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Analyze Skill Gaps
          </Button>
        </CardContent>
      </Card>
    );
  }

  const missingSkills = analysis.missing_skills as any[] || [];
  const weakSkills = analysis.weak_skills as any[] || [];
  const matchingSkills = analysis.matching_skills as any[] || [];
  const learningPath = analysis.learning_path as any[] || [];
  const prioritySkills = analysis.priority_skills as any[] || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Skill Gap Analysis
            </CardTitle>
            <CardDescription>
              Analyzed {new Date(analysis.created_at).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/skill-development">
              <Button variant="outline" size="sm" className="gap-2">
                <User className="h-4 w-4" />
                Manage Skills
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => generateAnalysis.mutate()}
              disabled={generateAnalysis.isPending}
            >
              {generateAnalysis.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="gaps">Gaps</TabsTrigger>
            <TabsTrigger value="matching">Strengths</TabsTrigger>
            <TabsTrigger value="learning">Learning Path</TabsTrigger>
            <TabsTrigger value="priority">Priorities</TabsTrigger>
          </TabsList>

          <TabsContent value="gaps" className="space-y-6 mt-4">
            {/* Missing Skills */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Missing Skills ({missingSkills.length})
                </h3>
                {missingSkills.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={addAllMissingSkills}
                    className="gap-2"
                  >
                    <Target className="h-4 w-4" />
                    Add All to Development Plan
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {missingSkills.map((skill: any, index: number) => (
                  <div key={index} className="p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{skill.skill || skill.skill_name || skill.name}</p>
                        <p className="text-sm text-muted-foreground">{skill.reason || skill.description}</p>
                      </div>
                      {skill.importance && (
                        <Badge variant={getPriorityColor(skill.importance)}>
                          {skill.importance}
                        </Badge>
                      )}
                    </div>
                    {skill.resources && skill.resources.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {skill.resources.slice(0, 2).map((resource: any, rIndex: number) => (
                          <a
                            key={rIndex}
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {resource.title || resource.name}
                          </a>
                        ))}
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => startLearning(skill.skill || skill.skill_name || skill.name, skill.resources)}
                    >
                      <Plus className="mr-2 h-3 w-3" />
                      Add to Skill Development
                    </Button>
                  </div>
                ))}
                {missingSkills.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No missing skills identified!
                  </p>
                )}
              </div>
            </div>

            {/* Weak Skills */}
            {weakSkills.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-yellow-500" />
                  Skills to Improve ({weakSkills.length})
                </h3>
                <div className="space-y-3">
                  {weakSkills.map((skill: any, index: number) => (
                    <div key={index} className="p-3 rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{skill.skill_name || skill.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Current: {skill.current_level} → Target: {skill.target_level}
                          </p>
                        </div>
                      </div>
                      {skill.improvement_areas && (
                        <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                          {skill.improvement_areas.map((area: string, aIndex: number) => (
                            <li key={aIndex}>• {area}</li>
                          ))}
                        </ul>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => startLearning(skill.skill_name || skill.name, skill.resources)}
                      >
                        <Plus className="mr-2 h-3 w-3" />
                        Add to Skill Development
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="matching" className="space-y-4 mt-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Your Matching Skills ({matchingSkills.length})
            </h3>
            <div className="grid gap-4">
              {matchingSkills.map((skill: any, index: number) => (
                <div key={index} className="p-3 rounded-lg border bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{skill.skill_name || skill.name || skill.skill || (typeof skill === 'string' ? skill : 'Unnamed Skill')}</p>
                      {skill.proficiency_level && (
                        <p className="text-sm text-muted-foreground">
                          Level: {skill.proficiency_level}
                        </p>
                      )}
                      {skill.category && (
                        <p className="text-xs text-muted-foreground">
                          {skill.category}
                        </p>
                      )}
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                  </div>
                  {skill.relevance && (
                    <p className="text-xs text-muted-foreground mt-1">{skill.relevance}</p>
                  )}
                </div>
              ))}
              {matchingSkills.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No matching skills identified yet.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="learning" className="space-y-4 mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Personalized Learning Path
              </h3>
              {analysis.estimated_learning_time_weeks && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  ~{analysis.estimated_learning_time_weeks} weeks
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              {learningPath.map((step: any, index: number) => (
                <div key={index} className="p-4 rounded-lg border">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{step.skill || step.skill_name || step.title}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                      
                      {step.estimated_weeks && (
                        <Badge variant="outline" className="mb-3">
                          {step.estimated_weeks} weeks
                        </Badge>
                      )}

                      {step.resources && step.resources.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium">Recommended Resources:</p>
                          {step.resources.map((resource: any, rIndex: number) => (
                            <a
                              key={rIndex}
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <div>
                                <p className="font-medium">{resource.title || resource.name}</p>
                                <p className="text-xs text-muted-foreground">{resource.platform}</p>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}

                      <Button
                        size="sm"
                        className="mt-3"
                        onClick={() => startLearning(step.skill || step.skill_name || step.title, step.resources)}
                      >
                        <Play className="mr-2 h-3 w-3" />
                        Start This Step
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {learningPath.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No learning path generated yet.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="priority" className="space-y-3 mt-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Priority Skills to Focus On
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              These skills will have the biggest impact on your candidacy for this role.
            </p>
            <div className="space-y-4">
              {prioritySkills.map((skill: any, index: number) => {
                const skillName = skill.skill_name || skill.name || skill.skill || (typeof skill === 'string' ? skill : 'Unnamed Skill');
                const impactValue = typeof skill.impact === 'number' ? skill.impact : (skill.impact ? parseInt(skill.impact) : 0);
                
                return (
                  <div key={index} className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-base">{skillName}</p>
                        {skill.reason && (
                          <p className="text-sm text-muted-foreground mt-1">{skill.reason}</p>
                        )}
                      </div>
                      {skill.priority && (
                        <Badge variant={getPriorityColor(skill.priority)} className="ml-2">
                          {skill.priority}
                        </Badge>
                      )}
                    </div>
                    {impactValue > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium mb-2">Impact on Application:</p>
                        <Progress value={impactValue} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{impactValue}% impact</p>
                      </div>
                    )}
                  </div>
                );
              })}
              {prioritySkills.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No priority skills identified.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
