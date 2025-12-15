import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AdvisorPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advisor: any | null;
  onSuccess: () => void;
}

export function AdvisorPermissionsDialog({ open, onOpenChange, advisor, onSuccess }: AdvisorPermissionsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState({
    view_profile: true,
    view_resume: false,
    view_cover_letters: false,
    view_jobs: false,
    view_interviews: false,
    view_goals: false,
    view_skills: false,
  });

  useEffect(() => {
    if (advisor && open) {
      fetchPermissions();
    }
  }, [advisor, open]);

  const fetchPermissions = async () => {
    if (!advisor) return;

    try {
      const { data, error } = await supabase
        .from("advisor_permissions")
        .select("*")
        .eq("advisor_id", advisor.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setPermissions({
          view_profile: data.view_profile ?? true,
          view_resume: data.view_resume ?? false,
          view_cover_letters: data.view_cover_letters ?? false,
          view_jobs: data.view_jobs ?? false,
          view_interviews: data.view_interviews ?? false,
          view_goals: data.view_goals ?? false,
          view_skills: data.view_skills ?? false,
        });
      }
    } catch (error: any) {
      console.error("Error fetching permissions:", error);
    }
  };

  const handleSave = async () => {
    if (!advisor) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("advisor_permissions")
        .upsert({
          advisor_id: advisor.id,
          ...permissions,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'advisor_id' });

      if (error) throw error;

      toast.success("Permissions updated");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to update permissions");
    } finally {
      setLoading(false);
    }
  };

  const permissionOptions = [
    { key: 'view_profile', label: 'View Profile', description: 'Basic profile information' },
    { key: 'view_resume', label: 'View Resumes', description: 'Access resume documents' },
    { key: 'view_cover_letters', label: 'View Cover Letters', description: 'Access cover letter documents' },
    { key: 'view_jobs', label: 'View Job Applications', description: 'See job search progress' },
    { key: 'view_interviews', label: 'View Interviews', description: 'See interview schedule and feedback' },
    { key: 'view_goals', label: 'View Career Goals', description: 'Access career goals and progress' },
    { key: 'view_skills', label: 'View Skills', description: 'See skills and development progress' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Permissions</DialogTitle>
          <DialogDescription>
            Control what information {advisor?.advisor_name} can access
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {permissionOptions.map((option) => (
            <div key={option.key} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={option.key}>{option.label}</Label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
              <Switch
                id={option.key}
                checked={permissions[option.key as keyof typeof permissions]}
                onCheckedChange={(checked) => 
                  setPermissions({ ...permissions, [option.key]: checked })
                }
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Permissions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
