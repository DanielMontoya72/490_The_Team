import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SkillDevelopmentSuggestionsProps {
  userId: string;
}

export function SkillDevelopmentSuggestions({ userId }: SkillDevelopmentSuggestionsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Fetch user's current skills
  const { data: currentSkills } = useQuery({
    queryKey: ['user-skills', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data;
    },
  });

  // Fetch skill gap analyses to understand what's in demand
  const { data: analyses } = useQuery({
    queryKey: ['skill-gap-analyses', userId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

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
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  const generateSuggestions = async () => {
    setIsGenerating(true);
    try {
      // Aggregate missing skills from all analyses
      const skillDemand: Record<string, number> = {};
      analyses?.forEach((analysis: any) => {
        const missingSkills = analysis.missing_skills as any[] || [];
        missingSkills.forEach((skill: any) => {
          const skillName = skill.skill || skill.skill_name || skill.name;
          if (skillName) {
            skillDemand[skillName] = (skillDemand[skillName] || 0) + 1;
          }
        });
      });

      // Get current skill names
      const currentSkillNames = new Set(
        currentSkills?.map(s => s.skill_name.toLowerCase()) || []
      );

      // Generate top 5 skill suggestions
      const topSkills = Object.entries(skillDemand)
        .filter(([skillName]) => !currentSkillNames.has(skillName.toLowerCase()))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([skillName, count]) => ({
          name: skillName,
          demand: count,
          category: categorizeSkill(skillName),
          reason: `Required by ${count} job${count > 1 ? 's' : ''} you're interested in`
        }));

      if (topSkills.length === 0) {
        toast.info("No Suggestions Available", {
          description: "You've covered the skills from recent job analyses. Great work!",
        });
        setSuggestions([]);
      } else {
        setSuggestions(topSkills);
        toast.success("Suggestions Generated", {
          description: `Found ${topSkills.length} skill development opportunities`,
        });
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast.error("Failed to generate skill suggestions");
    } finally {
      setIsGenerating(false);
    }
  };

  const categorizeSkill = (skillName: string): string => {
    const technical = ['javascript', 'python', 'java', 'react', 'sql', 'aws', 'docker', 'kubernetes'];
    const softSkills = ['leadership', 'communication', 'teamwork', 'management'];
    
    const lower = skillName.toLowerCase();
    if (technical.some(t => lower.includes(t))) return 'Technical';
    if (softSkills.some(s => lower.includes(s))) return 'Soft Skills';
    return 'Industry-Specific';
  };

  const addToSkillDevelopment = async (suggestion: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Add to skill development progress
      const { error } = await supabase
        .from('skill_development_progress')
        .insert({
          user_id: user.id,
          skill_name: suggestion.name,
          status: 'not_started',
        });

      if (error) {
        // Check if it already exists
        if (error.code === '23505') {
          toast.info(`${suggestion.name} is already in your development plan`);
          return;
        }
        throw error;
      }

      toast.success(`${suggestion.name} added to your skill development`);

      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s.name !== suggestion.name));
    } catch (error) {
      console.error('Error adding to development:', error);
      toast.error("Failed to add skill to development plan");
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Skill Development Suggestions
        </CardTitle>
        <CardDescription>
          Based on your job interests, here are skills that could boost your opportunities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Generate personalized skill suggestions based on your job applications
            </p>
            <Button 
              onClick={generateSuggestions}
              disabled={isGenerating || !analyses || analyses.length === 0}
            >
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Suggestions
            </Button>
            {(!analyses || analyses.length === 0) && (
              <p className="text-xs text-muted-foreground mt-2">
                Run skill gap analyses on jobs first
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{suggestion.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          High Demand
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addToSkillDevelopment(suggestion)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={generateSuggestions}
              disabled={isGenerating}
            >
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Refresh Suggestions
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
