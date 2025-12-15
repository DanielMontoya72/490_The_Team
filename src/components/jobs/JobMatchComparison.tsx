import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BarChart, Download, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function JobMatchComparison() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: comparisons, isLoading } = useQuery({
    queryKey: ['job-match-comparisons'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get all latest analyses for non-archived jobs
      const { data, error } = await supabase
        .from('job_match_analyses')
        .select(`
          *,
          jobs!inner(
            id,
            job_title,
            company_name,
            status,
            is_archived
          )
        `)
        .eq('user_id', user.id)
        .eq('jobs.is_archived', false)
        .order('overall_score', { ascending: false });

      if (error) throw error;

      // Group by job_id and get the latest for each
      const latestByJob = new Map();
      data?.forEach(item => {
        const jobId = (item.jobs as any).id;
        const existing = latestByJob.get(jobId);
        if (!existing || new Date(item.created_at) > new Date(existing.created_at)) {
          latestByJob.set(jobId, item);
        }
      });

      return Array.from(latestByJob.values());
    },
  });

  const handleExport = () => {
    if (!comparisons) return;

    const exportData = comparisons.map((comp: any) => ({
      jobTitle: comp.jobs.job_title,
      company: comp.jobs.company_name,
      overallScore: comp.overall_score,
      skillsScore: comp.skills_score,
      experienceScore: comp.experience_score,
      educationScore: comp.education_score,
      status: comp.jobs.status,
      analyzedAt: new Date(comp.created_at).toLocaleString(),
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-match-comparison-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Comparison Exported",
      description: "Match comparison data has been exported successfully.",
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!comparisons || comparisons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Job Match Comparison
          </CardTitle>
          <CardDescription>
            Compare match scores across all your job applications
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <BarChart className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No match analyses available</p>
          <p className="text-sm">Analyze jobs to compare their match scores</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Job Match Comparison
            </CardTitle>
            <CardDescription>
              Compare match scores across {comparisons.length} job{comparisons.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {comparisons.map((comp: any) => (
            <div 
              key={comp.id} 
              className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => navigate(`/jobs?jobId=${comp.jobs.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold">{comp.jobs.job_title}</h4>
                  <p className="text-sm text-muted-foreground">{comp.jobs.company_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn("text-2xl font-bold", getScoreColor(comp.overall_score))}>
                    {comp.overall_score}%
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Skills</p>
                  <Progress value={comp.skills_score} className="h-2" />
                  <p className="text-xs font-medium mt-1">{comp.skills_score}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Experience</p>
                  <Progress value={comp.experience_score} className="h-2" />
                  <p className="text-xs font-medium mt-1">{comp.experience_score}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Education</p>
                  <Progress value={comp.education_score} className="h-2" />
                  <p className="text-xs font-medium mt-1">{comp.education_score}%</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline">{comp.jobs.status}</Badge>
                <span className="text-xs text-muted-foreground">
                  Analyzed {new Date(comp.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
