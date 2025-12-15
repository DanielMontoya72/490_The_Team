import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Calendar, MapPin, Users, UserCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { NetworkingEventGoals } from "./NetworkingEventGoals";
import { NetworkingEventConnections } from "./NetworkingEventConnections";

export function NetworkingOpportunities() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [industry, setIndustry] = useState("");
  const [interests, setInterests] = useState("");
  const [location, setLocation] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['networking-opportunities'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('networking_opportunities')
        .select('*')
        .eq('user_id', user.id)
        .order('relevance_score', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const discoverOpportunities = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('discover-networking-opportunities', {
        body: {
          industry,
          interests: interests.split(',').map(i => i.trim()).filter(Boolean),
          location
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networking-opportunities'] });
      toast({
        title: "Opportunities Discovered!",
        description: "AI has found networking events for you."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Discovery Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, field }: { id: string; status: string; field?: string }) => {
      const updates: any = { status };
      if (field === 'registered') updates.registered_at = new Date().toISOString();
      if (field === 'attended') updates.attended_at = new Date().toISOString();

      const { error } = await supabase
        .from('networking_opportunities')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networking-opportunities'] });
      toast({ title: "Status Updated" });
    }
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'conference': return '🎤';
      case 'meetup': return '👥';
      case 'webinar': return '💻';
      case 'alumni_event': return '🎓';
      case 'industry_event': return '🏢';
      default: return '📅';
    }
  };

  const filteredOpportunities = (status?: string) => {
    if (!opportunities) return [];
    if (!status) return opportunities;
    return opportunities.filter(o => o.status === status);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Discover Networking Events
          </CardTitle>
          <CardDescription>
            Find conferences, meetups, and events to expand your network
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                placeholder="Technology, Finance, Healthcare"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Interests</Label>
              <Input
                placeholder="AI, Cloud, Entrepreneurship"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="San Francisco, Virtual"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={() => discoverOpportunities.mutate()}
            disabled={discoverOpportunities.isPending}
            className="w-full"
          >
            {discoverOpportunities.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Discovering Events...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Discover Networking Opportunities
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({opportunities?.length || 0})</TabsTrigger>
          <TabsTrigger value="discovered">New ({filteredOpportunities('discovered').length})</TabsTrigger>
          <TabsTrigger value="interested">Interested ({filteredOpportunities('interested').length})</TabsTrigger>
          <TabsTrigger value="registered">Registered ({filteredOpportunities('registered').length})</TabsTrigger>
          <TabsTrigger value="attended">Attended ({filteredOpportunities('attended').length})</TabsTrigger>
        </TabsList>

        {['all', 'discovered', 'interested', 'registered', 'attended'].map(tab => (
          <TabsContent key={tab} value={tab}>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : filteredOpportunities(tab === 'all' ? undefined : tab).length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center p-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No events found in this category</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredOpportunities(tab === 'all' ? undefined : tab).map((event) => (
                    <Card key={event.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">{getTypeIcon(event.opportunity_type)}</span>
                              <CardTitle className="text-lg">{event.event_name}</CardTitle>
                              {event.diversity_focus && (
                                <Badge variant="secondary">Diversity & Inclusion</Badge>
                              )}
                            </div>
                            <CardDescription>{event.event_description}</CardDescription>
                          </div>
                          <Badge variant={event.relevance_score >= 80 ? 'default' : event.relevance_score >= 60 ? 'secondary' : 'outline'}>
                            {event.relevance_score}% Match
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{event.event_date ? format(new Date(event.event_date), 'PPP') : 'Date TBA'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{event.event_location || 'Location TBA'}</span>
                          </div>
                          {event.organizer && (
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>Organized by {event.organizer}</span>
                            </div>
                          )}
                        </div>

                        {Array.isArray(event.speakers) && event.speakers.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Featured Speakers:</p>
                            <div className="space-y-1">
                              {event.speakers.slice(0, 3).map((speaker: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <UserCheck className="h-3 w-3" />
                                  <span>{speaker.name} - {speaker.title}</span>
                                </div>
                              ))}
                              {event.speakers.length > 3 && (
                                <p className="text-sm text-muted-foreground">+ {event.speakers.length - 3} more speakers</p>
                              )}
                            </div>
                          </div>
                        )}

                        {Array.isArray(event.topics) && event.topics.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Topics:</p>
                            <div className="flex flex-wrap gap-2">
                              {event.topics.map((topic: string, idx: number) => (
                                <Badge key={idx} variant="outline">{topic}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {Array.isArray(event.potential_contacts) && event.potential_contacts.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Who You'll Meet:</p>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                              {event.potential_contacts.slice(0, 3).map((contact: string, idx: number) => (
                                <li key={idx}>{contact}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2 flex-wrap">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setSelectedEventId(event.id)}
                          >
                            Manage Event
                          </Button>
                          {event.status === 'discovered' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateStatus.mutate({ id: event.id, status: 'interested' })}
                              >
                                Mark as Interested
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateStatus.mutate({ id: event.id, status: 'dismissed' })}
                              >
                                Not Interested
                              </Button>
                            </>
                          )}
                          {event.status === 'interested' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatus.mutate({ id: event.id, status: 'registered', field: 'registered' })}
                            >
                              Mark as Registered
                            </Button>
                          )}
                          {event.status === 'registered' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatus.mutate({ id: event.id, status: 'attended', field: 'attended' })}
                            >
                              Mark as Attended
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>

      {/* Event Details Dialog */}
      {selectedEventId && (
        <Dialog open={!!selectedEventId} onOpenChange={() => setSelectedEventId(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Event Details & Management</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <NetworkingEventGoals eventId={selectedEventId} />
              <NetworkingEventConnections eventId={selectedEventId} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}