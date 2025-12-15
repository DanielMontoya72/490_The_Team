import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Loader2, Eye, EyeOff } from "lucide-react";

interface FamilySharingSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supporter: any;
}

export function FamilySharingSettingsDialog({
  open,
  onOpenChange,
  supporter,
}: FamilySharingSettingsDialogProps) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    share_application_count: true,
    share_interview_count: true,
    share_milestones: true,
    share_mood_status: false,
    share_detailed_progress: false,
    hide_company_names: true,
    hide_salary_info: true,
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: existingSettings } = useQuery({
    queryKey: ['family-sharing-settings', supporter.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_sharing_settings')
        .select('*')
        .eq('supporter_id', supporter.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!supporter.id,
  });

  useEffect(() => {
    if (existingSettings) {
      setSettings({
        share_application_count: existingSettings.share_application_count,
        share_interview_count: existingSettings.share_interview_count,
        share_milestones: existingSettings.share_milestones,
        share_mood_status: existingSettings.share_mood_status,
        share_detailed_progress: existingSettings.share_detailed_progress,
        hide_company_names: existingSettings.hide_company_names,
        hide_salary_info: existingSettings.hide_salary_info,
      });
    }
  }, [existingSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('family_sharing_settings')
        .upsert({
          user_id: user?.id,
          supporter_id: supporter.id,
          ...settings,
        }, { onConflict: 'user_id,supporter_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-sharing-settings'] });
      toast.success("Sharing settings updated");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to update settings");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Sharing Settings for {supporter.supporter_name}
          </DialogTitle>
          <DialogDescription>
            Control what information this supporter can see
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              What They Can See
            </h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="applications" className="flex flex-col">
                <span>Application Count</span>
                <span className="text-xs text-muted-foreground">Number of jobs applied to</span>
              </Label>
              <Switch
                id="applications"
                checked={settings.share_application_count}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, share_application_count: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="interviews" className="flex flex-col">
                <span>Interview Count</span>
                <span className="text-xs text-muted-foreground">Number of interviews scheduled</span>
              </Label>
              <Switch
                id="interviews"
                checked={settings.share_interview_count}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, share_interview_count: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="milestones" className="flex flex-col">
                <span>Milestones & Celebrations</span>
                <span className="text-xs text-muted-foreground">Achievement notifications</span>
              </Label>
              <Switch
                id="milestones"
                checked={settings.share_milestones}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, share_milestones: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="mood" className="flex flex-col">
                <span>Mood & Wellbeing</span>
                <span className="text-xs text-muted-foreground">Your stress and energy levels</span>
              </Label>
              <Switch
                id="mood"
                checked={settings.share_mood_status}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, share_mood_status: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="detailed" className="flex flex-col">
                <span>Detailed Progress</span>
                <span className="text-xs text-muted-foreground">Specific job titles and stages</span>
              </Label>
              <Switch
                id="detailed"
                checked={settings.share_detailed_progress}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, share_detailed_progress: checked }))}
              />
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium flex items-center gap-2">
              <EyeOff className="h-4 w-4" />
              Privacy Protection
            </h4>

            <div className="flex items-center justify-between">
              <Label htmlFor="hideCompany" className="flex flex-col">
                <span>Hide Company Names</span>
                <span className="text-xs text-muted-foreground">Show generic "Company A, B, C"</span>
              </Label>
              <Switch
                id="hideCompany"
                checked={settings.hide_company_names}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, hide_company_names: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="hideSalary" className="flex flex-col">
                <span>Hide Salary Information</span>
                <span className="text-xs text-muted-foreground">Don't show compensation details</span>
              </Label>
              <Switch
                id="hideSalary"
                checked={settings.hide_salary_info}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, hide_salary_info: checked }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
