import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Award, TrendingUp, Brain, Languages, Download, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SkillDevelopmentSuggestions } from './SkillDevelopmentSuggestions';
import { SKILLS_TAXONOMY } from "@/data/seedData";

const PROFICIENCY_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];
const CATEGORIES = ["Technical", "Soft Skills", "Languages", "Industry-Specific"];

const CATEGORY_ICONS = {
  "Technical": Award,
  "Soft Skills": Brain,
  "Languages": Languages,
  "Industry-Specific": TrendingUp
};

const SortableSkillItem = ({ skill, onEdit, onDelete, onUpdateProficiency }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: skill.id });
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition: transition || 'transform 200ms cubic-bezier(0.25, 0.8, 0.25, 1)',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1
  };

  const getProficiencyColor = (level) => {
    switch (level) {
      case "Expert": return "bg-primary text-primary-foreground";
      case "Advanced": return "bg-secondary text-secondary-foreground";
      case "Intermediate": return "bg-accent text-accent-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getProficiencyWidth = (level) => {
    switch (level) {
      case "Expert": return "w-full";
      case "Advanced": return "w-3/4";
      case "Intermediate": return "w-1/2";
      default: return "w-1/4";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border bg-card transition-all",
        isDragging ? "shadow-2xl cursor-grabbing scale-105" : "hover:shadow-md cursor-grab"
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="touch-none">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{skill.skill_name}</span>
            <Badge className={cn("text-xs", getProficiencyColor(skill.proficiency_level))}>
              {skill.proficiency_level}
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                getProficiencyWidth(skill.proficiency_level),
                skill.proficiency_level === "Expert" ? "bg-primary" :
                skill.proficiency_level === "Advanced" ? "bg-secondary" :
                skill.proficiency_level === "Intermediate" ? "bg-accent" :
                "bg-muted-foreground"
              )}
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onEdit(skill); }} className="touch-target">
          <Edit className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(skill.id); }} className="touch-target text-destructive hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Map SKILLS_TAXONOMY to category structure for autocomplete
const COMMON_SKILLS = {
  "Technical": SKILLS_TAXONOMY.technical,
  "Soft Skills": SKILLS_TAXONOMY.soft,
  "Languages": [
    "English", "Spanish", "Mandarin", "French", "German", "Japanese", "Portuguese",
    "Arabic", "Hindi", "Russian", "Italian", "Korean"
  ],
  "Industry-Specific": SKILLS_TAXONOMY.certifications
};

export const SkillsManagement = ({ userId }) => {
  const queryClient = useQueryClient();
  const [skills, setSkills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    skillName: "",
    proficiencyLevel: "",
    category: ""
  });
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    loadSkills();
  }, [userId]);

  const loadSkills = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('user_id', userId)
        .order('category')
        .order('display_order');

      if (error) throw error;
      setSkills(data || []);
    } catch (error) {
      console.error("Error loading skills:", error);
      toast.error("Failed to load skills");
    } finally {
      setIsLoading(false);
    }
  };

  const generateLearningResources = (skillName, category, proficiency) => {
    // Generate basic learning resources based on skill category and proficiency
    const baseResources = {
      "Technical": [
        { title: `${skillName} Official Documentation`, type: "Documentation", url: `https://www.google.com/search?q=${encodeURIComponent(skillName + ' official documentation')}`, description: "Official documentation and guides" },
        { title: `${skillName} Tutorial on freeCodeCamp`, type: "Course", url: `https://www.freecodecamp.org/search?query=${encodeURIComponent(skillName)}`, description: "Free interactive coding tutorials" },
        { title: `${skillName} Course on Coursera`, type: "Course", url: `https://www.coursera.org/search?query=${encodeURIComponent(skillName)}`, description: "Professional courses and certifications" },
        { title: `${skillName} on YouTube`, type: "Tutorial", url: `https://www.youtube.com/results?search_query=${encodeURIComponent(skillName + ' tutorial')}`, description: "Video tutorials and walkthroughs" }
      ],
      "Soft Skills": [
        { title: `${skillName} Guide on MindTools`, type: "Article", url: `https://www.mindtools.com/search?q=${encodeURIComponent(skillName)}`, description: "Professional development resources" },
        { title: `${skillName} Course on LinkedIn Learning`, type: "Course", url: `https://www.linkedin.com/learning/search?keywords=${encodeURIComponent(skillName)}`, description: "Professional skill development" },
        { title: `${skillName} on Coursera`, type: "Course", url: `https://www.coursera.org/search?query=${encodeURIComponent(skillName)}`, description: "University-level courses" },
        { title: `${skillName} TED Talks`, type: "Video", url: `https://www.ted.com/search?q=${encodeURIComponent(skillName)}`, description: "Inspiring talks and ideas" }
      ],
      "Languages": [
        { title: `Learn ${skillName} on Duolingo`, type: "App", url: `https://www.duolingo.com/`, description: "Free language learning platform" },
        { title: `${skillName} on Babbel`, type: "Course", url: `https://www.babbel.com/`, description: "Comprehensive language courses" },
        { title: `${skillName} Practice on italki`, type: "Platform", url: `https://www.italki.com/`, description: "Practice with native speakers" },
        { title: `${skillName} Resources`, type: "Resource", url: `https://www.google.com/search?q=learn+${encodeURIComponent(skillName)}`, description: "Curated learning materials" }
      ],
      "Industry-Specific": [
        { title: `${skillName} on Coursera`, type: "Course", url: `https://www.coursera.org/search?query=${encodeURIComponent(skillName)}`, description: "Industry-specific courses" },
        { title: `${skillName} on LinkedIn Learning`, type: "Course", url: `https://www.linkedin.com/learning/search?keywords=${encodeURIComponent(skillName)}`, description: "Professional development" },
        { title: `${skillName} Industry Resources`, type: "Article", url: `https://www.google.com/search?q=${encodeURIComponent(skillName + ' best practices')}`, description: "Industry best practices and guides" },
        { title: `${skillName} Community`, type: "Forum", url: `https://www.reddit.com/search/?q=${encodeURIComponent(skillName)}`, description: "Community discussions and tips" }
      ]
    };

    return baseResources[category] || baseResources["Technical"];
  };

  const createSkillProgressWithResources = async (skillName, category, proficiency) => {
    try {
      console.log('Creating skill progress for:', skillName, category, proficiency);
      
      // Check if progress entry already exists for this skill
      const { data: existing } = await supabase
        .from('skill_development_progress')
        .select('id')
        .eq('user_id', userId)
        .eq('skill_name', skillName)
        .maybeSingle();

      if (existing) {
        console.log('Progress entry already exists for', skillName);
        return;
      }

      const resources = generateLearningResources(skillName, category, proficiency);
      console.log('Generated resources:', resources);
      
      // Map proficiency level to current_level
      const levelMap = {
        'Beginner': 'beginner',
        'Intermediate': 'intermediate',
        'Advanced': 'advanced',
        'Expert': 'expert'
      };
      
      const currentLevel = levelMap[proficiency] || 'beginner';
      const targetLevel = proficiency === 'Expert' ? 'expert' : 
                         proficiency === 'Advanced' ? 'expert' : 
                         proficiency === 'Intermediate' ? 'advanced' : 'intermediate';
      
      const { data, error } = await supabase
        .from('skill_development_progress')
        .insert({
          user_id: userId,
          skill_name: skillName,
          learning_resources: resources,
          status: 'not_started',
          progress_percentage: 0,
          current_level: currentLevel,
          target_level: targetLevel,
          priority: 'medium',
          started_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Successfully created skill progress:', data);
    } catch (error) {
      console.error('Error creating skill progress:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.category || !formData.skillName.trim() || !formData.proficiencyLevel) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Check for duplicate
    const isDuplicate = skills.some(
      s => s.skill_name.toLowerCase() === formData.skillName.toLowerCase() &&
           s.category === formData.category &&
           (!editingSkill || s.id !== editingSkill.id)
    );

    if (isDuplicate) {
      toast.error("You've already added this skill in this category");
      return;
    }

    try {
      if (editingSkill) {
        const { error } = await supabase
          .from('skills')
          .update({
            skill_name: formData.skillName,
            proficiency_level: formData.proficiencyLevel,
            category: formData.category
          })
          .eq('id', editingSkill.id);

        if (error) throw error;
        toast.success("Skill updated!", {
          description: "Refresh your job skill analysis to see updated matches"
        });
      } else {
        const { error } = await supabase
          .from('skills')
          .insert([{
            user_id: userId,
            skill_name: formData.skillName,
            proficiency_level: formData.proficiencyLevel,
            category: formData.category
          }]);

        if (error) throw error;
        
        console.log('===== SKILL ADDED SUCCESSFULLY =====');
        console.log('Skill name:', formData.skillName);
        console.log('Category:', formData.category);
        console.log('Proficiency:', formData.proficiencyLevel);
        console.log('User ID:', userId);
        
        // Automatically create skill development progress entry with resources
        try {
          console.log('===== CALLING createSkillProgressWithResources =====');
          await createSkillProgressWithResources(formData.skillName, formData.category, formData.proficiencyLevel);
          console.log('===== RESOURCES CREATED SUCCESSFULLY =====');
          toast.success("Skill added with learning resources!");
        } catch (resourceError) {
          console.error('===== ERROR CREATING RESOURCES =====', resourceError);
          toast.success("Skill added!", {
            description: "Resources will be available shortly"
          });
        }
      }

      // Invalidate skill gap analysis queries to refresh resources
      queryClient.invalidateQueries({ queryKey: ['skill-gap-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['all-skill-gap-analyses'] });
      queryClient.invalidateQueries({ queryKey: ['skill-progress'] });
      queryClient.invalidateQueries({ queryKey: ['skill-development-progress'] });
      
      resetForm();
      loadSkills();
    } catch (error) {
      console.error("Error saving skill:", error);
      toast.error("Failed to save skill");
    }
  };

  const handleEdit = (skill) => {
    setFormData({
      skillName: skill.skill_name,
      proficiencyLevel: skill.proficiency_level,
      category: skill.category
    });
    setEditingSkill(skill);
    setIsAdding(true);
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      toast.success("Skill removed");
      
      // Invalidate skill gap analysis queries to refresh resources
      queryClient.invalidateQueries({ queryKey: ['skill-gap-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['all-skill-gap-analyses'] });
      queryClient.invalidateQueries({ queryKey: ['skill-progress'] });
      queryClient.invalidateQueries({ queryKey: ['skill-development-progress'] });
      
      loadSkills();
    } catch (error) {
      console.error("Error deleting skill:", error);
      toast.error("Failed to remove skill");
    } finally {
      setDeleteId(null);
    }
  };

  const handleUpdateProficiency = async (skillId, newLevel) => {
    try {
      const { error } = await supabase
        .from('skills')
        .update({ proficiency_level: newLevel })
        .eq('id', skillId);

      if (error) throw error;
      toast.success("Proficiency updated");
      loadSkills();
    } catch (error) {
      console.error("Error updating proficiency:", error);
      toast.error("Failed to update proficiency");
    }
  };

  const handleDragEnd = async (event, category) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const categorySkills = skillsByCategory[category];
    const oldIndex = categorySkills.findIndex(s => s.id === active.id);
    const newIndex = categorySkills.findIndex(s => s.id === over.id);

    const reorderedSkills = arrayMove(categorySkills, oldIndex, newIndex);
    
    try {
      const updates = reorderedSkills.map((skill, index) => 
        supabase.from('skills').update({ display_order: index }).eq('id', skill.id)
      );
      await Promise.all(updates);
      toast.success("Skills reordered");
      loadSkills();
    } catch (error) {
      console.error("Error reordering skills:", error);
      toast.error("Failed to reorder skills");
    }
  };

  const handleExport = () => {
    const csvData = skills.map(skill => 
      `${skill.skill_name},${skill.category},${skill.proficiency_level}`
    ).join('\n');
    const blob = new Blob([`Skill,Category,Proficiency\n${csvData}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skills-export.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Skills exported!");
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const resetForm = () => {
    setFormData({
      skillName: "",
      proficiencyLevel: "",
      category: ""
    });
    setIsAdding(false);
    setEditingSkill(null);
    setSuggestions([]);
  };

  const handleSkillNameChange = (value) => {
    setFormData(prev => ({ ...prev, skillName: value }));
    
    if (formData.category && value.length > 0) {
      const categorySkills = COMMON_SKILLS[formData.category] || [];
      const filtered = categorySkills.filter(skill => 
        skill.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 8));
    } else {
      setSuggestions([]);
    }
  };

  const filteredSkills = skills.filter(skill =>
    skill.skill_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    skill.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const skillsByCategory = filteredSkills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {});

  const getProficiencyColor = (level) => {
    switch (level) {
      case "Expert": return "bg-primary text-primary-foreground";
      case "Advanced": return "bg-secondary text-secondary-foreground";
      case "Intermediate": return "bg-accent text-accent-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getProficiencyWidth = (level) => {
    switch (level) {
      case "Expert": return "w-full";
      case "Advanced": return "w-3/4";
      case "Intermediate": return "w-1/2";
      default: return "w-1/4";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading skills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Skills & Expertise
          </h2>
          <p className="text-muted-foreground mt-2 text-base">
            Showcase your skills to stand out to employers
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
          {skills.length > 0 && (
            <Button
              onClick={handleExport}
              variant="outline"
              className="touch-target"
              size="lg"
            >
              <Download className="mr-2 h-5 w-5" />
              Export
            </Button>
          )}
          {!isAdding && (
            <Button
              onClick={() => setIsAdding(true)}
              className="touch-target"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Skill
            </Button>
          )}
        </div>
      </div>

      {!isAdding && skills.length > 0 && (
        <div className="flex gap-2">
          <Input
            placeholder="Search skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}

      {isAdding && (
        <Card className="animate-fade-in border-primary/50">
          <CardHeader className="text-center">
            <CardTitle>{editingSkill ? "Edit Skill" : "Add New Skill"}</CardTitle>
            <CardDescription className="text-base">
              {editingSkill ? "Update your skill information" : "Add a skill to your profile"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, category: value, skillName: "" }));
                    setSuggestions(COMMON_SKILLS[value] || []);
                  }}
                >
                  <SelectTrigger className="bg-background touch-target">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {CATEGORIES.map(cat => {
                      const Icon = CATEGORY_ICONS[cat];
                      return (
                        <SelectItem key={cat} value={cat}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {cat}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skillName" className="text-sm font-medium">
                  Skill Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="skillName"
                  value={formData.skillName}
                  onChange={(e) => handleSkillNameChange(e.target.value)}
                  required
                  placeholder="Start typing or select from suggestions..."
                  className="touch-target"
                />
                {suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Popular skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map(suggestion => (
                        <Badge
                          key={suggestion}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, skillName: suggestion }));
                            setSuggestions([]);
                          }}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="proficiencyLevel" className="text-sm font-medium">
                  Proficiency Level <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.proficiencyLevel}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, proficiencyLevel: value }))}
                >
                  <SelectTrigger className="bg-background touch-target">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {PROFICIENCY_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2 rounded-full", getProficiencyWidth(level), getProficiencyColor(level))} />
                          {level}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  type="submit"
                  className="touch-target flex-1 sm:flex-initial"
                  size="lg"
                >
                  {editingSkill ? "Update Skill" : "Add Skill"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  className="touch-target flex-1 sm:flex-initial"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {skills.length === 0 && !isAdding ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Award className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Skills Added Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Start building your skill profile! Add technical skills, soft skills, languages, and more to showcase your expertise.
            </p>
            <Button onClick={() => setIsAdding(true)} size="lg" className="touch-target">
              <Plus className="mr-2 h-5 w-5" />
              Add Your First Skill
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {CATEGORIES.map((category, catIndex) => {
            const categorySkills = skillsByCategory[category] || [];
            if (categorySkills.length === 0) return null;

            const Icon = CATEGORY_ICONS[category];

            return (
              <Card 
                key={category}
                className="animate-fade-in"
                style={{ animationDelay: `${catIndex * 75}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      {category}
                      <Badge variant="secondary" className="ml-2">
                        {categorySkills.length}
                      </Badge>
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, category)}>
                    <SortableContext items={categorySkills.map(s => s.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-3">
                        {categorySkills.map((skill) => (
                          <SortableSkillItem
                            key={skill.id}
                            skill={skill}
                            onEdit={handleEdit}
                            onDelete={(id) => setDeleteId(id)}
                            onUpdateProficiency={handleUpdateProficiency}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Skill Development Suggestions */}
      {!isAdding && skills.length > 0 && (
        <SkillDevelopmentSuggestions userId={userId} />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Skill?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove this skill from your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
