import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, MoreVertical } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TeamSettingsTabProps {
  team: {
    id: string;
    name: string;
    description: string;
  };
  onUpdate: () => void;
  onClose: () => void;
}

export const TeamSettingsTab = ({ team, onUpdate, onClose }: TeamSettingsTabProps) => {
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || "");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleUpdate = async () => {
    if (!name.trim()) {
      toast.error("Team name is required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("teams")
        .update({
          name: name.trim(),
          description: description.trim() || null,
        })
        .eq("id", team.id);

      if (error) throw error;

      toast.success("Team updated successfully");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to update team");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("teams").delete().eq("id", team.id);

      if (error) throw error;

      toast.success("Team deleted successfully");
      onClose();
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to delete team");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-team-name">Team Name</Label>
          <Input
            id="edit-team-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Team name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-team-description">Description</Label>
          <Textarea
            id="edit-team-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your team..."
            rows={3}
          />
        </div>
        <Button onClick={handleUpdate} disabled={loading}>
          Save Changes
        </Button>
      </div>

      <div className="pt-6 border-t">
        <h3 className="font-medium text-destructive mb-4">Danger Zone</h3>
        <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg">
          <div>
            <h4 className="font-medium">Delete Team</h4>
            <p className="text-sm text-muted-foreground">
              Permanently delete this team and remove all members
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this team? This action cannot be undone. All team members will lose access to shared templates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
