import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Send, Mail } from "lucide-react";

interface InvitationChatProps {
  invitation: {
    id: string;
    mentor_name: string | null;
    mentor_email: string;
  };
  onClose: () => void;
}

export function InvitationChat({ invitation, onClose }: InvitationChatProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: messages } = useQuery({
    queryKey: ['invitation-messages', invitation.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mentor_invitation_messages')
        .select('*')
        .eq('invitation_id', invitation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  const sendMessage = useMutation({
    mutationFn: async (messageText: string) => {
      if (!currentUser) throw new Error("Not authenticated");

      // Save message to database
      const { error } = await supabase
        .from('mentor_invitation_messages')
        .insert({
          invitation_id: invitation.id,
          sender_id: currentUser.id,
          message_text: messageText,
          is_from_mentor: false
        });

      if (error) throw error;

      // Also send email notification to mentor
      try {
        await supabase.functions.invoke('send-mentor-message-email', {
          body: {
            mentorEmail: invitation.mentor_email,
            mentorName: invitation.mentor_name,
            messageText: messageText,
            invitationId: invitation.id
          }
        });
      } catch (emailError) {
        console.log('Email notification failed, but message saved:', emailError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitation-messages', invitation.id] });
      setMessage("");
      toast({
        title: "Message sent",
        description: `Your message was sent to ${invitation.mentor_name || invitation.mentor_email}`
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage.mutate(message);
    }
  };

  const mentorDisplayName = invitation.mentor_name || invitation.mentor_email;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chat with {mentorDisplayName}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
          <Mail className="h-4 w-4" />
          <span>Messages are sent via email to {invitation.mentor_email}</span>
        </div>

        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages && messages.length === 0 && (
              <p className="text-center text-muted-foreground text-sm">
                No messages yet. Send your first message to {mentorDisplayName}!
              </p>
            )}
            {messages && messages.map((msg) => {
              const isFromMentor = (msg as any).is_from_mentor;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isFromMentor ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[70%] rounded-lg p-3 ${
                    isFromMentor 
                      ? 'bg-muted text-foreground' 
                      : 'bg-primary text-primary-foreground'
                  }`}>
                    {isFromMentor && (
                      <p className="text-xs font-medium mb-1 opacity-70">
                        {mentorDisplayName}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <form onSubmit={handleSend} className="flex gap-2 mt-4">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="min-h-[60px]"
          />
          <Button type="submit" size="icon" disabled={!message.trim() || sendMessage.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
