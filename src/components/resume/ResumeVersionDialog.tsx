import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResumeVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceResume: {
    id: string;
    resume_name: string;
    content?: any;
    customization_overrides?: any;
    template_id: string | null;
    version_number: number;
  };
  userId: string;
  onVersionCreated: () => void;
}

export function ResumeVersionDialog({
  open,
  onOpenChange,
  sourceResume,
  userId,
  onVersionCreated,
}: ResumeVersionDialogProps) {
  const [versionName, setVersionName] = useState(`${sourceResume.resume_name} (Version ${sourceResume.version_number + 1})`);
  const [versionDescription, setVersionDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateVersion = async () => {
    if (!versionName.trim()) {
      toast.error("Please enter a version name");
      return;
    }

    try {
      setIsCreating(true);

      const { data, error } = await supabase
        .from("resumes")
        .insert({
          user_id: userId,
          resume_name: versionName,
          version_description: versionDescription || null,
          version_number: sourceResume.version_number + 1,
          parent_resume_id: sourceResume.id,
          content: sourceResume.content || {},
          customization_overrides: sourceResume.customization_overrides || {},
          template_id: sourceResume.template_id,
          is_default: false,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Resume version created successfully");
      onVersionCreated();
      onOpenChange(false);
      setVersionName("");
      setVersionDescription("");
    } catch (error: any) {
      console.error("Error creating resume version:", error);
      toast.error("Failed to create resume version");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Resume Version</DialogTitle>
          <DialogDescription>
            Create a new version based on "{sourceResume.resume_name}". This will create an independent copy that you can modify separately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="version-name">Version Name</Label>
            <Input
              id="version-name"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="e.g., Software Engineer Resume - Tech Focus"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="version-description">Description (Optional)</Label>
            <Textarea
              id="version-description"
              value={versionDescription}
              onChange={(e) => setVersionDescription(e.target.value)}
              placeholder="e.g., Tailored for software engineering positions at tech companies"
              rows={3}
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium">Source Resume:</p>
            <p className="text-muted-foreground">{sourceResume.resume_name}</p>
            <p className="text-xs text-muted-foreground mt-1">Version {sourceResume.version_number}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreateVersion} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
