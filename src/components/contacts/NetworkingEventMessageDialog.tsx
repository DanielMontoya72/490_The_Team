import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Copy, Send, Sparkles } from "lucide-react";

interface NetworkingEventMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: any;
  eventName?: string;
}

export function NetworkingEventMessageDialog({ 
  open, 
  onOpenChange, 
  connection,
  eventName 
}: NetworkingEventMessageDialogProps) {
  const queryClient = useQueryClient();
  const [messageType, setMessageType] = useState('follow_up');
  const [tone, setTone] = useState('professional');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generatedSubject, setGeneratedSubject] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');

  const generateMessage = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-networking-event-message', {
        body: {
          contactName: connection.contact_name,
          contactTitle: connection.contact_title,
          contactCompany: connection.contact_company,
          conversationNotes: connection.conversation_notes,
          eventName,
          messageType,
          tone,
          additionalContext,
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setGeneratedSubject(data.subject);
      setGeneratedMessage(data.message);
      toast.success('Message generated!');
    },
    onError: (error: any) => {
      console.error('Message generation error:', error);
      toast.error('Failed to generate message');
    },
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!connection.contact_email) {
        throw new Error('Contact does not have an email address');
      }

      // Create a temporary contact entry or send directly
      const { data, error } = await supabase.functions.invoke('send-networking-event-email', {
        body: {
          recipientEmail: connection.contact_email,
          recipientName: connection.contact_name,
          subject: generatedSubject,
          message: generatedMessage,
          connectionId: connection.id,
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networking_event_connections'] });
      onOpenChange(false);
      toast.success('Email sent successfully!');
    },
    onError: (error: any) => {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Failed to send email');
    },
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`Subject: ${generatedSubject}\n\n${generatedMessage}`);
    toast.success('Copied to clipboard!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Send Email to {connection.contact_name}
          </DialogTitle>
          <DialogDescription>
            Generate an AI-powered follow-up email for your networking connection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Message Type</Label>
              <Select value={messageType} onValueChange={setMessageType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="follow_up">📧 Follow-Up</SelectItem>
                  <SelectItem value="thank_you">🙏 Thank You</SelectItem>
                  <SelectItem value="coffee_meeting">☕ Coffee Meeting Request</SelectItem>
                  <SelectItem value="introduction">👋 Formal Introduction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">💼 Professional</SelectItem>
                  <SelectItem value="friendly">😊 Friendly</SelectItem>
                  <SelectItem value="formal">🎩 Formal</SelectItem>
                  <SelectItem value="casual">🤝 Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Additional Context (Optional)</Label>
            <Textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Add any specific details you want to mention..."
              rows={3}
            />
          </div>

          <Button 
            onClick={() => generateMessage.mutate()} 
            disabled={generateMessage.isPending}
            className="w-full"
          >
            {generateMessage.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Email
              </>
            )}
          </Button>

          {generatedSubject && generatedMessage && (
            <div className="space-y-4 p-6 bg-muted/50 rounded-lg border">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={generatedSubject}
                  onChange={(e) => setGeneratedSubject(e.target.value)}
                  className="font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={generatedMessage}
                  onChange={(e) => setGeneratedMessage(e.target.value)}
                  rows={10}
                  className="font-sans"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={copyToClipboard} className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button 
                  onClick={() => sendMessage.mutate()} 
                  className="flex-1"
                  disabled={sendMessage.isPending || !connection.contact_email}
                >
                  {sendMessage.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
