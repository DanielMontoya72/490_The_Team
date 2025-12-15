import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Sparkles, Edit3, MessageSquare, Code2 } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="container mx-auto px-4 py-8">
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
  );
};

export default TechnicalPrep;
