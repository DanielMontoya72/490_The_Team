import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, Plus, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export function ScannedEmailsList() {
  const queryClient = useQueryClient();
  const [creatingImport, setCreatingImport] = useState<string | null>(null);

  const { data: emails, isLoading } = useQuery({
    queryKey: ["scanned-emails"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("application_emails")
        .select("*")
        .eq("user_id", user.id)
        .order("received_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    }
  });

  const createPendingImport = useMutation({
    mutationFn: async (email: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Try to detect platform from email
      const fromEmail = email.from_email?.toLowerCase() || "";
      let platform = "other";
      if (fromEmail.includes("linkedin")) platform = "linkedin";
      else if (fromEmail.includes("indeed")) platform = "indeed";
      else if (fromEmail.includes("glassdoor")) platform = "glassdoor";
      else if (fromEmail.includes("ziprecruiter")) platform = "ziprecruiter";

      const { data, error } = await supabase
        .from("pending_application_imports")
        .insert({
          user_id: user.id,
          platform_name: platform,
          job_title: "Review from email",
          company_name: email.from_name || "Unknown Company",
          location: null,
          status: "pending",
          source_email_id: email.id,
          extracted_data: {
            email_subject: email.subject,
            email_from: email.from_email,
            email_snippet: email.snippet,
          },
        })
        .select()
        .single();

      if (error) throw error;

      // Mark email as processed
      await supabase
        .from("application_emails")
        .update({ is_processed: true })
        .eq("id", email.id);

      return data;
    },
    onSuccess: () => {
      toast.success("Created pending import for review");
      queryClient.invalidateQueries({ queryKey: ["scanned-emails"] });
      queryClient.invalidateQueries({ queryKey: ["pending-imports"] });
      queryClient.invalidateQueries({ queryKey: ["pending-imports-count"] });
      setCreatingImport(null);
    },
    onError: (error) => {
      toast.error("Failed to create import: " + error.message);
      setCreatingImport(null);
    }
  });

  const getEmailTypeBadge = (type: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      interview_invitation: { color: "bg-green-500", label: "Interview" },
      offer: { color: "bg-emerald-500", label: "Offer" },
      rejection: { color: "bg-red-500", label: "Rejection" },
      status_update: { color: "bg-blue-500", label: "Status Update" },
      recruiter_outreach: { color: "bg-purple-500", label: "Recruiter" },
      follow_up: { color: "bg-orange-500", label: "Follow Up" },
      other: { color: "bg-muted", label: "Other" }
    };
    const config = variants[type] || variants.other;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!emails || emails.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Scanned Emails Yet</h3>
          <p className="text-muted-foreground mb-4">
            Connect your Gmail and click "Scan Now" to import job-related emails.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Scanned Emails ({emails.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emails.map((email) => (
              <TableRow key={email.id}>
                <TableCell className="whitespace-nowrap">
                  {email.received_at ? format(new Date(email.received_at), "MMM d, yyyy") : "-"}
                </TableCell>
                <TableCell className="max-w-[150px] truncate">
                  {email.from_name || email.from_email}
                </TableCell>
                <TableCell className="max-w-[250px] truncate">
                  {email.subject}
                </TableCell>
                <TableCell>
                  {getEmailTypeBadge(email.email_type || "other")}
                </TableCell>
                <TableCell>
                  {email.is_processed ? (
                    <Badge variant="secondary">Processed</Badge>
                  ) : email.job_id ? (
                    <Badge variant="secondary">Linked</Badge>
                  ) : (
                    <Badge variant="outline">Unprocessed</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {!email.is_processed && !email.job_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={creatingImport === email.id}
                      onClick={() => {
                        setCreatingImport(email.id);
                        createPendingImport.mutate(email);
                      }}
                    >
                      {creatingImport === email.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Create Import
                        </>
                      )}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
