import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface TeamMemberMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  recipientName: string;
  recipientId: string;
}

export const TeamMemberMessageDialog = ({
  open,
  onOpenChange,
  teamId,
  recipientName,
  recipientId,
}: TeamMemberMessageDialogProps) => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("team_communication")
        .insert({
          team_id: teamId,
          content: `@${recipientName}: ${message}`,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success(`Message sent to ${recipientName}`);
      setMessage("");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to send message");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Message to {recipientName}</DialogTitle>
          <DialogDescription>
            This message will be posted to the team communication board.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder={`Write your message to ${recipientName}...`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={loading || !message.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
