import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface AdvisorMessagesProps {
  advisors: any[];
  selectedAdvisorId: string | null;
}

export function AdvisorMessages({ advisors, selectedAdvisorId }: AdvisorMessagesProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentAdvisorId, setCurrentAdvisorId] = useState<string>(selectedAdvisorId || "");
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedAdvisorId) {
      setCurrentAdvisorId(selectedAdvisorId);
    }
  }, [selectedAdvisorId]);

  useEffect(() => {
    if (currentAdvisorId) {
      fetchMessages();
    }
  }, [currentAdvisorId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    if (!currentAdvisorId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("advisor_messages")
        .select("*")
        .eq("advisor_id", currentAdvisorId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentAdvisorId) return;
    setSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("advisor_messages").insert({
        user_id: user.id,
        advisor_id: currentAdvisorId,
        sender_type: "user",
        message_content: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage("");
      fetchMessages();
    } catch (error: any) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const activeAdvisors = advisors.filter(a => a.status === 'active');
  const currentAdvisor = advisors.find(a => a.id === currentAdvisorId);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Secure Messages</h3>
          <p className="text-sm text-muted-foreground">Communicate with your advisors</p>
        </div>
        <Select value={currentAdvisorId} onValueChange={setCurrentAdvisorId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select advisor" />
          </SelectTrigger>
          <SelectContent>
            {activeAdvisors.map((advisor) => (
              <SelectItem key={advisor.id} value={advisor.id}>
                {advisor.advisor_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!currentAdvisorId ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Select an advisor to start messaging</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="border-b pb-3 mb-4">
              <h4 className="font-medium">{currentAdvisor?.advisor_name}</h4>
              <p className="text-sm text-muted-foreground">{currentAdvisor?.advisor_email}</p>
            </div>

            <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.sender_type === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.message_content}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender_type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {format(new Date(message.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={sending}
              />
              <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
