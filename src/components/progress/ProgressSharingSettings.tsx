import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Shield } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function ProgressSharingSettings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    share_goals: true,
    share_achievements: true,
    share_job_applications: false,
    share_interviews: false,
    share_resume_updates: false,
    share_technical_prep: false,
  });

  const { data: existingSettings } = useQuery({
    queryKey: ["progress-sharing-settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("progress_sharing_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existingSettings) {
      setSettings({
        share_goals: existingSettings.share_goals,
        share_achievements: existingSettings.share_achievements,
        share_job_applications: existingSettings.share_job_applications,
        share_interviews: existingSettings.share_interviews,
        share_resume_updates: existingSettings.share_resume_updates,
        share_technical_prep: existingSettings.share_technical_prep,
      });
    }
  }, [existingSettings]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("progress_sharing_settings")
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-sharing-settings"] });
      toast.success("Privacy settings updated successfully");
    },
    onError: () => {
      toast.error("Failed to update privacy settings");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacy & Sharing Settings
        </CardTitle>
        <CardDescription>
          Control what information you share with your accountability partners and team
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="share_goals">Career Goals</Label>
              <p className="text-sm text-muted-foreground">
                Share your career goals and progress tracking
              </p>
            </div>
            <Switch
              id="share_goals"
              checked={settings.share_goals}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, share_goals: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="share_achievements">Achievements</Label>
              <p className="text-sm text-muted-foreground">
                Share your milestones and achievements
              </p>
            </div>
            <Switch
              id="share_achievements"
              checked={settings.share_achievements}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, share_achievements: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="share_job_applications">Job Applications</Label>
              <p className="text-sm text-muted-foreground">
                Share your job application activity
              </p>
            </div>
            <Switch
              id="share_job_applications"
              checked={settings.share_job_applications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, share_job_applications: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="share_interviews">Interviews</Label>
              <p className="text-sm text-muted-foreground">
                Share your interview schedule and outcomes
              </p>
            </div>
            <Switch
              id="share_interviews"
              checked={settings.share_interviews}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, share_interviews: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="share_resume_updates">Resume Updates</Label>
              <p className="text-sm text-muted-foreground">
                Share when you update your resume or materials
              </p>
            </div>
            <Switch
              id="share_resume_updates"
              checked={settings.share_resume_updates}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, share_resume_updates: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="share_technical_prep">Technical Preparation</Label>
              <p className="text-sm text-muted-foreground">
                Share your technical practice and progress
              </p>
            </div>
            <Switch
              id="share_technical_prep"
              checked={settings.share_technical_prep}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, share_technical_prep: checked })
              }
            />
          </div>
        </div>

        <Button 
          onClick={() => saveSettings.mutate()}
          disabled={saveSettings.isPending}
        >
          <Settings className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}
