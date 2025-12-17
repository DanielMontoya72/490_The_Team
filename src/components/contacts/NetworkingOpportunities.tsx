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
    <div className="space-y-6 w-full">
      {/* Discovery Section */}
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Sparkles className="h-6 w-6 flex-shrink-0 text-primary" />
            <span>Discover New Events</span>
          </CardTitle>
          <CardDescription>
            Use AI to find networking events tailored to your interests and location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="e.g., Technology, Healthcare"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interests">Interests</Label>
              <Input
                id="interests"
                placeholder="e.g., AI, Cloud, Startups"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., San Francisco, Virtual"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
          <Button
            onClick={() => discoverOpportunities.mutate()}
            disabled={discoverOpportunities.isPending}
            className="w-full md:w-auto"
            size="lg"
          >
            {discoverOpportunities.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Discovering Events...</span>
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                <span>Discover Events</span>
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Events Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-11 p-1 bg-muted rounded-lg">
          <TabsTrigger value="all" className="px-4 py-2 text-sm font-medium data-[state=active]:bg-background rounded-md">
            All Events
          </TabsTrigger>
          <TabsTrigger value="discovered" className="px-4 py-2 text-sm font-medium data-[state=active]:bg-background rounded-md">
            New
          </TabsTrigger>
          <TabsTrigger value="interested" className="px-4 py-2 text-sm font-medium data-[state=active]:bg-background rounded-md">
            Interested
          </TabsTrigger>
        </TabsList>

        {['all', 'discovered', 'interested'].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-6">
            <div className="min-h-[600px]">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {isLoading ? (
                  <div className="col-span-full flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : filteredOpportunities(tab === 'all' ? undefined : tab).length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">No events found</h3>
                    <p className="text-muted-foreground">Try discovering new events using the form above</p>
                  </div>
                ) : (
                  filteredOpportunities(tab === 'all' ? undefined : tab).map((event) => (
                    <Card key={event.id} className="w-full hover:shadow-lg transition-shadow">
                      <div className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="text-2xl flex-shrink-0">{getTypeIcon(event.opportunity_type)}</span>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold leading-tight mb-2 line-clamp-2">{event.event_name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{event.event_description}</p>
                            
                            <div className="flex flex-wrap items-center gap-3 mb-3 text-sm text-muted-foreground">
                              {event.event_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{format(new Date(event.event_date), 'MMM d, yyyy')}</span>
                                </div>
                              )}
                              {event.event_location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <span className="truncate">{event.event_location}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between mb-3">
                              <Badge variant="outline" className="text-sm px-2 py-1">
                                {event.relevance_score}% Match
                              </Badge>
                              {event.diversity_focus && (
                                <Badge variant="secondary" className="text-sm px-2 py-1">D&I Focus</Badge>
                              )}
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => setSelectedEventId(event.id)}
                                className="flex-1"
                              >
                                <Users className="h-4 w-4 mr-1" />
                                Manage
                              </Button>
                              {event.status === 'discovered' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateStatus.mutate({ id: event.id, status: 'interested' })}
                                  className="flex-1"
                                >
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  Interested
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Event Details Dialog */}
      {selectedEventId && (
        <Dialog open={!!selectedEventId} onOpenChange={() => setSelectedEventId(null)}>
          <DialogContent className="w-[90vw] sm:w-[95vw] max-w-lg sm:max-w-4xl h-[85vh] sm:h-[90vh] max-h-[85vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6">
            <DialogHeader className="pb-3 sm:pb-4">
              <DialogTitle className="text-base sm:text-lg lg:text-xl break-words">Event Details & Management</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4 lg:space-y-6 w-full overflow-x-hidden">
              <div className="w-full overflow-x-hidden">
                <NetworkingEventGoals eventId={selectedEventId} />
              </div>
              <div className="w-full overflow-x-hidden">
                <NetworkingEventConnections eventId={selectedEventId} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}