import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Heart, Loader2 } from "lucide-react";

interface InviteFamilyMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteFamilyMemberDialog({ open, onOpenChange }: InviteFamilyMemberDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationshipType, setRelationshipType] = useState("family");

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const inviteToken = crypto.randomUUID();
      
      const { data, error } = await supabase
        .from('family_supporters')
        .insert({
          user_id: user?.id,
          supporter_name: name,
          supporter_email: email || null,
          relationship_type: relationshipType,
          invite_token: inviteToken,
          invite_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Also create default sharing settings
      await supabase
        .from('family_sharing_settings')
        .insert({
          user_id: user?.id,
          supporter_id: data.id,
        });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['family-supporters'] });
      toast.success(`${name} has been invited!`, {
        description: "They can now view your family-friendly progress updates.",
      });
      
      // Generate shareable link
      const shareLink = `${window.location.origin}/family-dashboard/${data.invite_token}`;
      navigator.clipboard.writeText(shareLink);
      toast.info("Share link copied to clipboard!", {
        description: "Send this link to your supporter so they can view your progress.",
      });
      
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Error inviting supporter:", error);
      toast.error("Failed to invite supporter");
    },
  });

  const resetForm = () => {
    setName("");
    setEmail("");
    setRelationshipType("family");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Invite a Supporter
          </DialogTitle>
          <DialogDescription>
            Invite family members or friends to follow your job search journey with privacy controls.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="Enter their name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter their email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              If provided, they'll receive email notifications about milestones
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship</Label>
            <Select value={relationshipType} onValueChange={setRelationshipType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="family">
                  <span className="flex items-center gap-2">👨‍👩‍👧‍👦 Family Member</span>
                </SelectItem>
                <SelectItem value="partner">
                  <span className="flex items-center gap-2">💑 Partner/Spouse</span>
                </SelectItem>
                <SelectItem value="friend">
                  <span className="flex items-center gap-2">🤝 Close Friend</span>
                </SelectItem>
                <SelectItem value="other">
                  <span className="flex items-center gap-2">👤 Other</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <h4 className="font-medium mb-2">What they'll see:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• General progress (applications sent, interviews)</li>
              <li>• Milestone celebrations</li>
              <li>• Your mood/wellbeing updates (if enabled)</li>
              <li className="text-green-600">✓ Company names and salary details are hidden by default</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => inviteMutation.mutate()}
            disabled={!name || inviteMutation.isPending}
          >
            {inviteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
