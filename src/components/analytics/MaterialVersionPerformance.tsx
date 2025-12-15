import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FileText, Award, TrendingUp, TrendingDown } from "lucide-react";

export function MaterialVersionPerformance() {
  // Fetch resumes with their usage in application packages
  const { data: resumes = [], isLoading: resumesLoading } = useQuery({
    queryKey: ["material-performance-resumes"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      
      const { data, error } = await supabase
        .from("resumes")
        .select("id, resume_name, version_number, created_at")
        .eq("user_id", session.user.id);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch application packages with job outcomes
  const { data: packages = [] } = useQuery({
    queryKey: ["material-performance-packages"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      
      const { data, error } = await supabase
        .from("application_packages")
        .select("*, jobs(status, company_name)")
        .eq("user_id", session.user.id);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch cover letters
  const { data: coverLetters = [] } = useQuery({
    queryKey: ["material-performance-cl"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      
      const { data, error } = await supabase
        .from("application_materials")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("material_type", "cover_letter");
      
      if (error) throw error;
      return data || [];
    },
  });

  const successfulStatuses = ["Offer Received", "Accepted"];
  const interviewStatuses = ["Interview Scheduled", "Interviewing", "Offer Received", "Accepted"];

  // Calculate resume performance
  const resumePerformance = resumes.map((resume: any) => {
    const usedIn = packages.filter(p => p.resume_id === resume.id);
    const successCount = usedIn.filter(p => p.jobs && successfulStatuses.includes(p.jobs.status)).length;
    const interviewCount = usedIn.filter(p => p.jobs && interviewStatuses.includes(p.jobs.status)).length;
    
    return {
      id: resume.id,
      name: resume.resume_name || `Version ${resume.version_number}`,
      version: resume.version_number,
      usageCount: usedIn.length,
      successRate: usedIn.length > 0 ? (successCount / usedIn.length) * 100 : 0,
      interviewRate: usedIn.length > 0 ? (interviewCount / usedIn.length) * 100 : 0,
      successCount,
      interviewCount,
    };
  }).filter(r => r.usageCount > 0).sort((a, b) => b.interviewRate - a.interviewRate);

  // Calculate cover letter performance
  const clPerformance = coverLetters.map(cl => {
    const usedIn = packages.filter(p => p.cover_letter_id === cl.id);
    const successCount = usedIn.filter(p => p.jobs && successfulStatuses.includes(p.jobs.status)).length;
    const interviewCount = usedIn.filter(p => p.jobs && interviewStatuses.includes(p.jobs.status)).length;
    
    return {
      id: cl.id,
      name: cl.version_name || cl.file_name,
      usageCount: usedIn.length,
      successRate: usedIn.length > 0 ? (successCount / usedIn.length) * 100 : 0,
      interviewRate: usedIn.length > 0 ? (interviewCount / usedIn.length) * 100 : 0,
      successCount,
      interviewCount,
    };
  }).filter(c => c.usageCount > 0).sort((a, b) => b.interviewRate - a.interviewRate);

  const bestResume = resumePerformance[0];
  const bestCoverLetter = clPerformance[0];

  if (resumesLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const chartData = resumePerformance.slice(0, 5).map(r => ({
    name: r.name.length > 15 ? r.name.substring(0, 15) + "..." : r.name,
    "Interview Rate": r.interviewRate,
    "Success Rate": r.successRate,
    "Times Used": r.usageCount,
  }));

  return (
    <div className="space-y-4">
      {/* Best Performers */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-green-500" />
              Best Performing Resume
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestResume ? (
              <>
                <div className="text-lg font-bold truncate">{bestResume.name}</div>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <span className="text-2xl font-bold text-green-600">{bestResume.interviewRate.toFixed(0)}%</span>
                    <p className="text-xs text-muted-foreground">Interview Rate</p>
                  </div>
                  <div>
                    <span className="text-lg font-semibold">{bestResume.usageCount}</span>
                    <p className="text-xs text-muted-foreground">Times Used</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No resume data yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-blue-500" />
              Best Performing Cover Letter
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestCoverLetter ? (
              <>
                <div className="text-lg font-bold truncate">{bestCoverLetter.name}</div>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <span className="text-2xl font-bold text-blue-600">{bestCoverLetter.interviewRate.toFixed(0)}%</span>
                    <p className="text-xs text-muted-foreground">Interview Rate</p>
                  </div>
                  <div>
                    <span className="text-lg font-semibold">{bestCoverLetter.usageCount}</span>
                    <p className="text-xs text-muted-foreground">Times Used</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No cover letter data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resume Version Comparison Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resume Version Comparison
            </CardTitle>
            <CardDescription>
              Compare interview and success rates across your resume versions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))' 
                  }} 
                />
                <Legend />
                <Bar dataKey="Interview Rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Success Rate" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* All Versions List */}
      <Card>
        <CardHeader>
          <CardTitle>All Resume Versions</CardTitle>
        </CardHeader>
        <CardContent>
          {resumePerformance.length > 0 ? (
            <div className="space-y-3">
              {resumePerformance.map((resume, index) => (
                <div key={resume.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                    <div>
                      <p className="font-medium">{resume.name}</p>
                      <p className="text-xs text-muted-foreground">Used {resume.usageCount} times</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">{resume.interviewRate.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">Interview</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{resume.successRate.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">Success</p>
                    </div>
                    {index === 0 && <Badge className="bg-green-500">Best</Badge>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No resume usage data yet. Link resumes to job applications to track performance.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
