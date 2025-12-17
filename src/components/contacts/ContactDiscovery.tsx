import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Users, TrendingUp, Mail, MapPin, Award, Network, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { MessageTemplateDialog } from "./MessageTemplateDialog";
export function ContactDiscovery() {
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const [targetCompanies, setTargetCompanies] = useState("");
  const [targetRoles, setTargetRoles] = useState("");
  const [educationalInstitutions, setEducationalInstitutions] = useState("");
  const [currentIndustry, setCurrentIndustry] = useState("");
  const [interests, setInterests] = useState("");
  const [location, setLocation] = useState("");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const {
    data: user
  } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      return user;
    }
  });
  const {
    data: suggestions,
    isLoading: loadingSuggestions,
    refetch
  } = useQuery({
    queryKey: ['contact-suggestions'],
    queryFn: async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const {
        data,
        error
      } = await supabase.from('contact_suggestions').select('*').eq('user_id', user.id).neq('status', 'dismissed') // Exclude dismissed contacts
      .order('relevance_score', {
        ascending: false
      });
      if (error) throw error;
      console.log('Fetched contact suggestions:', data?.length, 'contacts');
      console.log('Sample:', data?.[0]);
      return data;
    }
  });
  // Calculate metrics directly from contact_suggestions data
  const metrics = {
    suggestions_generated: suggestions?.length || 0,
    contacts_reached_out: suggestions?.filter(s => s.contacted_at).length || 0,
    connections_made: suggestions?.filter(s => s.connected_at).length || 0,
    response_rate: null // Will be calculated if needed
  };
  const generateSuggestions = useMutation({
    mutationFn: async () => {
      // Only delete suggestions that are truly still in suggested state and not contacted/connected
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const {
        error: deleteError
      } = await supabase.from('contact_suggestions').delete().eq('user_id', user.id).eq('status', 'suggested').is('contacted_at', null) // Don't delete if contacted
      .is('connected_at', null); // Don't delete if connected

      if (deleteError) throw deleteError;

      // Then generate new suggestions
      const {
        data,
        error
      } = await supabase.functions.invoke('generate-contact-suggestions', {
        body: {
          targetCompanies: targetCompanies.split(',').map(c => c.trim()).filter(Boolean),
          targetRoles: targetRoles.split(',').map(r => r.trim()).filter(Boolean),
          educationalInstitutions: educationalInstitutions.split(',').map(e => e.trim()).filter(Boolean),
          currentIndustry,
          interests: interests.split(',').map(i => i.trim()).filter(Boolean),
          location
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['contact-suggestions']
      });
      toast({
        title: "Contacts Discovered!",
        description: "AI has generated fresh strategic contact suggestions for you."
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
  const updateContactStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      field,
      contactData
    }: {
      id: string;
      status: string;
      field?: string;
      contactData?: any;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updates: any = {
        status
      };
      // When contacted, mark with contacted_at but NOT connected_at (pure contacted state)
      if (field === 'contacted') {
        updates.contacted_at = new Date().toISOString();
        updates.status = 'contacted';
      }
      if (field === 'connected') {
        updates.connected_at = new Date().toISOString();
        updates.status = 'connected';
        // If upgrading from contacted to connected, clear contacted_at 
        updates.contacted_at = null;
      }

      // Add to professional_contacts (My Contacts) when contacted or connected
      if ((field === 'contacted' || field === 'connected') && contactData) {
        const nameParts = contactData.contact_name?.split(' ') || [''];
        const professionalContact = {
          user_id: user.id,
          first_name: nameParts[0] || '',
          last_name: nameParts.slice(1).join(' ') || '',
          email: contactData.email,
          phone: contactData.phone,
          linkedin_url: contactData.linkedin_url,
          current_company: contactData.contact_company,
          current_title: contactData.contact_title,
          location: contactData.contact_location,
          birthday: contactData.birthday,
          relationship_type: 'colleague',
          relationship_strength: 'moderate',
          shared_interests: contactData.mutual_interests || [],
        };

        // Check if contact already exists
        const { data: existing } = await supabase
          .from('professional_contacts')
          .select('id')
          .eq('user_id', user.id)
          .eq('first_name', professionalContact.first_name)
          .eq('last_name', professionalContact.last_name)
          .maybeSingle();

        if (!existing) {
          await supabase.from('professional_contacts').insert(professionalContact);
        }
      }
      const {
        error
      } = await supabase.from('contact_suggestions').update(updates).eq('id', id);
      if (error) throw error;

      // Trigger relationship health calculation for contacted/connected contacts
      if (field === 'contacted' || field === 'connected') {
        const {
          data: {
            session
          }
        } = await supabase.auth.getSession();
        if (session) {
          await supabase.functions.invoke('calculate-relationship-health', {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });
        }
      }
    },
    onSuccess: async () => {
      console.log('Contact status updated, invalidating queries...');
      await queryClient.invalidateQueries({
        queryKey: ['contact-suggestions']
      });
      await queryClient.invalidateQueries({
        queryKey: ['professional-contacts-maintenance']
      });
      await queryClient.invalidateQueries({
        queryKey: ['professional-contacts']
      });

      // Force refetch to ensure UI updates immediately
      await refetch();
      toast({
        title: "Contact Updated",
        description: "Contact status has been updated successfully."
      });
    },
    onError: (error: any) => {
      console.error('Error updating contact status:', error);
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  const handleContactClick = (contact: any) => {
    // Set default email if contact doesn't have one
    const contactWithEmail = {
      ...contact,
      email: contact.email || 'theteamnjit5@gmail.com'
    };
    setSelectedContact(contactWithEmail);
    setMessageDialogOpen(true);
  };
  const handleMessageSent = async (subject: string, message: string) => {
    if (!selectedContact) return;
    try {
      // Update status to 'contacted' and set contacted_at timestamp + add to My Contacts
      await updateContactStatus.mutateAsync({
        id: selectedContact.id,
        status: 'contacted',
        field: 'contacted',
        contactData: selectedContact
      });
      setMessageDialogOpen(false);
      setSelectedContact(null);
      toast({
        title: "Message Sent!",
        description: "Contact added to My Contacts and marked as connected."
      });
    } catch (error) {
      console.error('Error updating contact status:', error);
      toast({
        title: "Message sent but status update failed",
        description: "Please try marking as contacted manually.",
        variant: "destructive"
      });
    }
  };
  const getConnectionTypeIcon = (type: string) => {
    switch (type) {
      case 'second_degree':
      case 'third_degree':
        return <Network className="h-4 w-4" />;
      case 'alumni':
        return <Award className="h-4 w-4" />;
      case 'industry_leader':
        return <TrendingUp className="h-4 w-4" />;
      case 'speaker':
        return <Users className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };
  const isAlreadySaved = (contact: any) => {
    if (!suggestions) return false;
    // Check if this contact has already been contacted or connected
    return suggestions.some(s => 
      s.id !== contact.id && 
      s.contact_name === contact.contact_name &&
      (s.contacted_at || s.connected_at)
    );
  };

  const filteredSuggestions = (status?: string) => {
    if (!suggestions) return [];

    // For "All" tab, exclude contacted and connected contacts (show only suggested)
    if (!status) {
      return suggestions.filter(s => s.status === 'suggested' && !s.contacted_at && !s.connected_at);
    }

    // For contacted tab, show contacts with contacted_at timestamp but NOT connected_at (pure contacted state)
    if (status === 'contacted') {
      return suggestions.filter(s => s.contacted_at && !s.connected_at);
    }

    // For connected tab, show contacts with status 'connected' OR those with connected_at set, sorted by most recent first
    if (status === 'connected') {
      return suggestions
        .filter(s => s.status === 'connected' || s.connected_at)
        .sort((a, b) => {
          const dateA = new Date(a.connected_at || 0).getTime();
          const dateB = new Date(b.connected_at || 0).getTime();
          return dateB - dateA; // Most recent first
        });
    }
    return suggestions.filter(s => s.status === status);
  };
  return <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Contact Discovery</h2>
        <p className="text-muted-foreground mt-1">
          Get AI-powered contact suggestions based on your career goals
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI-Powered Contact Suggestions
          </CardTitle>
          <CardDescription>
            Generate contact suggestions based on your career goals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Companies (comma-separated)</Label>
              <Input placeholder="Google, Microsoft, Amazon" value={targetCompanies} onChange={e => setTargetCompanies(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Target Roles (comma-separated)</Label>
              <Input placeholder="Software Engineer, Product Manager" value={targetRoles} onChange={e => setTargetRoles(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Educational Institutions</Label>
              <Input placeholder="MIT, Stanford" value={educationalInstitutions} onChange={e => setEducationalInstitutions(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Current Industry</Label>
              <Input placeholder="Technology, Finance" value={currentIndustry} onChange={e => setCurrentIndustry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Professional Interests</Label>
              <Input placeholder="AI, Machine Learning, Cloud Computing" value={interests} onChange={e => setInterests(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input placeholder="San Francisco, CA" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
          </div>
          <Button onClick={() => generateSuggestions.mutate()} disabled={generateSuggestions.isPending} className="w-full">
            {generateSuggestions.isPending ? <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Discovering Contacts...
              </> : <>
                <Sparkles className="mr-2 h-4 w-4" />
                Discover Strategic Contacts
              </>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discovery Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Suggestions Generated</p>
              <p className="text-2xl font-bold">{metrics.suggestions_generated}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Contacts Reached</p>
              <p className="text-2xl font-bold">{metrics.contacts_reached_out}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Connections Made</p>
              <p className="text-2xl font-bold">{metrics.connections_made}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Response Rate</p>
              <p className="text-2xl font-bold">N/A</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full max-w-full overflow-hidden">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-1 h-auto p-1">
          <TabsTrigger value="all" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-background">
            <span className="hidden sm:inline">Suggested ({filteredSuggestions('suggested').length})</span>
            <span className="sm:hidden">All ({filteredSuggestions('suggested').length})</span>
          </TabsTrigger>
          <TabsTrigger value="contacted" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-background">
            <span className="hidden sm:inline">Contacted ({filteredSuggestions('contacted').length})</span>
            <span className="sm:hidden">Contacted ({filteredSuggestions('contacted').length})</span>
          </TabsTrigger>
          <TabsTrigger value="connected" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-background">
            <span className="hidden sm:inline">Connected ({filteredSuggestions('connected').length})</span>
            <span className="sm:hidden">Connected ({filteredSuggestions('connected').length})</span>
          </TabsTrigger>
        </TabsList>

        {['all', 'contacted', 'connected'].map(tab => <TabsContent key={tab} value={tab}>
            <ScrollArea className="h-[400px] sm:h-[600px]">
              <div className="space-y-3 sm:space-y-4 w-full max-w-full overflow-hidden">
                {loadingSuggestions ? <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div> : filteredSuggestions(tab === 'all' ? 'suggested' : tab).length === 0 ? <Card className="w-full max-w-full">
                    <CardContent className="flex flex-col items-center justify-center p-6 sm:p-8">
                      <Users className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
                      <p className="text-sm sm:text-base text-muted-foreground text-center">No contacts found in this category</p>
                    </CardContent>
                  </Card> : filteredSuggestions(tab === 'all' ? 'suggested' : tab).map(contact => <Card key={contact.id} className="w-full max-w-full overflow-hidden">
                      <CardHeader className="pb-3 sm:pb-4">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0 w-full">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2">
                              <CardTitle className="text-base sm:text-lg break-words">{contact.contact_name}</CardTitle>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                  {getConnectionTypeIcon(contact.connection_type)}
                                  <span className="hidden sm:inline">{contact.connection_type.replace('_', ' ')}</span>
                                  <span className="sm:hidden">{contact.connection_type.split('_')[0]}</span>
                                </Badge>
                                {tab === 'all' && isAlreadySaved(contact) && (
                                  <Badge variant="secondary" className="text-xs">Saved</Badge>
                                )}
                              </div>
                            </div>
                            <CardDescription className="break-words">
                              {contact.contact_title} {contact.contact_company && `at ${contact.contact_company}`}
                            </CardDescription>
                            {contact.contact_location && <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{contact.contact_location}</span>
                              </p>}
                            {contact.birthday && <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                🎂 Birthday: {new Date(contact.birthday).toLocaleDateString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric'
                      })}
                              </p>}
                          </div>
                          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
                            <Badge variant={contact.relevance_score >= 80 ? 'default' : contact.relevance_score >= 60 ? 'secondary' : 'outline'} className="text-xs">
                              {contact.relevance_score}% Match
                            </Badge>
                            <Progress value={contact.relevance_score} className="w-16 sm:w-20" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 sm:space-y-4 w-full overflow-hidden">
                        <div>
                          <p className="text-xs sm:text-sm font-medium mb-2">Why Connect:</p>
                          <p className="text-xs sm:text-sm text-muted-foreground break-words">{contact.suggestion_reason}</p>
                        </div>

                        {Array.isArray(contact.connection_path) && contact.connection_path.length > 0 && <div>
                            <p className="text-xs sm:text-sm font-medium mb-2">Connection Path:</p>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground overflow-x-auto">
                              <span className="flex-shrink-0">You</span>
                              {(contact.connection_path as string[]).map((conn: string, idx: number) => <div key={idx} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                  <span className="text-muted-foreground">→</span>
                                  <span className="break-words">{conn}</span>
                                </div>)}
                              <span className="text-muted-foreground flex-shrink-0">→</span>
                              <span className="font-medium break-words">{contact.contact_name}</span>
                            </div>
                          </div>}

                        {Array.isArray(contact.mutual_interests) && contact.mutual_interests.length > 0 && <div>
                            <p className="text-xs sm:text-sm font-medium mb-2">Mutual Interests:</p>
                            <div className="flex flex-wrap gap-1 sm:gap-2">
                              {contact.mutual_interests.map((interest: string, idx: number) => <Badge key={idx} variant="secondary" className="text-xs">{interest}</Badge>)}
                            </div>
                          </div>}

                        {contact.diversity_inclusion_tags && contact.diversity_inclusion_tags.length > 0 && <div>
                            <p className="text-xs sm:text-sm font-medium mb-2">Diversity & Inclusion:</p>
                            <div className="flex flex-wrap gap-1 sm:gap-2">
                              {contact.diversity_inclusion_tags.map((tag: string, idx: number) => <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>)}
                            </div>
                          </div>}

                        <div className="flex flex-col sm:flex-row gap-2 pt-2 w-full">
                          {contact.status === 'suggested' && <>
                              <Button size="sm" onClick={() => handleContactClick(contact)} className="w-full sm:w-auto">
                                <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="text-xs sm:text-sm">Send Message</span>
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => updateContactStatus.mutate({
                      id: contact.id,
                      status: 'connected',
                      field: 'connected',
                      contactData: contact
                    })} className="w-full sm:w-auto">
                                <span className="text-xs sm:text-sm">Mark Connected</span>
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => updateContactStatus.mutate({
                      id: contact.id,
                      status: 'dismissed'
                    })} className="w-full sm:w-auto">
                                <span className="text-xs sm:text-sm">Dismiss</span>
                              </Button>
                            </>}
                          {contact.status === 'contacted' && <>
                              <Button size="sm" onClick={() => handleContactClick(contact)} className="w-full sm:w-auto">
                                <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="text-xs sm:text-sm">Follow-up</span>
                              </Button>
                              <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 w-full sm:w-auto" onClick={() => updateContactStatus.mutate({
                      id: contact.id,
                      status: 'connected',
                      field: 'connected',
                      contactData: contact
                    })}>
                                <Network className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="text-xs sm:text-sm">Connected</span>
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => updateContactStatus.mutate({
                      id: contact.id,
                      status: 'dismissed'
                    })} className="w-full sm:w-auto">
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="text-xs sm:text-sm">Delete</span>
                              </Button>
                            </>}
                          {contact.status === 'connected' && <>
                              <Button size="sm" onClick={() => handleContactClick(contact)} className="w-full sm:w-auto">
                                <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="text-xs sm:text-sm">Message</span>
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => updateContactStatus.mutate({
                      id: contact.id,
                      status: 'dismissed'
                    })} className="w-full sm:w-auto">
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="text-xs sm:text-sm">Dismiss</span>
                              </Button>
                            </>}
                        </div>
                      </CardContent>
                    </Card>)}
              </div>
            </ScrollArea>
          </TabsContent>)}
      </Tabs>

      {selectedContact && <MessageTemplateDialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen} contact={{
      id: selectedContact.id,
      first_name: selectedContact.contact_name.split(' ')[0],
      last_name: selectedContact.contact_name.split(' ').slice(1).join(' '),
      email: selectedContact.email || 'theteamnjit5@gmail.com',
      current_title: selectedContact.contact_title,
      current_company: selectedContact.contact_company,
      birthday: selectedContact.birthday,
      shared_interests: selectedContact.mutual_interests
    }} templateType="check_in" onSend={handleMessageSent} />}
    </div>;
}