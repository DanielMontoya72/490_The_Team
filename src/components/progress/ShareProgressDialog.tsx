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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Share2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface ShareProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareProgressDialog({ open, onOpenChange }: ShareProgressDialogProps) {
  const queryClient = useQueryClient();
  const [shareType, setShareType] = useState("update");
  const [visibility, setVisibility] = useState("specific");
  const [content, setContent] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<string>("");

  const { data: partners } = useQuery({
    queryKey: ["active-partners"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("accountability_partners")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (!data) return [];

      // Fetch partner profiles
      const partnerIds = data.map(p => p.partner_id);
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", partnerIds);

      return data.map(p => {
        const profile = profiles?.find(pr => pr.user_id === p.partner_id);
        return {
          ...p,
          partner_email: profile?.email || "Unknown",
          partner_name: profile 
            ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email
            : "Unknown"
        };
      });
    },
    enabled: open,
  });

  const shareProgress = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("progress_shares")
        .insert({
          user_id: user.id,
          shared_with_id: visibility === "specific" ? selectedPartner : null,
          share_type: shareType,
          content: { message: content, timestamp: new Date().toISOString() },
          visibility,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-shares"] });
      toast.success("Progress shared successfully!");
      onOpenChange(false);
      setContent("");
      setShareType("update");
      setVisibility("specific");
    },
    onError: () => {
      toast.error("Failed to share progress");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Your Progress
          </DialogTitle>
          <DialogDescription>
            Share updates, achievements, or milestones with your accountability network
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>What are you sharing?</Label>
            <Select value={shareType} onValueChange={setShareType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="update">Progress Update</SelectItem>
                <SelectItem value="achievement">Achievement</SelectItem>
                <SelectItem value="milestone">Milestone Reached</SelectItem>
                <SelectItem value="report">Weekly Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Who can see this?</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="specific">Specific Partner</SelectItem>
                <SelectItem value="team">My Team</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visibility === "specific" && (
            <div className="space-y-2">
              <Label>Select Partner</Label>
              <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a partner" />
                </SelectTrigger>
                <SelectContent>
                  {partners?.map((partner: any) => (
                    <SelectItem key={partner.id} value={partner.partner_id}>
                      {partner.partner_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Your Update</Label>
            <Textarea
              placeholder="Share your progress, wins, challenges, or what you're working on..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[150px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => shareProgress.mutate()}
            disabled={!content || shareProgress.isPending || (visibility === "specific" && !selectedPartner)}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share Progress
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
