import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface CreateSupportGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSupportGroupDialog({ open, onOpenChange }: CreateSupportGroupDialogProps) {
  const [formData, setFormData] = useState({
    group_name: "",
    group_description: "",
    group_type: "industry",
    industry: "",
    role_focus: "",
    privacy_level: "public",
    group_rules: "",
  });

  const queryClient = useQueryClient();

  const createGroup = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("peer_support_groups")
        .insert({
          ...data,
          created_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peer-support-groups"] });
      toast.success("Group created successfully!");
      onOpenChange(false);
      setFormData({
        group_name: "",
        group_description: "",
        group_type: "industry",
        industry: "",
        role_focus: "",
        privacy_level: "public",
        group_rules: "",
      });
    },
    onError: (error) => {
      toast.error("Failed to create group: " + error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Support Group</DialogTitle>
          <DialogDescription>
            Create a new peer support group for job seekers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group_name">Group Name *</Label>
            <Input
              id="group_name"
              value={formData.group_name}
              onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
              placeholder="e.g., Frontend Developers Network"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group_description">Description *</Label>
            <Textarea
              id="group_description"
              value={formData.group_description}
              onChange={(e) => setFormData({ ...formData, group_description: e.target.value })}
              placeholder="Describe the purpose and focus of this group..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="group_type">Group Type *</Label>
              <Select
                value={formData.group_type}
                onValueChange={(value) => setFormData({ ...formData, group_type: value })}
              >
                <SelectTrigger id="group_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="industry">Industry</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="location">Location</SelectItem>
                  <SelectItem value="experience_level">Experience Level</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="privacy_level">Privacy Level *</Label>
              <Select
                value={formData.privacy_level}
                onValueChange={(value) => setFormData({ ...formData, privacy_level: value })}
              >
                <SelectTrigger id="privacy_level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="invite_only">Invite Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.group_type === "industry" && (
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g., Technology, Healthcare"
              />
            </div>
          )}

          {formData.group_type === "role" && (
            <div className="space-y-2">
              <Label htmlFor="role_focus">Role Focus</Label>
              <Input
                id="role_focus"
                value={formData.role_focus}
                onChange={(e) => setFormData({ ...formData, role_focus: e.target.value })}
                placeholder="e.g., Software Engineer, Product Manager"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="group_rules">Group Rules (Optional)</Label>
            <Textarea
              id="group_rules"
              value={formData.group_rules}
              onChange={(e) => setFormData({ ...formData, group_rules: e.target.value })}
              placeholder="Set community guidelines and rules..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createGroup.mutate(formData)}
              disabled={!formData.group_name || !formData.group_description || createGroup.isPending}
            >
              Create Group
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}