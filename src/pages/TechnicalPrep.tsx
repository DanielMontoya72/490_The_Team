import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Sparkles, Edit3, MessageSquare, Code2, Target, Clock, Users, Brain, ChevronRight, BookOpen } from "lucide-react";
import { TechnicalPrepDashboard } from "@/components/jobs/TechnicalPrepDashboard";
import { JobBasedTechnicalPrep } from "@/components/jobs/JobBasedTechnicalPrep";
import { WritingPracticeSession } from "@/components/jobs/WritingPracticeSession";
import { InterviewQuestionBank } from "@/components/jobs/InterviewQuestionBank";
import { AppNav } from "@/components/layout/AppNav";

const TechnicalPrep = () => {
  const [activeTab, setActiveTab] = useState("ai-prep");

  // Fetch active jobs for question bank
  const { data: jobs } = useQuery({
    queryKey: ['active-jobs-for-questions'],
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
                <h3 className="font-bold text-base text-white">Preparation Hub</h3>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
            </summary>
            <div className="px-4 pb-4 space-y-1 bg-card border-t">
              <Link
                to="/preparation-hub"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Brain className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Hub Overview</span>
              </Link>
              <Link
                to="/skill-development"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <BookOpen className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Skills</span>
              </Link>
              <Link
                to="/career-goals"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Target className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Goals</span>
              </Link>
              <Link
                to="/mock-interview"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Users className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Mock Interview</span>
              </Link>
              <Link
                to="/technical-prep"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg bg-primary/10 border border-primary/20 transition-colors group min-h-[40px]"
              >
                <Code2 className="h-4 w-4 text-primary transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-primary transition-colors truncate text-left leading-relaxed">Technical Prep</span>
              </Link>
              <Link
                to="/productivity-analysis"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Clock className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Productivity</span>
              </Link>
            </div>
          </details>
        </aside>

        {/* Preparation Quick Actions Sidebar - Desktop */}
        <aside className="hidden lg:block w-56 bg-card border-r overflow-y-auto flex-shrink-0">
          <div className="p-3 sticky top-16">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-4 w-4 text-primary flex-shrink-0" />
              <h3 className="font-bold text-base text-white">Preparation Hub</h3>
            </div>
            <div className="space-y-1">
              <Link
                to="/preparation-hub"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Brain className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Hub Overview</span>
              </Link>
              <Link
                to="/skill-development"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <BookOpen className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Skills</span>
              </Link>
              <Link
                to="/career-goals"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Target className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Goals</span>
              </Link>
              <Link
                to="/mock-interview"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Users className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Mock Interview</span>
              </Link>
              <Link
                to="/technical-prep"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg bg-primary/10 border border-primary/20 transition-colors group min-h-[40px]"
              >
                <Code2 className="h-4 w-4 text-primary transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-primary transition-colors truncate text-left leading-relaxed">Technical Prep</span>
              </Link>
              <Link
                to="/productivity-analysis"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Clock className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Productivity</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="container mx-auto px-4 py-8 max-w-7xl lg:pt-0 pt-16">
              <div className="flex items-center gap-3 mb-8">
                <Code2 className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold">Technical Interview Prep</h1>
                  <p className="text-muted-foreground">Practice coding challenges, system design, and case studies</p>
                </div>
              </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 h-auto">
            <TabsTrigger value="ai-prep" className="flex items-center gap-2 whitespace-nowrap px-3 py-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">AI Prep</span>
              <span className="sm:hidden">AI</span>
            </TabsTrigger>
            <TabsTrigger value="questions" className="flex items-center gap-2 whitespace-nowrap px-3 py-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Question Bank</span>
              <span className="sm:hidden">Questions</span>
            </TabsTrigger>
            <TabsTrigger value="writing-practice" className="flex items-center gap-2 whitespace-nowrap px-3 py-2">
              <Edit3 className="h-4 w-4" />
              <span className="hidden sm:inline">Writing Practice</span>
              <span className="sm:hidden">Writing</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2 whitespace-nowrap px-3 py-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Progress</span>
              <span className="sm:hidden">Progress</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai-prep">
            <JobBasedTechnicalPrep />
          </TabsContent>

          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <CardTitle>Interview Question Bank</CardTitle>
                <CardDescription>
                  Practice interview questions tailored to each of your job applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {jobs && jobs.length > 0 ? (
                  <div className="space-y-8">
                    {jobs.map((job: any) => (
                      <div key={job.id} className="border rounded-lg p-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-semibold">{job.job_title}</h3>
                            <p className="text-sm text-muted-foreground">{job.company_name}</p>
                          </div>
                          <Badge variant="outline">{job.status}</Badge>
                        </div>
                        <InterviewQuestionBank jobId={job.id} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No active jobs. Add a job to generate interview questions.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="writing-practice">
            <WritingPracticeSession />
          </TabsContent>

          <TabsContent value="dashboard">
            <TechnicalPrepDashboard />
          </TabsContent>
        </Tabs>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default TechnicalPrep;
