import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Plus, 
  Loader2,
  Linkedin,
  FileText,
  Building2,
  Globe
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PLATFORMS = [
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "indeed", label: "Indeed", icon: FileText },
  { value: "glassdoor", label: "Glassdoor", icon: Building2 },
  { value: "ziprecruiter", label: "ZipRecruiter", icon: Globe },
  { value: "company_site", label: "Company Website", icon: Building2 },
  { value: "other", label: "Other", icon: Globe },
];

export function ManualPlatformEntry() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    jobTitle: "",
    company: "",
    location: "",
    platform: "company_site",
    applicationUrl: "",
    status: "applied",
    notes: ""
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check for existing duplicate
      const { data: existing } = await supabase
        .from("jobs")
        .select("id, platform_count")
        .eq("user_id", user.id)
        .ilike("job_title", `%${data.jobTitle}%`)
        .ilike("company_name", `%${data.company}%`)
        .single();

      let jobId = existing?.id;

      if (jobId) {
        // Add platform to existing job
        await supabase.from("application_platforms").insert({
          user_id: user.id,
          job_id: jobId,
          platform_name: data.platform,
          applied_via_url: data.applicationUrl || null,
          platform_status: data.status,
          is_primary: false
        });

        // Update platform count
        await supabase
          .from("jobs")
          .update({ platform_count: (existing.platform_count || 1) + 1 })
          .eq("id", jobId);

        return { jobId, merged: true };
      } else {
        // Create new job
        const { data: newJob, error: jobError } = await supabase
          .from("jobs")
          .insert({
            user_id: user.id,
            job_title: data.jobTitle,
            company_name: data.company,
            location: data.location,
            status: data.status,
            primary_platform: data.platform,
            notes: data.notes,
            posting_url: data.applicationUrl
          })
          .select()
          .single();

        if (jobError) throw jobError;

        // Add platform entry
        await supabase.from("application_platforms").insert({
          user_id: user.id,
          job_id: newJob.id,
          platform_name: data.platform,
          applied_via_url: data.applicationUrl || null,
          platform_status: data.status,
          is_primary: true
        });

        return { jobId: newJob.id, merged: false };
      }
    },
    onSuccess: (result) => {
      toast.success(
        result.merged 
          ? "Platform added to existing application" 
          : "Application created successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["platform-applications"] });
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setFormData({
        jobTitle: "",
        company: "",
        location: "",
        platform: "company_site",
        applicationUrl: "",
        status: "applied",
        notes: ""
      });
    },
    onError: (error) => {
      toast.error("Failed to create application");
      console.error(error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.jobTitle || !formData.company) {
      toast.error("Job title and company are required");
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Entry</CardTitle>
        <CardDescription>
          Add applications from company career pages or other platforms manually
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title *</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                placeholder="e.g., Software Engineer"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="e.g., Google"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., San Francisco, CA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select 
                value={formData.platform}
                onValueChange={(v) => setFormData(prev => ({ ...prev, platform: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      <div className="flex items-center gap-2">
                        <p.icon className="h-4 w-4" />
                        {p.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="applicationUrl">Application URL</Label>
              <Input
                id="applicationUrl"
                type="url"
                value={formData.applicationUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, applicationUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status}
                onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interested">Interested</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="phone_screen">Phone Screen</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes about this application..."
              rows={3}
            />
          </div>

          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Application
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
