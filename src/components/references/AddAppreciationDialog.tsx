import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, Send, Save } from "lucide-react";

interface Reference {
  id: string;
  reference_name: string;
  reference_title: string | null;
  reference_company: string | null;
  reference_email: string | null;
}

interface AddAppreciationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reference: Reference | null;
}

export function AddAppreciationDialog({ open, onOpenChange, reference }: AddAppreciationDialogProps) {
  const queryClient = useQueryClient();
  const [appreciationType, setAppreciationType] = useState("thank_you_note");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [subject, setSubject] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (sendEmail: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !reference) throw new Error("Not authenticated or no reference selected");

      // Get user profile for sender name
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("first_name, last_name")
        .eq("user_id", user.id)
        .single();

      const senderName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Your Contact";

      // Send email if requested and email available
      if (sendEmail && message) {
        if (!reference.reference_email) {
          throw new Error("Reference email not available. Please add their email first.");
        }

        setIsSending(true);
        const { error: emailError } = await supabase.functions.invoke("send-appreciation-email", {
          body: {
            recipientEmail: reference.reference_email,
            recipientName: reference.reference_name,
            senderName: senderName,
            appreciationType: appreciationType,
            message: message,
            subject: subject || undefined,
          },
        });

        if (emailError) {
          throw new Error(`Failed to send email: ${emailError.message}`);
        }
      }

      // Save appreciation
      const { error: appreciationError } = await supabase
        .from("reference_appreciation")
        .insert({
          user_id: user.id,
          reference_id: reference.id,
          appreciation_type: appreciationType,
          message_content: message || null,
          notes: notes || null,
        });

      if (appreciationError) throw appreciationError;

      // Update last contacted date
      const { error: updateError } = await supabase
        .from("professional_references")
        .update({ last_contacted_at: new Date().toISOString() })
        .eq("id", reference.id);

      if (updateError) throw updateError;

      return sendEmail;
    },
    onSuccess: (sendEmail) => {
      queryClient.invalidateQueries({ queryKey: ["professional-references"] });
      queryClient.invalidateQueries({ queryKey: ["appreciations-for-analytics"] });
      toast.success(sendEmail ? "Appreciation sent via email!" : "Appreciation recorded!");
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setIsSending(false);
    },
  });

  const generateMessage = async () => {
    if (!reference) return;
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-reference-request-template", {
        body: {
          referenceName: reference.reference_name,
          referenceTitle: reference.reference_title,
          referenceCompany: reference.reference_company,
          requestType: "appreciation",
          appreciationType: appreciationType,
        },
      });

      if (error) throw error;
      setMessage(data.template);
      toast.success("Message generated!");
    } catch (error: any) {
      toast.error("Failed to generate message: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setAppreciationType("thank_you_note");
    setMessage("");
    setNotes("");
    setSubject("");
  };

  const hasEmail = !!reference?.reference_email;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) resetForm(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Appreciation</DialogTitle>
          <DialogDescription>
            Send appreciation to {reference?.reference_name}
            {hasEmail && <span className="text-green-600 dark:text-green-400"> ({reference?.reference_email})</span>}
            {!hasEmail && <span className="text-yellow-600 dark:text-yellow-400"> (No email - will only save)</span>}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Appreciation Type</Label>
            <Select value={appreciationType} onValueChange={setAppreciationType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thank_you_note">Thank You Note</SelectItem>
                <SelectItem value="gift">Gift</SelectItem>
                <SelectItem value="update">Career Update</SelectItem>
                <SelectItem value="recommendation">LinkedIn Recommendation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasEmail && (
            <div className="space-y-2">
              <Label>Subject (optional)</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Leave empty for auto-generated subject"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Message</Label>
              <Button variant="ghost" size="sm" onClick={generateMessage} disabled={isGenerating}>
                <Sparkles className="h-4 w-4 mr-1" />
                {isGenerating ? "Generating..." : "Generate with AI"}
              </Button>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your appreciation message..."
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label>Personal Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for yourself..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => saveMutation.mutate(false)} 
            disabled={saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-1" />
            Save Only
          </Button>
          {hasEmail && (
            <Button 
              onClick={() => saveMutation.mutate(true)} 
              disabled={saveMutation.isPending || !message}
            >
              <Send className="h-4 w-4 mr-1" />
              {isSending ? "Sending..." : "Send Email"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
