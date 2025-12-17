import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppNav } from "@/components/layout/AppNav";
import { PreparationSidebar } from "@/components/layout/PreparationSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, BookOpen, Code2, MessageSquare, TrendingUp, 
  Clock, Calendar, Trophy, Zap, Brain, Network, Users, 
  ChevronRight, Sparkles, Award, Timer, Plus
} from "lucide-react";

// Import existing components
import { TechnicalPrepDashboard } from "@/components/jobs/TechnicalPrepDashboard";
import { JobBasedTechnicalPrep } from "@/components/jobs/JobBasedTechnicalPrep";
import { InterviewQuestionBank } from "@/components/jobs/InterviewQuestionBank";
import { SkillsManagement } from "@/components/profile/SkillsManagement";
import { TimeTrackingWidget } from "@/components/productivity/TimeTrackingWidget";
import { ProductivityInsights } from "@/components/productivity/ProductivityInsights";
import { MockInterviewSession } from "@/components/jobs/MockInterviewSession";
import { SkillDevelopmentProgress } from "@/components/jobs/SkillDevelopmentProgress";
import { CreateGoalDialog } from "@/components/goals/CreateGoalDialog";
import { GoalsList } from "@/components/goals/GoalsList";
import { GoalProgressChart } from "@/components/goals/GoalProgressChart";
import { AchievementsList } from "@/components/goals/AchievementsList";
import { GoalInsights } from "@/components/goals/GoalInsights";
import { SuggestedGoals } from "@/components/goals/SuggestedGoals";

// Response Library components
import { ResponseLibraryList } from "@/components/responses/ResponseLibraryList";
import { ResponsePracticeMode } from "@/components/responses/ResponsePracticeMode";
import { ResponseGapAnalysis } from "@/components/responses/ResponseGapAnalysis";
import { ResponseExport } from "@/components/responses/ResponseExport";
import { ResponseSuggestions } from "@/components/responses/ResponseSuggestions";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function PreparationHub() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || "overview");
  const [createGoalDialogOpen, setCreateGoalDialogOpen] = useState(false);
  const [prefilledGoal, setPrefilledGoal] = useState<any>(null);

  // Update activeTab when URL parameter changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: goals } = useQuery({
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
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: jobs } = useQuery({
    queryKey: ['active-jobs-for-prep'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_title, company_name, status')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: timeEntries } = useQuery({
    queryKey: ['time-entries', user?.id, 7],
    enabled: !!user?.id,
    queryFn: async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from('time_tracking_entries')
        .select('*')
        .eq('user_id', user!.id)
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <AppNav />
      
      <div className="flex min-h-screen bg-background pt-16">
        <PreparationSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Main Content */}
        <main className="flex-1 overflow-hidden lg:ml-56">
          <div className="h-full overflow-y-auto">
            <div className="container mx-auto px-4 py-8 max-w-7xl lg:pt-0 pt-16">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <Brain className="h-8 w-8 text-primary" />
                  <h1 className="text-4xl font-bold">Preparation Hub</h1>
                </div>
                <p className="text-muted-foreground text-lg">
                  Your central command center for interview preparation, skill development, and career growth
                </p>
              </div>

              <div className="space-y-6">
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    {/* Quick Stats */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <Card className="border-2 border-blue-200 dark:border-blue-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
                          <Target className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-blue-600">{goals?.filter(g => g.status === 'in_progress').length || 0}</div>
                          <p className="text-xs text-muted-foreground">In progress</p>
                        </CardContent>
                      </Card>

                      <Card className="border-2 border-green-200 dark:border-green-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                          <Trophy className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">{jobs?.length || 0}</div>
                          <p className="text-xs text-muted-foreground">Applications</p>
                        </CardContent>
                      </Card>

                      <Card className="border-2 border-purple-200 dark:border-purple-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">This Week</CardTitle>
                          <Clock className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-purple-600">
                            {Math.floor((timeEntries?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0) / 60)}h
                          </div>
                          <p className="text-xs text-muted-foreground">Prep time</p>
                        </CardContent>
                      </Card>

                      <Card className="border-2 border-orange-200 dark:border-orange-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Streak</CardTitle>
                          <Award className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-orange-600">7</div>
                          <p className="text-xs text-muted-foreground">Day streak</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab("mock-interview")}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Start Mock Interview
                          </CardTitle>
                          <CardDescription>
                            Practice with AI-powered interview simulations
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button variant="outline" className="w-full">
                            Begin Session
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab("technical")}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Code2 className="h-5 w-5 text-primary" />
                            Technical Challenge
                          </CardTitle>
                          <CardDescription>
                            Solve coding problems and system design questions
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button variant="outline" className="w-full">
                            Start Challenge
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab("skills")}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            Skill Assessment
                          </CardTitle>
                          <CardDescription>
                            Identify gaps and track your learning progress
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button variant="outline" className="w-full">
                            Assess Skills
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Recent Activity */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Preparation Activity</CardTitle>
                        <CardDescription>Your latest preparation sessions and progress</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {timeEntries && timeEntries.length > 0 ? (
                          <div className="space-y-4">
                            {timeEntries.slice(0, 5).map((entry, index) => (
                              <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                                  <div>
                                    <p className="font-medium">{entry.activity_title || 'Untitled Activity'}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {entry.activity_type} • {Math.floor((entry.duration_minutes || 0) / 60)}h {(entry.duration_minutes || 0) % 60}m
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="outline">
                                  {new Date(entry.started_at).toLocaleDateString()}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Timer className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No preparation activity yet</p>
                            <Button 
                              variant="outline" 
                              className="mt-4"
                              onClick={() => setActiveTab("productivity")}
                            >
                              Start Tracking
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === "skills" && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-6 w-6 text-primary" />
                          Skill Development
                        </CardTitle>
                        <CardDescription>
                          Track your learning progress and identify skill trends across opportunities
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <SkillDevelopmentProgress />
                    {user && <SkillsManagement userId={user.id} />}
                  </div>
                )}

                {activeTab === "goals" && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Target className="h-6 w-6 text-primary" />
                              Career Goals
                            </CardTitle>
                            <CardDescription>
                              Track your career objectives and milestones
                            </CardDescription>
                          </div>
                          <Button onClick={() => setCreateGoalDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Goal
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                    
                    <div className="space-y-6">
                      <Tabs defaultValue="goals" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                          <TabsTrigger value="goals" className="text-xs sm:text-sm px-1 sm:px-2">My Goals</TabsTrigger>
                          <TabsTrigger value="progress" className="text-xs sm:text-sm px-1 sm:px-2">Progress</TabsTrigger>
                          <TabsTrigger value="achievements" className="text-xs sm:text-sm px-1 sm:px-2">Achievements</TabsTrigger>
                          <TabsTrigger value="suggested" className="text-xs sm:text-sm px-1 sm:px-2">Suggested</TabsTrigger>
                        </TabsList>

                        <TabsContent value="goals" className="space-y-4 mt-4">
                          <GoalsList 
                            goals={goals || []} 
                            isLoading={false} 
                            onCreateGoal={() => setCreateGoalDialogOpen(true)}
                          />
                        </TabsContent>

                        <TabsContent value="progress" className="space-y-4 mt-4">
                          <GoalProgressChart goals={goals || []} />
                        </TabsContent>

                        <TabsContent value="achievements" className="space-y-4 mt-4">
                          <AchievementsList achievements={achievements || []} />
                        </TabsContent>

                        <TabsContent value="suggested" className="space-y-4 mt-4">
                          <SuggestedGoals onSelectGoal={(goal) => {
                            setPrefilledGoal(goal);
                            setCreateGoalDialogOpen(true);
                          }} />
                        </TabsContent>
                      </Tabs>
                    </div>
                    
                    <CreateGoalDialog 
                      open={createGoalDialogOpen} 
                      onOpenChange={(open) => {
                        setCreateGoalDialogOpen(open);
                        if (!open) setPrefilledGoal(null);
                      }}
                      prefilledData={prefilledGoal}
                    />
                  </div>
                )}

                {activeTab === "mock-interview" && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-6 w-6 text-primary" />
                          Mock Interview Sessions
                        </CardTitle>
                        <CardDescription>
                          Practice interviews with AI feedback and coaching
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <MockInterviewSession />
                  </div>
                )}

                {activeTab === "progress" && (
                  <div className="space-y-6">
                    <TechnicalPrepDashboard />
                  </div>
                )}

                {activeTab === "technical" && (
                  <div className="space-y-6">
                    <JobBasedTechnicalPrep />
                    
                    {jobs && jobs.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Interview Questions by Job</CardTitle>
                          <CardDescription>Practice questions tailored to your applications</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {jobs.map((job: any) => (
                              <div key={job.id} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <div>
                                    <h3 className="font-semibold">{job.job_title}</h3>
                                    <p className="text-sm text-muted-foreground">{job.company_name}</p>
                                  </div>
                                  <Badge variant="outline">{job.status}</Badge>
                                </div>
                                <InterviewQuestionBank jobId={job.id} />
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {activeTab === "productivity" && (
                  <div className="space-y-6">
                    <TimeTrackingWidget />
                    
                    {timeEntries && timeEntries.length > 5 && (
                      <ProductivityInsights 
                        insights={[]}
                        entries={timeEntries}
                        metrics={[]}
                      />
                    )}
                  </div>
                )}

                {activeTab === "responses" && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="h-6 w-6 text-primary" />
                          Interview Response Library
                        </CardTitle>
                        <CardDescription>
                          Build and refine your best interview responses over time
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    
                    <div className="space-y-6">
                      <Tabs defaultValue="library" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                          <TabsTrigger value="library" className="flex items-center gap-2 text-xs sm:text-sm px-1 sm:px-2">
                            <BookOpen className="h-4 w-4 hidden sm:inline" />
                            Library
                          </TabsTrigger>
                          <TabsTrigger value="suggestions" className="flex items-center gap-2 text-xs sm:text-sm px-1 sm:px-2">
                            <Sparkles className="h-4 w-4 hidden sm:inline" />
                            Suggest
                          </TabsTrigger>
                          <TabsTrigger value="practice" className="flex items-center gap-2 text-xs sm:text-sm px-1 sm:px-2">
                            <Target className="h-4 w-4 hidden sm:inline" />
                            Practice
                          </TabsTrigger>
                          <TabsTrigger value="gaps" className="flex items-center gap-2 text-xs sm:text-sm px-1 sm:px-2">
                            <TrendingUp className="h-4 w-4 hidden sm:inline" />
                            Gaps
                          </TabsTrigger>
                          <TabsTrigger value="export" className="flex items-center gap-2 text-xs sm:text-sm px-1 sm:px-2">
                            <Trophy className="h-4 w-4 hidden sm:inline" />
                            Export
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="library" className="space-y-4 mt-4">
                          <ResponseLibraryList />
                        </TabsContent>

                        <TabsContent value="suggestions" className="space-y-4 mt-4">
                          <ResponseSuggestions />
                        </TabsContent>

                        <TabsContent value="practice" className="space-y-4 mt-4">
                          <ResponsePracticeMode />
                        </TabsContent>

                        <TabsContent value="gaps" className="space-y-4 mt-4">
                          <ResponseGapAnalysis />
                        </TabsContent>

                        <TabsContent value="export" className="space-y-4 mt-4">
                          <ResponseExport />
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}