import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  AlertCircle, 
  CheckCircle, 
  Plus,
  Loader2,
  Search,
  Mail,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";

interface Gap {
  type: string;
  source: string;
  emailId?: string;
  pendingId?: string;
  subject?: string;
  snippet?: string;
  suggestedCompany?: string;
  suggestedJobTitle?: string;
  suggestedLocation?: string;
  platform?: string;
  receivedAt: string;
  fromEmail?: string;
}

export function ApplicationGapsDetector() {
  const queryClient = useQueryClient();

  const { data: gapsData, isLoading, refetch } = useQuery({
    queryKey: ["application-gaps"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("detect-application-gaps", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      return data as { gaps: Gap[]; summary: { totalGaps: number; pendingImports: number; untrackedMentions: number } };
    }
  });

  const createFromGapMutation = useMutation({
    mutationFn: async (gap: Gap) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: newJob, error } = await supabase
        .from("jobs")
        .insert({
          user_id: user.id,
          job_title: gap.suggestedJobTitle || "Position",
          company_name: gap.suggestedCompany || "Unknown Company",
          location: gap.suggestedLocation,
          status: "applied",
          primary_platform: gap.platform || "other"
        })
        .select()
        .single();

      if (error) throw error;

      // Add platform entry
      await supabase.from("application_platforms").insert({
        user_id: user.id,
        job_id: newJob.id,
        platform_name: gap.platform || "other",
        is_primary: true,
        imported_from_email: true
      });

      // Link email if available
      if (gap.emailId) {
        await supabase
          .from("application_emails")
          .update({ job_id: newJob.id })
          .eq("id", gap.emailId);
      }

      // Update pending import if applicable
      if (gap.pendingId) {
        await supabase
          .from("pending_application_imports")
          .update({ 
            import_status: "approved",
            matched_job_id: newJob.id
          })
          .eq("id", gap.pendingId);
      }

      return newJob;
    },
    onSuccess: () => {
      toast.success("Application created from gap");
      queryClient.invalidateQueries({ queryKey: ["application-gaps"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["platform-applications"] });
    },
    onError: (error) => {
      toast.error("Failed to create application");
      console.error(error);
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const gaps = gapsData?.gaps || [];
  const summary = gapsData?.summary || { totalGaps: 0, pendingImports: 0, untrackedMentions: 0 };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Gap Detection
              </CardTitle>
              <CardDescription>
                Find applications you may have forgotten to log
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Scan Again
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg border bg-card text-center">
              <div className="text-2xl font-bold">{summary.totalGaps}</div>
              <p className="text-sm text-muted-foreground">Potential Gaps</p>
            </div>
            <div className="p-4 rounded-lg border bg-card text-center">
              <div className="text-2xl font-bold">{summary.pendingImports}</div>
              <p className="text-sm text-muted-foreground">Pending Imports</p>
            </div>
            <div className="p-4 rounded-lg border bg-card text-center">
              <div className="text-2xl font-bold">{summary.untrackedMentions}</div>
              <p className="text-sm text-muted-foreground">Untracked Mentions</p>
            </div>
          </div>

          {gaps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="font-semibold text-lg">No gaps detected!</h3>
              <p className="text-muted-foreground">
                Your application history appears complete. We'll keep scanning your emails for new applications.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {gaps.map((gap, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-amber-500/10">
                      {gap.type === "pending_import" ? (
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                      ) : (
                        <Mail className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {gap.suggestedJobTitle || gap.suggestedCompany || "Unknown Application"}
                      </p>
                      {gap.suggestedCompany && gap.suggestedJobTitle && (
                        <p className="text-sm text-muted-foreground">
                          at {gap.suggestedCompany}
                          {gap.suggestedLocation && ` • ${gap.suggestedLocation}`}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {gap.subject && `"${gap.subject.substring(0, 50)}..."`}
                        {gap.receivedAt && ` • ${format(new Date(gap.receivedAt), "MMM d, yyyy")}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {gap.type === "pending_import" ? gap.platform : "Email Mention"}
                    </Badge>
                    <Button 
                      size="sm"
                      onClick={() => createFromGapMutation.mutate(gap)}
                      disabled={createFromGapMutation.isPending}
                    >
                      {createFromGapMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-1" />
                      )}
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
