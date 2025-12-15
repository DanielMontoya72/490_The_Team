import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, TrendingUp, AlertCircle, CheckCircle, Lightbulb, ArrowUp, RefreshCw, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Skill {
  skill_name: string;
  category: string;
  proficiency_level: string;
}

interface SkillOptimization {
  skill: string;
  category: string;
  relevance?: string;
  reason: string;
  proficiency?: string;
  priority?: string;
  importance?: string;
  suggestion?: string;
  position?: number;
  trend?: string;
}

interface SkillsOptimizationProps {
  jobDescription: string;
  userSkills: Skill[];
  resumeId?: string;
  onAddSkills?: (skills: string[]) => void;
  autoOptimize?: boolean;
}

export default function SkillsOptimization({ jobDescription, userSkills, resumeId, onAddSkills, autoOptimize }: SkillsOptimizationProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimization, setOptimization] = useState<any>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // Load saved optimization on mount
  useEffect(() => {
    loadSavedOptimization();
  }, [resumeId, jobDescription]);

  // Auto-optimize when autoOptimize prop is true and job description changes
  useEffect(() => {
    if (autoOptimize && jobDescription && !hasAnalyzed) {
      handleOptimize();
    }
  }, [autoOptimize, jobDescription]);

  const getStorageKey = () => {
    return `skills_optimization_${resumeId || 'default'}_${jobDescription.substring(0, 50)}`;
  };

  const loadSavedOptimization = () => {
    try {
      const storageKey = getStorageKey();
      const saved = localStorage.getItem(storageKey);
      
      if (saved) {
        const data = JSON.parse(saved);
        setOptimization(data);
        setHasAnalyzed(true);
      }
    } catch (error: any) {
      console.error('Error loading saved optimization:', error);
    }
  };

  const saveOptimization = (optimizationData: any) => {
    try {
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(optimizationData));
    } catch (error: any) {
      console.error('Error saving optimization:', error);
    }
  };

  const handleOptimize = async () => {
    if (!jobDescription.trim()) {
      toast.error('Please provide a job description first');
      return;
    }

    setIsOptimizing(true);

    try {
      const { data, error } = await supabase.functions.invoke('optimize-resume-skills', {
        body: { jobDescription, userSkills }
      });

      if (error) throw error;

      setOptimization(data);
      setHasAnalyzed(true);
      
      // Save the optimization results
      saveOptimization(data);
      
      toast.success('Skills optimized successfully!');
    } catch (error: any) {
      console.error('Optimization error:', error);
      toast.error(error.message || 'Failed to optimize skills');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleAddAllSkills = (skillsList: SkillOptimization[]) => {
    if (!onAddSkills) {
      toast.error("Unable to add skills - please save your resume first");
      return;
    }
    
    const skillsToAdd = skillsList.map(s => s.skill);
    onAddSkills(skillsToAdd);
    toast.success(`Added ${skillsToAdd.length} skill(s) to your resume`);
  };

  const handleAddSingleSkill = (skill: string) => {
    if (!onAddSkills) {
      toast.error("Unable to add skill - please save your resume first");
      return;
    }
    
    onAddSkills([skill]);
    toast.success(`Added "${skill}" to your resume`);
  };

  const handleApplyReordering = () => {
    if (!onAddSkills) {
      toast.error("Unable to reorder skills - please save your resume first");
      return;
    }
    
    if (!optimization?.reorderedSkills) {
      toast.error("No skill ordering available");
      return;
    }
    
    // Extract skills in the recommended order
    const reorderedSkillsList = optimization.reorderedSkills.map((s: SkillOptimization) => s.skill);
    
    // Replace the skills array with the reordered version
    onAddSkills(reorderedSkillsList);
    toast.success("Skills reordered successfully!");
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'technical': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'soft': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'language': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'industry': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'important':
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'nice-to-have':
      case 'low': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Skills Optimization
          </CardTitle>
          <CardDescription>
            Optimize your skills section based on job requirements and industry trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              onClick={handleOptimize}
              disabled={isOptimizing || !jobDescription}
              className="flex-1"
            >
              {isOptimizing ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Skills...
                </>
              ) : hasAnalyzed ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-analyze Skills
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Optimize Skills
                </>
              )}
            </Button>
            {hasAnalyzed && (
              <Badge variant="secondary" className="px-3 py-2">
                <CheckCircle className="h-3 w-3 mr-1" />
                Analyzed
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {optimization && (
        <div className="space-y-6">
          {/* Matching Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Skills Match Score
                </span>
                <Badge 
                  variant="outline" 
                  className={`text-lg px-4 py-1 ${
                    optimization.matchingScore >= 80 ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                    optimization.matchingScore >= 60 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                    'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}
                >
                  {optimization.matchingScore}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    optimization.matchingScore >= 80 ? 'bg-green-500' :
                    optimization.matchingScore >= 60 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${optimization.matchingScore}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-4">{optimization.summary}</p>
            </CardContent>
          </Card>

          <Tabs defaultValue="emphasize" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="emphasize">Emphasize</TabsTrigger>
              <TabsTrigger value="add">Add Skills</TabsTrigger>
              <TabsTrigger value="gaps">Gaps</TabsTrigger>
              <TabsTrigger value="reorder">Reorder</TabsTrigger>
              <TabsTrigger value="industry">Industry</TabsTrigger>
            </TabsList>

            {/* Skills to Emphasize */}
            <TabsContent value="emphasize">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Skills to Emphasize
                  </CardTitle>
                  <CardDescription>
                    These existing skills are highly relevant for this job
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {optimization.skillsToEmphasize?.map((skill: SkillOptimization, index: number) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <h4 className="font-semibold">{skill.skill}</h4>
                            <div className="flex gap-2">
                              <Badge variant="outline" className={getCategoryColor(skill.category)}>
                                {skill.category}
                              </Badge>
                              <Badge variant="outline" className={getPriorityColor(skill.relevance || '')}>
                                {skill.relevance}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{skill.reason}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Skills to Add */}
            <TabsContent value="add">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-blue-500" />
                        Suggested Skills to Add
                      </CardTitle>
                      <CardDescription className="mt-1.5">
                        Consider adding these skills to strengthen your resume
                      </CardDescription>
                    </div>
                    {optimization.skillsToAdd?.length > 0 && (
                      <Button
                        size="sm"
                        onClick={() => handleAddAllSkills(optimization.skillsToAdd)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add All ({optimization.skillsToAdd.length})
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {optimization.skillsToAdd?.map((skill: SkillOptimization, index: number) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{skill.skill}</h4>
                            </div>
                            <div className="flex gap-2 items-center">
                              <Badge variant="outline" className={getCategoryColor(skill.category)}>
                                {skill.category}
                              </Badge>
                              <Badge variant="outline" className={getPriorityColor(skill.priority || '')}>
                                {skill.priority}
                              </Badge>
                              <Button
                                size="sm"
                                className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleAddSingleSkill(skill.skill)}
                                title="Add to resume"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Suggested: {skill.proficiency}
                          </Badge>
                          <p className="text-sm text-muted-foreground leading-relaxed">{skill.reason}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Skill Gaps */}
            <TabsContent value="gaps">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        Skill Gaps
                      </CardTitle>
                      <CardDescription className="mt-1.5">
                        Important skills missing from your profile
                      </CardDescription>
                    </div>
                    {optimization.skillGaps?.length > 0 && (
                      <Button
                        size="sm"
                        onClick={() => handleAddAllSkills(optimization.skillGaps)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add All ({optimization.skillGaps.length})
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {optimization.skillGaps?.map((gap: SkillOptimization, index: number) => (
                        <div key={index} className="border border-red-500/20 rounded-lg p-4 space-y-3 bg-red-500/5">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{gap.skill}</h4>
                            </div>
                            <div className="flex gap-2 items-center">
                              <Badge variant="outline" className={getCategoryColor(gap.category)}>
                                {gap.category}
                              </Badge>
                              <Badge variant="outline" className={getPriorityColor(gap.importance || '')}>
                                {gap.importance}
                              </Badge>
                              <Button
                                size="sm"
                                className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleAddSingleSkill(gap.skill)}
                                title="Add to resume"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            <strong>Suggestion:</strong> {gap.suggestion}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reordered Skills */}
            <TabsContent value="reorder">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <ArrowUp className="h-5 w-5 text-blue-500" />
                        Optimal Skill Order
                      </CardTitle>
                      <CardDescription className="mt-1.5">
                        Recommended order by relevance to the job
                      </CardDescription>
                    </div>
                    {optimization.reorderedSkills?.length > 0 && (
                      <Button
                        size="sm"
                        onClick={handleApplyReordering}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <ArrowUp className="h-4 w-4 mr-1" />
                        Apply This Order
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                      {optimization.reorderedSkills?.map((skill: SkillOptimization, index: number) => (
                        <div key={index} className="flex items-center gap-4 border rounded-lg p-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0">
                            {skill.position}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{skill.skill}</h4>
                              <Badge variant="outline" className={getCategoryColor(skill.category)}>
                                {skill.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{skill.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Industry Recommendations */}
            <TabsContent value="industry">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-orange-500" />
                        Industry Recommendations
                      </CardTitle>
                      <CardDescription className="mt-1.5">
                        Trending skills in your industry
                      </CardDescription>
                    </div>
                    {optimization.industryRecommendations?.length > 0 && (
                      <Button
                        size="sm"
                        onClick={() => handleAddAllSkills(optimization.industryRecommendations)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add All ({optimization.industryRecommendations.length})
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {optimization.industryRecommendations?.map((rec: SkillOptimization, index: number) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{rec.skill}</h4>
                            </div>
                            <div className="flex gap-2 items-center">
                              <Badge variant="outline" className={getCategoryColor(rec.category)}>
                                {rec.category}
                              </Badge>
                              <Badge variant="outline" className={getPriorityColor(rec.priority || '')}>
                                {rec.priority}
                              </Badge>
                              <Button
                                size="sm"
                                className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleAddSingleSkill(rec.skill)}
                                title="Add to resume"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{rec.trend}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
