import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/layout/AppNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, TrendingUp, Award, Lightbulb, Plus } from "lucide-react";
import { toast } from "sonner";
import { CreateGoalDialog } from "@/components/goals/CreateGoalDialog";
import { GoalsList } from "@/components/goals/GoalsList";
import { GoalProgressChart } from "@/components/goals/GoalProgressChart";
import { AchievementsList } from "@/components/goals/AchievementsList";
import { GoalInsights } from "@/components/goals/GoalInsights";
import { SuggestedGoals } from "@/components/goals/SuggestedGoals";
import { Loader2 } from "lucide-react";

export default function CareerGoals() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [prefilledGoal, setPrefilledGoal] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['career-goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('career_goals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: achievements } = useQuery({
    queryKey: ['goal-achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goal_achievements')
        .select('*')
        .order('achievement_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: insights } = useQuery({
    queryKey: ['goal-insights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goal_insights')
        .select('*')
        .eq('acknowledged', false)
        .order('generated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const activeGoals = goals?.filter(g => g.status === 'active' || g.status === 'in_progress') || [];
  const completedGoals = goals?.filter(g => g.status === 'completed') || [];

  const handleSelectSuggestedGoal = (goal: any) => {
    setPrefilledGoal({
      goal_title: goal.title,
      goal_description: goal.description,
      goal_type: goal.type,
      category: goal.category,
      priority: goal.priority,
      specific_metric: goal.metric,
      target_date: ""
    });
    setCreateDialogOpen(true);
  };

  const generateInsights = async () => {
    setGeneratingInsights(true);
    try {
      await supabase.functions.invoke('generate-goal-insights');
      queryClient.invalidateQueries({ queryKey: ['goal-insights'] });
      toast.success("Insights generated successfully");
    } catch (error) {
      toast.error("Failed to generate insights");
      console.error(error);
    } finally {
      setGeneratingInsights(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
              <Target className="h-10 w-10 text-primary" />
              Career Goals
            </h1>
            <p className="text-muted-foreground mt-2">
              Set, track, and achieve your career objectives
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            New Goal
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeGoals.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{completedGoals.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-500">{achievements?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">New Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-500">{insights?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="goals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="suggested" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Suggested
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Progress
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="goals" className="space-y-4">
            <GoalsList 
              goals={goals || []} 
              isLoading={goalsLoading} 
              onCreateGoal={() => setCreateDialogOpen(true)}
            />
          </TabsContent>

          <TabsContent value="suggested" className="space-y-4">
            <SuggestedGoals onSelectGoal={handleSelectSuggestedGoal} />
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <GoalProgressChart goals={goals || []} />
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <AchievementsList achievements={achievements || []} />
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button 
                onClick={generateInsights} 
                disabled={generatingInsights || !goals || goals.length === 0}
              >
                {generatingInsights ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Insights...
                  </>
                ) : (
                  <>
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Generate New Insights
                  </>
                )}
              </Button>
            </div>
            <GoalInsights insights={insights || []} goals={goals || []} />
          </TabsContent>
        </Tabs>
      </div>

      <CreateGoalDialog 
        open={createDialogOpen} 
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setPrefilledGoal(null);
        }}
        prefilledData={prefilledGoal}
      />
    </div>
  );
}