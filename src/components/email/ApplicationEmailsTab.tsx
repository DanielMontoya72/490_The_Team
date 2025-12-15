import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Link2, ExternalLink, RefreshCw, Loader2, CheckCircle2, AlertTriangle, UserCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { LinkEmailDialog } from "./LinkEmailDialog";

interface ApplicationEmailsTabProps {
  jobId: string;
  jobTitle?: string;
  companyName?: string;
}

const emailTypeConfig: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  interview_invitation: { label: "Interview", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Sparkles },
  offer: { label: "Offer", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle2 },
  rejection: { label: "Rejection", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: AlertTriangle },
  recruiter_outreach: { label: "Recruiter", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: UserCheck },
  status_update: { label: "Update", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: RefreshCw },
  follow_up: { label: "Follow-up", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: Mail },
  other: { label: "Other", color: "bg-muted text-muted-foreground", icon: Mail },
};

export function ApplicationEmailsTab({ jobId, jobTitle, companyName }: ApplicationEmailsTabProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: linkedEmails, isLoading: loadingLinked } = useQuery({
    queryKey: ["job-emails", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_emails")
        .select("*")
        .eq("job_id", jobId)
        .order("received_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: unlinkedEmails, isLoading: loadingUnlinked } = useQuery({
    queryKey: ["unlinked-emails"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("application_emails")
        .select("*")
        .eq("user_id", user.id)
        .is("job_id", null)
        .order("received_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  const applyStatusMutation = useMutation({
    mutationFn: async ({ emailId, status }: { emailId: string; status: string }) => {
      // Update job status
      const { error: jobError } = await supabase
        .from("jobs")
        .update({ status })
        .eq("id", jobId);

      if (jobError) throw jobError;

      // Mark email as processed
      const { error: emailError } = await supabase
        .from("application_emails")
        .update({ is_processed: true })
        .eq("id", emailId);

      if (emailError) throw emailError;
    },
    onSuccess: () => {
      toast.success("Job status updated based on email");
      queryClient.invalidateQueries({ queryKey: ["job-emails", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: () => {
      toast.error("Failed to update job status");
    },
  });

  const unlinkEmail = useMutation({
    mutationFn: async (emailId: string) => {
      const { error } = await supabase
        .from("application_emails")
        .update({ job_id: null })
        .eq("id", emailId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Email unlinked from job");
      queryClient.invalidateQueries({ queryKey: ["job-emails", jobId] });
      queryClient.invalidateQueries({ queryKey: ["unlinked-emails"] });
    },
    onError: () => {
      toast.error("Failed to unlink email");
    },
  });

  const isLoading = loadingLinked || loadingUnlinked;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Application Emails
          </h3>
          <p className="text-sm text-muted-foreground">
            Emails related to this job application
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setLinkDialogOpen(true)}>
          <Link2 className="h-4 w-4 mr-2" />
          Link Email
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : linkedEmails && linkedEmails.length > 0 ? (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {linkedEmails.map((email) => {
              const config = emailTypeConfig[email.email_type || "other"];
              const Icon = config.icon;

              return (
                <Card key={email.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={config.color}>
                            <Icon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {email.received_at && format(new Date(email.received_at), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                        <p className="font-medium truncate">{email.subject}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          From: {email.from_name || email.from_email}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {email.snippet}
                        </p>

                        {email.suggested_status && !email.is_processed && (
                          <div className="mt-3 p-2 bg-primary/5 border border-primary/20 rounded-md">
                            <p className="text-sm font-medium flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              Suggested: Update status to "{email.suggested_status}"
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                onClick={() => applyStatusMutation.mutate({ 
                                  emailId: email.id, 
                                  status: email.suggested_status 
                                })}
                              >
                                Apply Update
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => applyStatusMutation.mutate({ 
                                  emailId: email.id, 
                                  status: email.suggested_status 
                                })}
                              >
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unlinkEmail.mutate(email.id)}
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="font-medium">No emails linked yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Link emails from your Gmail inbox to track this application
            </p>
            <Button variant="outline" onClick={() => setLinkDialogOpen(true)}>
              <Link2 className="h-4 w-4 mr-2" />
              Link an Email
            </Button>
          </CardContent>
        </Card>
      )}

      <LinkEmailDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        jobId={jobId}
        jobTitle={jobTitle}
        companyName={companyName}
        unlinkedEmails={unlinkedEmails || []}
      />
    </div>
  );
}
