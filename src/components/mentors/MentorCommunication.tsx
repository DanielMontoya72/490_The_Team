import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";

interface MentorCommunicationProps {
  relationshipId: string;
  onClose: () => void;
}

export function MentorCommunication({ relationshipId, onClose }: MentorCommunicationProps) {
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

  const { data: relationship } = useQuery({
    queryKey: ['mentor-relationship', relationshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mentor_relationships')
        .select('*')
        .eq('id', relationshipId)
        .single();

      if (error) throw error;
      return data;
    }
  });

  const { data: mentorProfile } = useQuery({
    queryKey: ['mentor-profile', relationship?.mentor_id],
    queryFn: async () => {
      if (!relationship?.mentor_id) return null;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('user_id', relationship.mentor_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!relationship?.mentor_id
  });

  const { data: menteeProfile } = useQuery({
    queryKey: ['mentee-profile', relationship?.mentee_id],
    queryFn: async () => {
      if (!relationship?.mentee_id) return null;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('user_id', relationship.mentee_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!relationship?.mentee_id
  });

  const { data: messages } = useQuery({
    queryKey: ['mentor-messages', relationshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mentor_communications')
        .select('*')
        .eq('relationship_id', relationshipId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  const sendMessage = useMutation({
    mutationFn: async (messageText: string) => {
      if (!currentUser || !relationship) throw new Error("Not ready");

      const receiverId = currentUser.id === relationship.mentee_id 
        ? relationship.mentor_id 
        : relationship.mentee_id;

      // Insert message
      const { error } = await supabase
        .from('mentor_communications')
        .insert({
          relationship_id: relationshipId,
          sender_id: currentUser.id,
          receiver_id: receiverId,
          message_text: messageText
        });

      if (error) throw error;

      // Get sender name for notification
      const senderName = currentUser.id === relationship.mentee_id
        ? `${menteeProfile?.first_name || ''} ${menteeProfile?.last_name || ''}`.trim() || 'Your mentee'
        : `${mentorProfile?.first_name || ''} ${mentorProfile?.last_name || ''}`.trim() || 'Your mentor';

      // Create in-app notification for recipient with relationship ID
      await supabase
        .from('notifications')
        .insert({
          user_id: receiverId,
          title: 'New Message',
          message: `${senderName}: ${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}`,
          type: 'mentor_message',
          link: `/networking?chat=${relationshipId}`,
          metadata: { relationshipId }
        });

      // Get recipient email and send email notification
      const { data: recipientProfile } = await supabase
        .from('user_profiles')
        .select('email, first_name, last_name')
        .eq('user_id', receiverId)
        .single();

      if (recipientProfile?.email) {
        await supabase.functions.invoke('send-mentor-message-email', {
          body: {
            mentorEmail: recipientProfile.email,
            mentorName: `${recipientProfile.first_name || ''} ${recipientProfile.last_name || ''}`.trim(),
            messageText: messageText,
            senderName: senderName,
            invitationId: relationshipId
          }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-messages', relationshipId] });
      setMessage("");
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Real-time subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel(`mentor-messages-${relationshipId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mentor_communications',
          filter: `relationship_id=eq.${relationshipId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['mentor-messages', relationshipId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [relationshipId, queryClient]);

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

  const otherPersonName = currentUser?.id === relationship?.mentee_id
    ? `${mentorProfile?.first_name || ''} ${mentorProfile?.last_name || ''}`.trim() || 'Mentor'
    : `${menteeProfile?.first_name || ''} ${menteeProfile?.last_name || ''}`.trim() || 'Mentee';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chat with {otherPersonName}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages && messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.sender_id === currentUser?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{msg.message_text}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
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
