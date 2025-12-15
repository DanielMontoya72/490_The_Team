import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, TrendingUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function MentorProgressReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generatingReport, setGeneratingReport] = useState(false);

  const { data: relationships } = useQuery({
    queryKey: ['mentor-relationships'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('mentor_relationships')
        .select('*')
        .eq('mentee_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      return data;
    }
  });

  const { data: reports, isLoading } = useQuery({
    queryKey: ['mentor-progress-reports'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('mentor_progress_reports')
        .select('*')
        .eq('mentee_id', user.id)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const generateReport = async () => {
    if (!relationships || relationships.length === 0) {
      toast({
        title: "No active mentors",
        description: "You need to have at least one active mentor to generate a report.",
        variant: "destructive"
      });
      return;
    }

    setGeneratingReport(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days

      const { error } = await supabase.functions.invoke('generate-mentor-progress-report', {
        body: {
          relationshipId: relationships[0].id,
          menteeId: user.id,
          periodStart: startDate.toISOString(),
          periodEnd: endDate.toISOString()
        }
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['mentor-progress-reports'] });
      toast({
        title: "Report generated",
        description: "Your weekly progress report has been created."
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Failed to generate report",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  if (isLoading) {
    return <div>Loading reports...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Progress Reports</h3>
          <p className="text-sm text-muted-foreground">
            Automatic weekly summaries of your job search progress
          </p>
        </div>
        <Button onClick={generateReport} disabled={generatingReport}>
          {generatingReport ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Calendar className="mr-2 h-4 w-4" />
          )}
          Generate Weekly Report
        </Button>
      </div>

      {reports && reports.length > 0 ? (
        reports.map((report) => {
          const reportData = report.report_data as any;
          return (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {new Date(reportData.period.start).toLocaleDateString()} - {' '}
                      {new Date(reportData.period.end).toLocaleDateString()}
                    </CardTitle>
                    <CardDescription>{report.summary}</CardDescription>
                  </div>
                  {report.viewed_by_mentor_at && (
                    <Badge variant="outline">
                      Viewed by mentor
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Jobs Added</p>
                    <p className="text-2xl font-bold">{reportData.jobsAdded}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Interviews</p>
                    <p className="text-2xl font-bold">{reportData.interviewsScheduled}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Applications</p>
                    <p className="text-2xl font-bold">{reportData.totalApplications}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Response Rate</p>
                    <p className="text-2xl font-bold">{reportData.responseRate.toFixed(0)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No progress reports yet. Generate your first weekly report!
          </CardContent>
        </Card>
      )}
    </div>
  );
}
