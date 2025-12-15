import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save } from "lucide-react";

export function MatchingPreferences() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [skillsWeight, setSkillsWeight] = useState(40);
  const [experienceWeight, setExperienceWeight] = useState(35);
  const [educationWeight, setEducationWeight] = useState(25);

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['matching-preferences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_matching_preferences')
        .select('*')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  useEffect(() => {
    if (preferences) {
      setSkillsWeight(preferences.skills_weight);
      setExperienceWeight(preferences.experience_weight);
      setEducationWeight(preferences.education_weight);
    }
  }, [preferences]);

  const savePreferences = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Ensure weights sum to 100
      const total = skillsWeight + experienceWeight + educationWeight;
      if (total !== 100) {
        throw new Error('Weights must sum to 100%');
      }

      const { data, error } = await supabase
        .from('user_matching_preferences')
        .upsert({
          user_id: user.id,
          skills_weight: skillsWeight,
          experience_weight: experienceWeight,
          education_weight: educationWeight,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matching-preferences'] });
      toast({
        title: "Preferences Saved",
        description: "Your matching weights have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleWeightChange = (category: 'skills' | 'experience' | 'education', value: number) => {
    const newValue = value;
    let remainingWeight = 100 - newValue;

    switch (category) {
      case 'skills':
        setSkillsWeight(newValue);
        // Distribute remaining weight proportionally
        const expRatio = experienceWeight / (experienceWeight + educationWeight) || 0.5;
        setExperienceWeight(Math.round(remainingWeight * expRatio));
        setEducationWeight(remainingWeight - Math.round(remainingWeight * expRatio));
        break;
      case 'experience':
        setExperienceWeight(newValue);
        const skillRatio = skillsWeight / (skillsWeight + educationWeight) || 0.5;
        setSkillsWeight(Math.round(remainingWeight * skillRatio));
        setEducationWeight(remainingWeight - Math.round(remainingWeight * skillRatio));
        break;
      case 'education':
        setEducationWeight(newValue);
        const skillRatio2 = skillsWeight / (skillsWeight + experienceWeight) || 0.5;
        setSkillsWeight(Math.round(remainingWeight * skillRatio2));
        setExperienceWeight(remainingWeight - Math.round(remainingWeight * skillRatio2));
        break;
    }
  };

  const totalWeight = skillsWeight + experienceWeight + educationWeight;
  const isValid = totalWeight === 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Matching Preferences
        </CardTitle>
        <CardDescription>
          Customize how job matches are calculated by adjusting category weights
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Skills Importance</Label>
              <span className="text-sm font-semibold">{skillsWeight}%</span>
            </div>
            <Slider
              value={[skillsWeight]}
              onValueChange={([value]) => handleWeightChange('skills', value)}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Experience Importance</Label>
              <span className="text-sm font-semibold">{experienceWeight}%</span>
            </div>
            <Slider
              value={[experienceWeight]}
              onValueChange={([value]) => handleWeightChange('experience', value)}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Education Importance</Label>
              <span className="text-sm font-semibold">{educationWeight}%</span>
            </div>
            <Slider
              value={[educationWeight]}
              onValueChange={([value]) => handleWeightChange('education', value)}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted text-sm">
          <p className="font-medium mb-1">Total Weight: {totalWeight}%</p>
          {!isValid && (
            <p className="text-destructive text-xs">Weights must sum to exactly 100%</p>
          )}
        </div>

        <Button
          onClick={() => savePreferences.mutate()}
          disabled={!isValid || savePreferences.isPending}
          className="w-full gap-2"
        >
          <Save className="h-4 w-4" />
          {savePreferences.isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}
