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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface AddPartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPartnerDialog({ open, onOpenChange }: AddPartnerDialogProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [relationshipType, setRelationshipType] = useState("peer");
  const [checkInFrequency, setCheckInFrequency] = useState("weekly");

  const addPartner = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Find user by email
      const { data: partnerProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("email", email)
        .single();

      if (profileError || !partnerProfile) {
        throw new Error("User not found with that email");
      }

      // Create partnership
      const { error } = await supabase
        .from("accountability_partners")
        .insert({
          user_id: user.id,
          partner_id: partnerProfile.user_id,
          relationship_type: relationshipType,
          check_in_frequency: checkInFrequency,
          status: "pending",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountability-partners"] });
      toast.success("Partnership invitation sent!");
      onOpenChange(false);
      setEmail("");
      setRelationshipType("peer");
      setCheckInFrequency("weekly");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add partner");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Accountability Partner</DialogTitle>
          <DialogDescription>
            Invite someone to be your accountability partner and share your progress
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Partner Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="partner@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship Type</Label>
            <Select value={relationshipType} onValueChange={setRelationshipType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="peer">Peer - Mutual accountability</SelectItem>
                <SelectItem value="mentor">Mentor - Receiving guidance</SelectItem>
                <SelectItem value="coach">Coach - Professional coaching</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Check-in Frequency</Label>
            <Select value={checkInFrequency} onValueChange={setCheckInFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => addPartner.mutate()}
            disabled={!email || addPartner.isPending}
          >
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
