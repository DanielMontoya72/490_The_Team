import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Plus, CheckCircle, Linkedin, Mail, Hash } from "lucide-react";
import { NetworkingEventMessageDialog } from "./NetworkingEventMessageDialog";

interface NetworkingEventConnectionsProps {
  eventId: string;
}

export function NetworkingEventConnections({ eventId }: NetworkingEventConnectionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddCount, setQuickAddCount] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactLinkedin, setContactLinkedin] = useState("");
  const [conversationNotes, setConversationNotes] = useState("");
  const [relationshipValue, setRelationshipValue] = useState("medium");
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch event details for the badge
  const { data: eventDetails } = useQuery({
    queryKey: ['networking_opportunity', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('networking_opportunities')
        .select('event_name')
        .eq('id', eventId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['networking_event_connections', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('networking_event_connections')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createConnection = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !contactName) throw new Error('Missing required fields');

      // Create the event connection
      const { data, error } = await supabase
        .from('networking_event_connections')
        .insert({
          user_id: user.id,
          event_id: eventId,
          contact_id: null,
          contact_name: contactName,
          contact_title: contactTitle,
          contact_company: contactCompany,
          contact_email: contactEmail,
          contact_linkedin: contactLinkedin,
          conversation_notes: conversationNotes,
          relationship_value: relationshipValue,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to professional_contacts
      const nameParts = contactName.trim().split(' ');
      const firstName = nameParts[0] || contactName;
      const lastName = nameParts.slice(1).join(' ') || '';

      const howWeMet = eventDetails?.event_name 
        ? `from event: ${eventDetails.event_name}`
        : 'Met at networking event';

      const strengthMap: Record<string, string> = {
        'low': 'weak',
        'medium': 'moderate',
        'high': 'strong'
      };

      const { error: contactError } = await supabase
        .from('professional_contacts')
        .insert({
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          email: contactEmail || null,
          phone: null,
          linkedin_url: contactLinkedin || null,
          current_company: contactCompany || null,
          current_title: contactTitle || null,
          relationship_type: 'professional',
          relationship_strength: strengthMap[relationshipValue] || 'moderate',
          how_we_met: howWeMet,
          tags: eventDetails?.event_name ? [`event:${eventDetails.event_name}`] : ['networking-event'],
          professional_notes: conversationNotes || null,
          last_contacted_at: new Date().toISOString(),
        });

      if (contactError) {
        console.error('Error adding to professional contacts:', contactError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['networking_event_connections', eventId] });
      queryClient.invalidateQueries({ queryKey: ['professional-contacts'] });
      toast.success('Connection added and saved to My Contacts');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add connection');
    },
  });

  const quickAddConnections = useMutation({
    mutationFn: async (count: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const connections = [];
      for (let i = 1; i <= count; i++) {
        connections.push({
          user_id: user.id,
          event_id: eventId,
          contact_id: null,
          contact_name: `Connection #${i}`,
          contact_title: null,
          contact_company: null,
          contact_email: null,
          contact_linkedin: null,
          conversation_notes: 'Quick added - update with details later',
          relationship_value: 'medium',
        });
      }

      const { data, error } = await supabase
        .from('networking_event_connections')
        .insert(connections)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.refetchQueries({ queryKey: ['networking_event_connections', eventId] });
      toast.success(`Added ${data?.length || 0} connections`);
      setIsQuickAddOpen(false);
      setQuickAddCount("");
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add connections');
    },
  });

  const markFollowUpComplete = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('networking_event_connections')
        .update({
          follow_up_completed: true,
          follow_up_date: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['networking_event_connections', eventId] });
      toast.success('Follow-up marked as completed!');
    },
    onError: (error: any) => {
      console.error('Error marking follow-up complete:', error);
      toast.error('Failed to mark follow-up complete');
    },
  });

  const resetForm = () => {
    setContactName("");
    setContactTitle("");
    setContactCompany("");
    setContactEmail("");
    setContactLinkedin("");
    setConversationNotes("");
    setRelationshipValue("medium");
  };

  const getValueVariant = (value: string): "default" | "secondary" | "outline" => {
    switch (value) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const handleQuickAdd = () => {
    const count = parseInt(quickAddCount);
    if (isNaN(count) || count < 1 || count > 50) {
      toast.error('Please enter a number between 1 and 50');
      return;
    }
    quickAddConnections.mutate(count);
  };

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader>
        <div className="flex justify-between items-center gap-2">
          <CardTitle className="flex items-center gap-2 min-w-0">
            <Users className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">Connections ({connections.length})</span>
          </CardTitle>
          <div className="flex gap-2 flex-shrink-0">
            {/* Quick Add Button */}
            <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Hash className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Quick Add</span>
                  <span className="sm:hidden">+#</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Quick Add Connections</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Enter the number of contacts you made at this event. You can add details later.
                  </p>
                  <div>
                    <Label>Number of Contacts</Label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={quickAddCount}
                      onChange={(e) => setQuickAddCount(e.target.value)}
                      placeholder="e.g., 5"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && quickAddCount) {
                          handleQuickAdd();
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleQuickAdd}
                    disabled={!quickAddCount || quickAddConnections.isPending}
                    className="w-full"
                  >
                    {quickAddConnections.isPending ? 'Adding...' : 'Add Connections'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Detailed Add Button */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex-shrink-0">
                  <Plus className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Add Connection</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[90vw] sm:w-[95vw] max-w-2xl max-h-[80vh] overflow-y-auto overflow-x-hidden">
                <DialogHeader>
                  <DialogTitle className="break-words">Add New Connection</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Name *</Label>
                      <Input
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={contactTitle}
                        onChange={(e) => setContactTitle(e.target.value)}
                        placeholder="Software Engineer"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Company</Label>
                    <Input
                      value={contactCompany}
                      onChange={(e) => setContactCompany(e.target.value)}
                      placeholder="Tech Corp"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <Label>LinkedIn URL</Label>
                      <Input
                        value={contactLinkedin}
                        onChange={(e) => setContactLinkedin(e.target.value)}
                        placeholder="linkedin.com/in/johndoe"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Conversation Notes</Label>
                    <Textarea
                      value={conversationNotes}
                      onChange={(e) => setConversationNotes(e.target.value)}
                      placeholder="What did you discuss? Key points to remember..."
                      className="min-h-[80px] sm:min-h-[100px] resize-none"
                    />
                  </div>

                  <div>
                    <Label>Relationship Value</Label>
                    <Select value={relationshipValue} onValueChange={setRelationshipValue}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High - Strong potential</SelectItem>
                        <SelectItem value="medium">Medium - Worth following up</SelectItem>
                        <SelectItem value="low">Low - Casual connection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={() => createConnection.mutate()}
                    disabled={!contactName || createConnection.isPending}
                    className="w-full"
                  >
                    Add Connection
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : connections.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">
            No connections recorded yet. Add people you met at this event!
          </p>
        ) : (
          <div className="space-y-3">
            {connections.map((connection: any) => (
              <div key={connection.id} className="border rounded-lg p-4 space-y-2 w-full max-w-full overflow-hidden">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold break-words">{connection.contact_name}</h4>
                    {connection.contact_title && (
                      <p className="text-sm text-muted-foreground break-words">
                        {connection.contact_title}
                        {connection.contact_company && ` at ${connection.contact_company}`}
                      </p>
                    )}
                  </div>
                  <Badge variant={getValueVariant(connection.relationship_value)} className="flex-shrink-0">
                    <span className="hidden sm:inline">{connection.relationship_value} value</span>
                    <span className="sm:hidden">{connection.relationship_value}</span>
                  </Badge>
                </div>

                {connection.conversation_notes && (
                  <p className="text-sm break-words">{connection.conversation_notes}</p>
                )}

                <div className="flex gap-2 flex-wrap">
                  {connection.contact_email && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedConnection(connection);
                        setIsMessageDialogOpen(true);
                      }}
                      className="flex-1 min-w-0 sm:flex-none"
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      <span className="truncate">Email</span>
                    </Button>
                  )}
                  {connection.contact_linkedin && (
                    <Button size="sm" variant="outline" asChild className="flex-1 min-w-0 sm:flex-none">
                      <a
                        href={connection.contact_linkedin.startsWith('http') ? connection.contact_linkedin : `https://${connection.contact_linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate"
                      >
                        <Linkedin className="h-4 w-4 mr-1" />
                        <span className="truncate">LinkedIn</span>
                      </a>
                    </Button>
                  )}
                  {!connection.follow_up_completed && (
                    <Button
                      size="sm"
                      onClick={() => markFollowUpComplete.mutate(connection.id)}
                      disabled={markFollowUpComplete.isPending}
                      className="flex-1 min-w-0 sm:flex-none"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span className="truncate">{markFollowUpComplete.isPending ? 'Marking...' : 'Mark Follow-up Done'}</span>
                    </Button>
                  )}
                  {connection.follow_up_completed && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Followed Up
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {selectedConnection && (
        <NetworkingEventMessageDialog
          open={isMessageDialogOpen}
          onOpenChange={setIsMessageDialogOpen}
          connection={selectedConnection}
          eventName={eventDetails?.event_name}
        />
      )}
    </Card>
  );
}
