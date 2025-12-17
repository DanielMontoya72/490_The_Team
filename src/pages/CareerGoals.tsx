import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/layout/AppNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, TrendingUp, Award, Lightbulb, Plus, Code2, Clock, Users, Brain, ChevronRight, BookOpen } from "lucide-react";
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
    <>
      <AppNav />
      
      <div className="flex min-h-screen bg-background pt-16">
        {/* Preparation Quick Actions Sidebar - Mobile Dropdown */}
        <aside className="lg:hidden fixed left-0 top-16 right-0 bg-card/80 backdrop-blur-md border-b z-40">
          <details className="group">
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary flex-shrink-0" />
                <h3 className="font-bold text-base text-foreground">Preparation Hub</h3>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
            </summary>
            <div className="px-4 pb-4 space-y-1 bg-card border-t">
              <Link
                to="/preparation-hub"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Brain className="h-4 w-4 text-foreground transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate text-left leading-relaxed">Hub Overview</span>
              </Link>
              <Link
                to="/skill-development"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <BookOpen className="h-4 w-4 text-foreground transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate text-left leading-relaxed">Skills</span>
              </Link>
              <Link
                to="/career-goals"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg bg-primary/10 border border-primary/20 transition-colors group min-h-[40px]"
              >
                <Target className="h-4 w-4 text-primary transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-primary transition-colors truncate text-left leading-relaxed">Goals</span>
              </Link>
              <Link
                to="/mock-interview"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Users className="h-4 w-4 text-foreground transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate text-left leading-relaxed">Mock Interview</span>
              </Link>
              <Link
                to="/technical-prep"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Code2 className="h-4 w-4 text-foreground transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate text-left leading-relaxed">Technical Prep</span>
              </Link>
              <Link
                to="/productivity-analysis"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Clock className="h-4 w-4 text-foreground transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate text-left leading-relaxed">Productivity</span>
              </Link>
            </div>
          </details>
        </aside>

        {/* Preparation Quick Actions Sidebar - Desktop */}
        <aside className="hidden lg:block w-56 bg-card border-r overflow-y-auto flex-shrink-0">
          <div className="p-3 sticky top-16">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-4 w-4 text-primary flex-shrink-0" />
              <h3 className="font-bold text-base text-foreground">Preparation Hub</h3>
            </div>
            <div className="space-y-1">
              <Link
                to="/preparation-hub"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Brain className="h-4 w-4 text-foreground transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate text-left leading-relaxed">Hub Overview</span>
              </Link>
              <Link
                to="/skill-development"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <BookOpen className="h-4 w-4 text-foreground transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate text-left leading-relaxed">Skills</span>
              </Link>
              <Link
                to="/career-goals"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg bg-primary/10 border border-primary/20 transition-colors group min-h-[40px]"
              >
                <Target className="h-4 w-4 text-primary transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-primary transition-colors truncate text-left leading-relaxed">Goals</span>
              </Link>
              <Link
                to="/mock-interview"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Users className="h-4 w-4 text-foreground transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate text-left leading-relaxed">Mock Interview</span>
              </Link>
              <Link
                to="/technical-prep"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Code2 className="h-4 w-4 text-foreground transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate text-left leading-relaxed">Technical Prep</span>
              </Link>
              <Link
                to="/productivity-analysis"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Clock className="h-4 w-4 text-foreground transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate text-left leading-relaxed">Productivity</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="container mx-auto px-4 py-8 max-w-7xl lg:pt-0 pt-16">
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
        </main>
      </div>
    </>
  );
}