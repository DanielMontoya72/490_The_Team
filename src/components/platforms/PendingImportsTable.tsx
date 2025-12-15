import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  CheckCircle, 
  XCircle, 
  Edit2, 
  Linkedin, 
  FileText, 
  Building2,
  Globe,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="h-4 w-4" />,
  indeed: <FileText className="h-4 w-4" />,
  glassdoor: <Building2 className="h-4 w-4" />,
  ziprecruiter: <Globe className="h-4 w-4" />,
};

interface PendingImport {
  id: string;
  platform_name: string;
  job_title: string | null;
  company_name: string | null;
  location: string | null;
  status: string | null;
  created_at: string | null;
}

export function PendingImportsTable() {
  const [editingImport, setEditingImport] = useState<PendingImport | null>(null);
  const [editedData, setEditedData] = useState({
    jobTitle: "",
    company: "",
    location: "",
    status: "applied"
  });
  const queryClient = useQueryClient();

  const { data: pendingImports, isLoading } = useQuery({
    queryKey: ["pending-imports"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("pending_application_imports")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PendingImport[];
    }
  });

  const approveMutation = useMutation({
    mutationFn: async ({ importId, jobData }: { importId: string; jobData: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create new job
      const { data: newJob, error: jobError } = await supabase
        .from("jobs")
        .insert({
          user_id: user.id,
          job_title: jobData.jobTitle,
          company_name: jobData.company,
          location: jobData.location,
          status: jobData.status,
          primary_platform: jobData.platform
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Add platform entry
      await supabase.from("application_platforms").insert({
        user_id: user.id,
        job_id: newJob.id,
        platform_name: jobData.platform,
        is_primary: true,
        imported_from_email: true
      });

      // Update pending import status
      await supabase
        .from("pending_application_imports")
        .update({ 
          status: "approved",
          matched_job_id: newJob.id
        })
        .eq("id", importId);

      return { jobId: newJob.id };
    },
    onSuccess: () => {
      toast.success("Application imported successfully");
      queryClient.invalidateQueries({ queryKey: ["pending-imports"] });
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setEditingImport(null);
    },
    onError: (error) => {
      toast.error("Failed to import application");
      console.error(error);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (importId: string) => {
      await supabase
        .from("pending_application_imports")
        .update({ status: "rejected" })
        .eq("id", importId);
    },
    onSuccess: () => {
      toast.success("Import rejected");
      queryClient.invalidateQueries({ queryKey: ["pending-imports"] });
    }
  });

  const handleEdit = (item: PendingImport) => {
    setEditingImport(item);
    setEditedData({
      jobTitle: item.job_title || "",
      company: item.company_name || "",
      location: item.location || "",
      status: "applied"
    });
  };

  const handleApprove = () => {
    if (!editingImport) return;
    
    approveMutation.mutate({
      importId: editingImport.id,
      jobData: {
        ...editedData,
        platform: editingImport.platform_name
      }
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!pendingImports?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="font-semibold text-lg">All caught up!</h3>
          <p className="text-muted-foreground">
            No pending imports to review.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Imports</CardTitle>
          <CardDescription>
            Review and approve applications detected from platform emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingImports.map((item) => (
              <div 
                key={item.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-full bg-muted">
                    {PLATFORM_ICONS[item.platform_name] || <Globe className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium">
                      {item.job_title || "Unknown Position"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.company_name || "Unknown Company"}
                      {item.location && ` • ${item.location}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {item.platform_name}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-green-600"
                    onClick={() => {
                      handleEdit(item);
                      setTimeout(handleApprove, 100);
                    }}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-destructive"
                    onClick={() => rejectMutation.mutate(item.id)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingImport} onOpenChange={() => setEditingImport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Import Details</DialogTitle>
            <DialogDescription>
              Review and correct the extracted job details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input
                value={editedData.jobTitle}
                onChange={(e) => setEditedData(prev => ({ ...prev, jobTitle: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                value={editedData.company}
                onChange={(e) => setEditedData(prev => ({ ...prev, company: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={editedData.location}
                onChange={(e) => setEditedData(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editedData.status} onValueChange={(v) => setEditedData(prev => ({ ...prev, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="phone_screen">Phone Screen</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingImport(null)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={!editedData.jobTitle || approveMutation.isPending}>
              {approveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
