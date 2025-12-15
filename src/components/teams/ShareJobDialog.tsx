import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Briefcase, Link, Loader2 } from "lucide-react";

interface Job {
  id: string;
  job_title: string;
  company_name: string;
  status: string;
}

interface ShareJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  onShared: () => void;
}

export const ShareJobDialog = ({ open, onOpenChange, teamId, onShared }: ShareJobDialogProps) => {
  const [activeTab, setActiveTab] = useState<"my-jobs" | "external-link">("my-jobs");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingJobs, setFetchingJobs] = useState(true);

  // External link fields
  const [externalUrl, setExternalUrl] = useState("");
  const [externalTitle, setExternalTitle] = useState("");
  const [externalCompany, setExternalCompany] = useState("");

  useEffect(() => {
    if (open) {
      fetchUserJobs();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setSelectedJobId("");
    setNotes("");
    setExternalUrl("");
    setExternalTitle("");
    setExternalCompany("");
  };

  const fetchUserJobs = async () => {
    setFetchingJobs(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sharedJobs } = await supabase
        .from("team_shared_jobs")
        .select("job_id")
        .eq("team_id", teamId);

      const sharedJobIds = sharedJobs?.map(sj => sj.job_id) || [];

      const { data, error } = await supabase
        .from("jobs")
        .select("id, job_title, company_name, status")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const availableJobs = (data || []).filter(job => !sharedJobIds.includes(job.id));
      setJobs(availableJobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Failed to load jobs");
    } finally {
      setFetchingJobs(false);
    }
  };

  const handleShareMyJob = async () => {
    if (!selectedJobId) {
      toast.error("Please select a job to share");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("team_shared_jobs")
        .insert({
          team_id: teamId,
          job_id: selectedJobId,
          shared_by: user.id,
          notes: notes || null,
        });

      if (error) throw error;

      toast.success("Job shared with team!");
      onShared();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sharing job:", error);
      toast.error(error.message || "Failed to share job");
    } finally {
      setLoading(false);
    }
  };

  const handleShareExternalLink = async () => {
    if (!externalUrl.trim()) {
      toast.error("Please enter a job posting URL");
      return;
    }
    if (!externalTitle.trim()) {
      toast.error("Please enter a job title");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("team_shared_links")
        .insert({
          team_id: teamId,
          shared_by: user.id,
          job_title: externalTitle.trim(),
          company_name: externalCompany.trim() || null,
          job_url: externalUrl.trim(),
          notes: notes || null,
        });

      if (error) throw error;

      toast.success("Job link shared with team!");
      onShared();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sharing link:", error);
      toast.error(error.message || "Failed to share link");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (activeTab === "my-jobs") {
      handleShareMyJob();
    } else {
      handleShareExternalLink();
    }
  };

  const canShare = activeTab === "my-jobs" 
    ? !!selectedJobId 
    : !!externalUrl.trim() && !!externalTitle.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Share Job with Team
          </DialogTitle>
          <DialogDescription>
            Share a job posting with your team for collaborative feedback.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "my-jobs" | "external-link")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-jobs" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              My Jobs
            </TabsTrigger>
            <TabsTrigger value="external-link" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              External Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-jobs" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Select Job</Label>
              {fetchingJobs ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No jobs available to share. Try sharing an external link instead.
                </p>
              ) : (
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a job..." />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        <div className="flex flex-col">
                          <span>{job.job_title}</span>
                          <span className="text-xs text-muted-foreground">{job.company_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </TabsContent>

          <TabsContent value="external-link" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Job Posting URL *</Label>
              <Input
                placeholder="https://..."
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input
                placeholder="e.g., Software Engineer"
                value={externalTitle}
                onChange={(e) => setExternalTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Company Name (optional)</Label>
              <Input
                placeholder="e.g., Google"
                value={externalCompany}
                onChange={(e) => setExternalCompany(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Label>Notes (optional)</Label>
          <Textarea
            placeholder="Add a note for your team about this job..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={loading || !canShare}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
