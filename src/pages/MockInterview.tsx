import { AppNav } from "@/components/layout/AppNav";
import { PreparationSidebar } from "@/components/layout/PreparationSidebar";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Calendar, Target, Code2, Clock, Users, Brain, ChevronRight, BookOpen } from "lucide-react";
import { MockInterviewSession } from "@/components/jobs/MockInterviewSession";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function MockInterview() {
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  const { data: jobs } = useQuery({
    queryKey: ['jobs-for-mock-interviews'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const selectedJob = jobs?.find(job => job.id === selectedJobId) || jobs?.[0];

  return (
    <>
      <AppNav />
      
      <div className="flex min-h-screen bg-background pt-16">
        <PreparationSidebar activeTab="mock-interview" />
        
        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden lg:ml-56">
          <div className="h-full overflow-y-auto">
            <div className="container mx-auto px-4 py-8 max-w-7xl lg:pt-0 pt-16">
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Mock Interview Sessions</h1>
                <p className="text-muted-foreground">
                  Practice interviews for your job applications
                </p>
              </div>

        {jobs && jobs.length > 0 ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select a Job</CardTitle>
                <CardDescription>Choose the position you'd like to practice for</CardDescription>
              </CardHeader>
              <CardContent>
                <Select 
                  value={selectedJobId || jobs[0]?.id} 
                  onValueChange={setSelectedJobId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a job position" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          <span className="font-medium">{job.job_title}</span>
                          <span className="text-muted-foreground">at {job.company_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedJob && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    {selectedJob.job_title}
                  </CardTitle>
                  <CardDescription>
                    {selectedJob.company_name}
                    {selectedJob.application_deadline && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Deadline: {new Date(selectedJob.application_deadline).toLocaleDateString()}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MockInterviewSession jobId={selectedJob.id} />
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No Active Jobs</p>
              <p className="text-sm text-muted-foreground">
                Add jobs to your pipeline to start practicing mock interviews
              </p>
            </CardContent>
          </Card>
        )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
