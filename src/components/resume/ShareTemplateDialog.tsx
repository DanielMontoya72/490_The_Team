import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users } from "lucide-react";

interface ShareTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  templateName: string;
  onShared: () => void;
}

interface Team {
  id: string;
  name: string;
  team_members: Array<{ role: string }>;
}

export const ShareTemplateDialog = ({
  open,
  onOpenChange,
  templateId,
  templateName,
  onShared,
}: ShareTemplateDialogProps) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTeams();
    }
  }, [open]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          team_members!inner(role)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Filter teams where user is admin or owner
      const adminTeams = data?.filter(team => 
        team.team_members.some(m => m.role === "admin" || m.role === "owner")
      ) || [];
      
      setTeams(adminTeams);
    } catch (error: any) {
      console.error("Failed to load teams:", error);
    }
  };

  const handleShare = async () => {
    if (!selectedTeam) {
      toast.error("Please select a team");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("resume_templates")
        .update({ team_id: selectedTeam })
        .eq("id", templateId);

      if (error) throw error;

      toast.success(`Template shared with team successfully`);
      onOpenChange(false);
      onShared();
    } catch (error: any) {
      toast.error("Failed to share template");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnshare = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("resume_templates")
        .update({ team_id: null })
        .eq("id", templateId);

      if (error) throw error;

      toast.success("Template unshared from team");
      onOpenChange(false);
      onShared();
    } catch (error: any) {
      toast.error("Failed to unshare template");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Users className="h-6 w-6 text-primary" />
            Share Template with Team
          </DialogTitle>
          <DialogDescription className="text-base">
            Share <span className="font-semibold text-foreground">"{templateName}"</span> with your team members
          </DialogDescription>
        </DialogHeader>

        {teams.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mb-2 font-medium text-foreground">No Teams Available</p>
            <p className="text-sm text-muted-foreground">
              You don't have admin access to any teams.
            </p>
            <p className="text-sm text-muted-foreground">
              Create a team or get admin permissions to share templates.
            </p>
          </div>
        ) : (
          <div className="space-y-6 py-6">
            <div className="space-y-3">
              <Label htmlFor="team-select" className="text-sm font-medium">Select Team</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger id="team-select" className="h-11">
                  <SelectValue placeholder="Choose a team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="outline" 
            onClick={handleUnshare} 
            disabled={loading || teams.length === 0}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Unshare
          </Button>
          <Button 
            onClick={handleShare} 
            disabled={loading || !selectedTeam}
          >
            {loading ? "Sharing..." : "Share"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
