import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { BookOpen, CheckCircle, TrendingUp, ExternalLink, Trash2, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SkillDevelopmentProgressProps {
  jobId?: string;
}

export function SkillDevelopmentProgress({ jobId }: SkillDevelopmentProgressProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resourcesDialogOpen, setResourcesDialogOpen] = useState(false);
  const [selectedResourceSkill, setSelectedResourceSkill] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('in_progress');
  const [notes, setNotes] = useState('');
  const [addResourceDialogOpen, setAddResourceDialogOpen] = useState(false);
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [newResourceDescription, setNewResourceDescription] = useState('');
  const [newResourceType, setNewResourceType] = useState('article');

  // Fetch progress for this job or all progress
  const { data: progressItems, isLoading } = useQuery({
    queryKey: jobId ? ['skill-progress', jobId] : ['skill-progress'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let query = supabase
        .from('skill_development_progress')
        .select('*')
        .order('created_at', { ascending: false });

      if (jobId) {
        query = query.eq('job_id', jobId);
      }

      const { data: progressData, error: progressError } = await query;
      if (progressError) throw progressError;

      // Fetch skill gap analyses to get resources for skills that don't have them
      const { data: analyses, error: analysesError } = await supabase
        .from('skill_gap_analyses')
        .select('missing_skills, learning_path')
        .eq('user_id', user.id);

      if (analysesError) throw analysesError;

      console.log('===== SKILL GAP ANALYSES =====');
      console.log('Total analyses:', analyses?.length);
      analyses?.forEach((analysis, idx) => {
        console.log(`Analysis ${idx + 1}:`);
        if (analysis.learning_path && Array.isArray(analysis.learning_path) && analysis.learning_path.length > 0) {
          console.log('  Learning path item 0:', analysis.learning_path[0]);
        }
        if (analysis.missing_skills && Array.isArray(analysis.missing_skills) && analysis.missing_skills.length > 0) {
          console.log('  Missing skill item 0:', analysis.missing_skills[0]);
        }
      });

      // Enhance progress items with resources from skill gap analyses
      const enhancedData = progressData?.map(progress => {
        console.log(`\n===== Processing skill: ${progress.skill_name} =====`);
        
        // If progress already has resources, return as-is
        if (progress.learning_resources && Array.isArray(progress.learning_resources) && progress.learning_resources.length > 0) {
          console.log('Already has resources:', progress.learning_resources.length);
          return progress;
        }

        console.log('Looking for resources in analyses...');
        
        // Otherwise, try to find resources from skill gap analyses
        let foundResources = null;
        
        for (const analysis of analyses || []) {
          console.log('Checking analysis...');
          
          // Check learning path (ONLY place where resources exist)
          if (analysis.learning_path && Array.isArray(analysis.learning_path)) {
            console.log('  Learning path items:', analysis.learning_path.length);
            
            // Try exact match first
            let pathItem = analysis.learning_path.find((item: any) => {
              const itemSkill = item.skill || item.skill_name || item.name;
              return itemSkill?.toLowerCase() === progress.skill_name.toLowerCase();
            });
            
            // If no exact match, try partial match (e.g., "Java" matches "Java Programming Fundamentals")
            if (!pathItem) {
              const searchTerm = progress.skill_name.toLowerCase();
              pathItem = analysis.learning_path.find((item: any) => {
                const itemSkill = (item.skill || item.skill_name || item.name || '').toLowerCase();
                // Check if either string contains the other
                return itemSkill.includes(searchTerm) || searchTerm.includes(itemSkill.split(' ')[0]);
              });
            }
            
            if (pathItem) {
              const pathItemSkill = (pathItem as any).skill || (pathItem as any).skill_name || (pathItem as any).name;
              console.log(`  Matched "${pathItemSkill}" for "${progress.skill_name}"`);
              const pathItemResources = (pathItem as any).resources;
              if (pathItemResources && Array.isArray(pathItemResources) && pathItemResources.length > 0) {
                console.log('  FOUND resources!', pathItemResources.length);
                foundResources = pathItemResources;
                break;
              }
            }
          }
        }

        if (!foundResources) {
          console.log('No resources found for', progress.skill_name);
        }

        // Return progress with found resources or original
        return foundResources ? { ...progress, learning_resources: foundResources } : progress;
      });

      console.log('===== SKILL DEVELOPMENT PROGRESS DATA =====');
      console.log('Total items:', enhancedData?.length);
      enhancedData?.forEach(item => {
        console.log(`Skill: ${item.skill_name}, Resources:`, item.learning_resources?.length || 0);
      });

      return enhancedData || [];
    },
  });

  // Update progress mutation
  const updateProgress = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('skill_development_progress')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-progress'] });
      setEditDialogOpen(false);
      toast({
        title: "Progress Updated",
        description: "Your skill development progress has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update progress",
        variant: "destructive",
      });
    },
  });

  // Delete progress mutation
  const deleteProgress = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('skill_development_progress')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-progress'] });
      toast({
        title: "Removed",
        description: "Skill development tracking removed.",
      });
    },
  });

  // Add custom resource mutation
  const addCustomResource = useMutation({
    mutationFn: async ({ skillId, resource }: { skillId: string; resource: any }) => {
      // Get current skill with all its resources (including merged ones)
      const currentSkill = progressItems?.find((item: any) => item.id === skillId);
      
      if (!currentSkill) throw new Error("Skill not found");

      // Use the merged learning_resources from the enhanced query
      const currentResources = currentSkill.learning_resources || [];
      const updatedResources = [...currentResources, resource];

      // Update with new resource
      const { data, error } = await supabase
        .from('skill_development_progress')
        .update({ learning_resources: updatedResources })
        .eq('id', skillId)
        .select()
        .single();

      if (error) throw error;
      return { ...data, learning_resources: updatedResources };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['skill-progress'] });
      // Update the selected resource skill with the new data
      setSelectedResourceSkill(data);
      setAddResourceDialogOpen(false);
      setNewResourceTitle('');
      setNewResourceUrl('');
      setNewResourceDescription('');
      setNewResourceType('article');
      toast({
        title: "Resource Added",
        description: "Your custom learning resource has been added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Resource",
        description: error instanceof Error ? error.message : "Failed to add resource",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (skill: any) => {
    setSelectedSkill(skill);
    setProgress(skill.progress_percentage || 0);
    setStatus(skill.status || 'in_progress');
    setNotes(skill.notes || '');
    setEditDialogOpen(true);
  };

  const handleSaveProgress = () => {
    if (!selectedSkill) return;

    const updates: any = {
      progress_percentage: progress,
      status: status,
      notes: notes,
    };

    if (status === 'completed' && !selectedSkill.completed_at) {
      updates.completed_at = new Date().toISOString();
    }

    updateProgress.mutate({ id: selectedSkill.id, updates });
  };

  const handleAddResource = () => {
    if (!selectedResourceSkill || !newResourceTitle || !newResourceUrl) {
      toast({
        title: "Missing Information",
        description: "Please provide at least a title and URL for the resource.",
        variant: "destructive",
      });
      return;
    }

    const newResource = {
      title: newResourceTitle,
      url: newResourceUrl,
      description: newResourceDescription || undefined,
      type: newResourceType,
    };

    addCustomResource.mutate({ skillId: selectedResourceSkill.id, resource: newResource });
  };

  const openAddResourceDialog = (skill: any) => {
    setSelectedResourceSkill(skill);
    setAddResourceDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white hover:bg-green-500/80';
      case 'in_progress': return 'bg-purple-500 text-white hover:bg-purple-500/80';
      case 'not_started': return 'bg-gray-500 text-white hover:bg-gray-500/80';
      default: return 'bg-gray-500 text-white hover:bg-gray-500/80';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-red-500 text-white hover:bg-red-500/80';
      case 'high': return 'bg-yellow-500 text-white hover:bg-yellow-500/80';
      case 'medium': return 'bg-blue-500 text-white hover:bg-blue-500/80';
      case 'low': return 'bg-[#D24BB9] text-white hover:bg-[#D24BB9]/80';
      default: return 'bg-gray-500 text-white hover:bg-gray-500/80';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!progressItems || progressItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Skill Development Progress
          </CardTitle>
          <CardDescription>
            Track your progress on learning new skills
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No skills being tracked yet. Start learning from the skill gap analysis tab in the resume editor!
          </p>
        </CardContent>
      </Card>
    );
  }

  const inProgressSkills = progressItems.filter(s => s.status !== 'completed');
  const completedSkills = progressItems.filter(s => s.status === 'completed');

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Skill Development Progress
          </CardTitle>
          <CardDescription>
            {inProgressSkills.length} in progress • {completedSkills.length} completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* In Progress Skills */}
          {inProgressSkills.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Currently Learning
              </h3>
              {inProgressSkills.map((skill) => {
                // Debug logging
                console.log('Skill:', skill.skill_name, 'Resources:', skill.learning_resources);
                const hasResources = skill.learning_resources && Array.isArray(skill.learning_resources) && skill.learning_resources.length > 0;
                const resourceCount = hasResources ? (skill.learning_resources as any[]).length : 0;
                
                return (
                <div key={skill.id} className="p-4 rounded-lg border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{skill.skill_name}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge className={`text-xs ${getStatusColor(skill.status)}`}>
                          {skill.status.replace('_', ' ')}
                        </Badge>
                        {skill.priority && (
                          <Badge className={`text-xs ${getPriorityColor(skill.priority)}`}>
                            {skill.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <Button
                        size="sm"
                        className="bg-yellow-500 text-white hover:bg-yellow-600"
                        onClick={() => {
                          setSelectedResourceSkill(skill);
                          setResourcesDialogOpen(true);
                        }}
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Resources ({resourceCount})
                      </Button>
                      <Button
                        size="sm"
                        className="bg-purple-500 text-white hover:bg-purple-600"
                        onClick={() => handleEditClick(skill)}
                      >
                        Update
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#D24BB9] text-white hover:bg-[#D24BB9]/80"
                        onClick={() => deleteProgress.mutate(skill.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{skill.progress_percentage}%</span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-visible">
                      <div 
                        className="h-full bg-purple-500 transition-all duration-300 rounded-full"
                        style={{ width: `${skill.progress_percentage}%` }}
                      />
                      {skill.progress_percentage > 0 && (
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-purple-500 border-2 border-white rounded-full shadow-lg transition-all duration-300"
                          style={{ left: `${skill.progress_percentage}%`, transform: 'translate(-50%, -50%)' }}
                        />
                      )}
                    </div>
                  </div>

                  {skill.started_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Started {new Date(skill.started_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                );
              })}
            </div>
          )}

          {/* Completed Skills */}
          {completedSkills.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Completed
              </h3>
              {completedSkills.map((skill) => (
                <div key={skill.id} className="p-3 rounded-lg border bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{skill.skill_name}</p>
                      {skill.completed_at && (
                        <p className="text-xs text-muted-foreground">
                          Completed {new Date(skill.completed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {skill.learning_resources && Array.isArray(skill.learning_resources) && skill.learning_resources.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedResourceSkill(skill);
                            setResourcesDialogOpen(true);
                          }}
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          Resources
                        </Button>
                      )}
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Progress Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Progress: {selectedSkill?.skill_name}</DialogTitle>
            <DialogDescription>
              Track your learning progress and update your status
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Progress</label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[progress]}
                  onValueChange={(value) => setProgress(value[0])}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12">{progress}%</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about your learning..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProgress} disabled={updateProgress.isPending}>
              Save Progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resources Dialog */}
      <Dialog open={resourcesDialogOpen} onOpenChange={setResourcesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Learning Resources - {selectedResourceSkill?.skill_name}
            </DialogTitle>
            <DialogDescription>
              Access all learning resources for this skill
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto pr-4 flex-1 min-h-0 p-2">
            {(() => {
              console.log('===== RESOURCES DIALOG =====');
              console.log('Selected skill:', selectedResourceSkill?.skill_name);
              console.log('Learning resources:', selectedResourceSkill?.learning_resources);
              console.log('Is array?', Array.isArray(selectedResourceSkill?.learning_resources));
              console.log('Length:', selectedResourceSkill?.learning_resources?.length);
              return null;
            })()}
            {selectedResourceSkill?.learning_resources && Array.isArray(selectedResourceSkill.learning_resources) && selectedResourceSkill.learning_resources.length > 0 ? (
              selectedResourceSkill.learning_resources.map((resource: any, index: number) => (
                <Card key={index} className="overflow-hidden flex-shrink-0">
                  <CardContent className="p-5 pb-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-2 tracking-normal break-words">
                          {resource.title || resource.name || `Resource ${index + 1}`}
                        </h4>
                        {resource.description && (
                          <p className="text-sm text-muted-foreground mb-3 tracking-normal leading-relaxed break-words">
                            {resource.description}
                          </p>
                        )}
                        {resource.type && (
                          <Badge variant="secondary" className="text-xs tracking-normal mb-3">
                            {resource.type}
                          </Badge>
                        )}
                        {resource.url && (
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-2 text-sm text-primary hover:underline tracking-normal pb-1"
                          >
                            <ExternalLink className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <span className="break-all leading-relaxed">{resource.url}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8 tracking-normal">
                No learning resources available for this skill.
              </p>
            )}
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => openAddResourceDialog(selectedResourceSkill)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
            <Button onClick={() => setResourcesDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Resource Dialog */}
      <Dialog open={addResourceDialogOpen} onOpenChange={setAddResourceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Learning Resource</DialogTitle>
            <DialogDescription>
              Add your own learning resource for {selectedResourceSkill?.skill_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title *</label>
              <Input
                placeholder="e.g., Advanced JavaScript Course"
                value={newResourceTitle}
                onChange={(e) => setNewResourceTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">URL *</label>
              <Input
                type="url"
                placeholder="https://example.com/resource"
                value={newResourceUrl}
                onChange={(e) => setNewResourceUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select value={newResourceType} onValueChange={setNewResourceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="course">Course</SelectItem>
                  <SelectItem value="tutorial">Tutorial</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="book">Book</SelectItem>
                  <SelectItem value="practice">Practice/Exercise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
              <Textarea
                placeholder="Brief description of this resource..."
                value={newResourceDescription}
                onChange={(e) => setNewResourceDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddResourceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddResource} disabled={addCustomResource.isPending}>
              Add Resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
