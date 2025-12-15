import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface MentorInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MentorInviteDialog({ open, onOpenChange, onSuccess }: MentorInviteDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    mentorEmail: "",
    mentorName: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('send-mentor-invitation', {
        body: {
          mentorEmail: formData.mentorEmail,
          mentorName: formData.mentorName,
          message: formData.message,
          userId: user.id
        }
      });

      if (error) throw error;

      toast({
        title: "Invitation sent!",
        description: `An invitation has been sent to ${formData.mentorEmail}`
      });

      setFormData({ mentorEmail: "", mentorName: "", message: "" });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite a Mentor</DialogTitle>
          <DialogDescription>
            Invite a mentor or career coach to collaborate on your job search journey.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mentorEmail">Mentor Email *</Label>
            <Input
              id="mentorEmail"
              type="email"
              placeholder="mentor@example.com"
              value={formData.mentorEmail}
              onChange={(e) => setFormData({ ...formData, mentorEmail: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mentorName">Mentor Name</Label>
            <Input
              id="mentorName"
              placeholder="John Doe"
              value={formData.mentorName}
              onChange={(e) => setFormData({ ...formData, mentorName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="I would love your guidance on my job search..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
