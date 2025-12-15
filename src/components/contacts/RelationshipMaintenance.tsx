import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Bell, Cake, Send, TrendingUp, Heart, AlertCircle, Sparkles, Mail, Calendar, Newspaper, Award } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { format, addDays, isBefore, isWithinInterval } from "date-fns";
import { MessageTemplateDialog } from "./MessageTemplateDialog";
import { IndustryNewsDialog } from "./IndustryNewsDialog";
import { RelationshipSuggestionsDialog } from "./RelationshipSuggestionsDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function RelationshipMaintenance() {
  const queryClient = useQueryClient();
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [newsDialogOpen, setNewsDialogOpen] = useState(false);
  const [suggestionsDialogOpen, setSuggestionsDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>('check_in');
  const [selectedNewsForTemplate, setSelectedNewsForTemplate] = useState<any>(null);
  const [newsContactId, setNewsContactId] = useState<string>("");
  const [selectedHealthContactId, setSelectedHealthContactId] = useState<string>("");

  // Fetch all contacts with birthday and relationship data
  const { data: contacts, isLoading: loadingContacts } = useQuery({
    queryKey: ['professional-contacts-maintenance'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch from professional_contacts
      const { data: professionalContacts, error: profError } = await supabase
        .from('professional_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('last_contacted_at', { ascending: true });

      if (profError) throw profError;

      // Fetch contacted suggestions from contact_suggestions
      const { data: contactedSuggestions, error: sugError } = await supabase
        .from('contact_suggestions')
        .select('*')
        .eq('user_id', user.id)
        .not('contacted_at', 'is', null)
        .order('contacted_at', { ascending: true });

      if (sugError) throw sugError;

      // Normalize contacted suggestions to match professional_contacts structure
      const normalizedSuggestions = (contactedSuggestions || []).map(suggestion => ({
        id: suggestion.id,
        user_id: suggestion.user_id,
        first_name: suggestion.contact_name?.split(' ')[0] || '',
        last_name: suggestion.contact_name?.split(' ').slice(1).join(' ') || '',
        email: suggestion.email,
        phone: suggestion.phone,
        current_company: suggestion.contact_company,
        current_title: suggestion.contact_title,
        linkedin_url: suggestion.linkedin_url,
        location: suggestion.contact_location,
        last_contacted_at: suggestion.contacted_at,
        relationship_strength: 'weak',
        shared_interests: suggestion.mutual_interests || [],
        opportunities_generated: 0,
        birthday: suggestion.birthday,
        created_at: suggestion.created_at,
        updated_at: suggestion.updated_at,
        _source: 'contact_suggestion' // Add marker to identify source
      }));

      // Combine and deduplicate by full name
      const allContacts = [...(professionalContacts || []), ...normalizedSuggestions];
      
      // Deduplicate by full name (first_name + last_name)
      const uniqueContacts = new Map();
      allContacts.forEach(contact => {
        const fullName = `${contact.first_name} ${contact.last_name}`.trim().toLowerCase();
        if (!uniqueContacts.has(fullName)) {
          uniqueContacts.set(fullName, contact);
        }
      });
      
      const deduplicatedContacts = Array.from(uniqueContacts.values());
      
      // Sort by last contact date
      deduplicatedContacts.sort((a, b) => {
        const dateA = a.last_contacted_at ? new Date(a.last_contacted_at).getTime() : 0;
        const dateB = b.last_contacted_at ? new Date(b.last_contacted_at).getTime() : 0;
        return dateA - dateB;
      });

      return deduplicatedContacts;
    }
  });

  // Fetch upcoming birthdays (ages 15-70 only)
  const upcomingBirthdays = contacts?.filter(contact => {
    if (!contact.birthday) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Parse date correctly to avoid timezone issues
    const [year, month, day] = contact.birthday.split('-').map(Number);
    
    // Calculate age and validate 15-70 range
    const birthDate = new Date(year, month - 1, day);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
    
    // Filter out contacts outside age range
    if (actualAge < 15 || actualAge > 70) return false;
    
    let birthdayThisYear = new Date(today.getFullYear(), month - 1, day);
    
    // If birthday already passed this year, check next year
    if (birthdayThisYear < today) {
      birthdayThisYear = new Date(today.getFullYear() + 1, month - 1, day);
    }
    
    const in30Days = addDays(today, 30);
    return isWithinInterval(birthdayThisYear, { start: today, end: in30Days });
  }).sort((a, b) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Parse dates correctly to avoid timezone issues
    const [yearA, monthA, dayA] = a.birthday!.split('-').map(Number);
    const [yearB, monthB, dayB] = b.birthday!.split('-').map(Number);
    let birthdayA = new Date(today.getFullYear(), monthA - 1, dayA);
    let birthdayB = new Date(today.getFullYear(), monthB - 1, dayB);
    
    // If birthday already passed this year, use next year
    if (birthdayA < today) {
      birthdayA = new Date(today.getFullYear() + 1, monthA - 1, dayA);
    }
    if (birthdayB < today) {
      birthdayB = new Date(today.getFullYear() + 1, monthB - 1, dayB);
    }
    
    return birthdayA.getTime() - birthdayB.getTime();
  });

  // Fetch contacts needing check-in (not contacted in 30+ days)
  const needsCheckIn = contacts?.filter(contact => {
    if (!contact.last_contacted_at) return true;
    const daysSinceContact = Math.floor((Date.now() - new Date(contact.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceContact >= 30;
  }).slice(0, 10);

  // Fetch relationship health metrics
  const { data: healthMetrics, isLoading: loadingHealth, refetch: refetchHealth } = useQuery({
    queryKey: ['relationship-health-metrics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Trigger calculation first to get latest data
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.functions.invoke('calculate-relationship-health', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
      }

      const { data: metrics, error } = await supabase
        .from('relationship_health_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('health_score', { ascending: true });

      if (error) throw error;

      // Enrich metrics with contact details from both tables
      const enrichedMetrics = await Promise.all((metrics || []).map(async (metric) => {
        // Try professional_contacts first
        const { data: profContact } = await supabase
          .from('professional_contacts')
          .select('first_name, last_name, current_company, relationship_strength, opportunities_generated')
          .eq('id', metric.contact_id)
          .maybeSingle();

        if (profContact) {
          return {
            ...metric,
            professional_contacts: profContact
          };
        }

        // If not found, try contact_suggestions
        const { data: suggContact } = await supabase
          .from('contact_suggestions')
          .select('contact_name, contact_company')
          .eq('id', metric.contact_id)
          .maybeSingle();

        if (suggContact) {
          return {
            ...metric,
            professional_contacts: {
              first_name: suggContact.contact_name?.split(' ')[0] || '',
              last_name: suggContact.contact_name?.split(' ').slice(1).join(' ') || '',
              current_company: suggContact.contact_company,
              relationship_strength: 'weak',
              opportunities_generated: 0
            }
          };
        }

        return metric;
      }));

      return enrichedMetrics;
    }
  });

  // Calculate health metrics mutation
  const calculateHealth = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('calculate-relationship-health', {
        body: {}
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchHealth();
      toast.success('Relationship health metrics updated!');
    },
    onError: (error) => {
      console.error('Error calculating health:', error);
      toast.error('Failed to calculate health metrics');
    }
  });


  // Fetch industry news suggestions for selected news contact
  const { data: newsForContact, isLoading: loadingNews } = useQuery({
    queryKey: ['industry-news', newsContactId],
    enabled: !!newsContactId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('suggest-industry-news', {
        body: { contactId: newsContactId }
      });
      if (error) throw error;
      return data;
    }
  });

  // Get the actual contact object for the news contact
  const newsContact = contacts?.find(c => c.id === newsContactId);

  // Generate relationship suggestions for contacts needing attention
  const generateSuggestions = useMutation({
    mutationFn: async () => {
      const contactsToProcess = needsCheckIn?.slice(0, 5) || []; // Process top 5 contacts needing check-in
      
      if (contactsToProcess.length === 0) {
        throw new Error("No contacts need attention at this time");
      }

      const results = await Promise.allSettled(
        contactsToProcess.map(contact =>
          supabase.functions.invoke('generate-relationship-suggestions', {
            body: { contactId: contact.id }
          })
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;
      
      return { successCount, failCount, total: contactsToProcess.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['professional-contacts-maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['relationship-health-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['relationship-suggestions'] });
      
      if (data.failCount > 0) {
        toast.success(`Generated insights for ${data.successCount}/${data.total} contacts`);
      } else {
        toast.success(`Generated insights for ${data.total} contacts!`);
      }
    },
    onError: (error) => {
      console.error('Error generating suggestions:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate insights');
    }
  });

  // Log relationship activity
  const logActivity = useMutation({
    mutationFn: async ({ contactId, activityType, notes, templateId }: { 
      contactId: string; 
      activityType: string; 
      notes?: string;
      templateId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('relationship_activities')
        .insert({
          user_id: user?.id,
          contact_id: contactId,
          activity_type: activityType,
          notes,
          template_used: templateId
        });

      if (error) throw error;

      // Determine if contact is from professional_contacts or contact_suggestions
      const contact = contacts?.find(c => c.id === contactId);
      const isFromSuggestions = contact && (contact as any)._source === 'contact_suggestion';

      // Update last_contacted_at or contacted_at depending on source
      if (isFromSuggestions) {
        await supabase
          .from('contact_suggestions')
          .update({ contacted_at: new Date().toISOString() })
          .eq('id', contactId);
      } else {
        await supabase
          .from('professional_contacts')
          .update({ last_contacted_at: new Date().toISOString() })
          .eq('id', contactId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professional-contacts-maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['relationship-health-metrics'] });
      toast.success('Activity logged!');
    }
  });

  const openTemplateDialog = (contact: any, templateType: string) => {
    // Set default email if contact doesn't have one (for AI-generated contacts)
    const contactWithEmail = {
      ...contact,
      email: contact.email || 'theteamnjit5@gmail.com'
    };
    setSelectedContact(contactWithEmail);
    setSelectedTemplateType(templateType);
    setTemplateDialogOpen(true);
  };

  const handleSendMessage = (subject: string, message: string) => {
    logActivity.mutate({
      contactId: selectedContact.id,
      activityType: 'message',
      notes: `${subject}\n\n${message}`
    });
  };

  if (loadingContacts) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Relationship Maintenance</h2>
            <p className="text-muted-foreground">Stay connected with your professional network</p>
          </div>
          <Button 
            onClick={() => generateSuggestions.mutate()}
            disabled={generateSuggestions.isPending}
          >
            {generateSuggestions.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Generate Insights</>
            )}
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Upcoming Birthdays</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingBirthdays?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Next 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Needs Check-In</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{needsCheckIn?.length || 0}</div>
              <p className="text-xs text-muted-foreground">30+ days inactive</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Strong Relationships</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {contacts?.filter(c => c.relationship_strength === 'strong' || c.relationship_strength === 'very_strong').length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Active connections</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Opportunities Generated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {contacts?.reduce((sum, c) => sum + (c.opportunities_generated || 0), 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground">From network</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="birthdays" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="birthdays" className="gap-2">
              <Cake className="h-4 w-4" />
              Birthdays
            </TabsTrigger>
            <TabsTrigger value="checkins" className="gap-2">
              <Bell className="h-4 w-4" />
              Check-Ins
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-2">
              <Heart className="h-4 w-4" />
              Relationship Health
            </TabsTrigger>
            <TabsTrigger value="impact" className="gap-2">
              <Award className="h-4 w-4" />
              Impact Tracking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="birthdays" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cake className="h-5 w-5" />
                  Upcoming Birthdays
                </CardTitle>
                <CardDescription>
                  Send personalized birthday wishes to maintain relationships
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingBirthdays && upcomingBirthdays.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {upcomingBirthdays.map((contact) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        
                        // Parse date correctly to avoid timezone issues
                        const [year, month, day] = contact.birthday!.split('-').map(Number);
                        let birthdayThisYear = new Date(today.getFullYear(), month - 1, day);
                        
                        // If birthday already passed this year, use next year
                        if (birthdayThisYear < today) {
                          birthdayThisYear = new Date(today.getFullYear() + 1, month - 1, day);
                        }
                        
                        const daysUntil = Math.ceil((birthdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                        return (
                          <div key={contact.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-pink-500/10">
                                <Cake className="h-6 w-6 text-pink-500" />
                              </div>
                              <div>
                                <div className="font-semibold">
                                  {contact.first_name} {contact.last_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {contact.current_title} at {contact.current_company}
                                </div>
                                <div className="text-sm font-medium text-pink-500">
                                  {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`} • {(() => {
                                    const [year, month, day] = contact.birthday!.split('-');
                                    return format(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)), 'MM/dd/yyyy');
                                  })()}
                                </div>
                              </div>
                            </div>
                            <Button 
                              onClick={() => openTemplateDialog(contact, 'birthday')}
                              size="sm"
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Send Wishes
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Cake className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No upcoming birthdays. Add birthdays to your contacts to get reminders!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Check-Ins Tab */}
          <TabsContent value="checkins" className="space-y-4">
            {/* Industry News Contact Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Newspaper className="h-5 w-5" />
                  Industry News
                </CardTitle>
                <CardDescription>
                  View and share relevant industry news with your contacts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">For:</span>
                  <Select value={newsContactId} onValueChange={setNewsContactId}>
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Select a contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts?.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.first_name} {contact.last_name} - {contact.current_company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newsContact && newsForContact && (
                  <div className="space-y-3 pt-4 border-t">
                    {loadingNews ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : newsForContact.suggestions && newsForContact.suggestions.length > 0 ? (
                      newsForContact.suggestions.map((news: any, index: number) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-2">
                              <div className="font-semibold">{news.news_headline}</div>
                              <div className="text-sm text-muted-foreground">{news.news_summary}</div>
                              <div className="text-sm font-medium">Why this matters:</div>
                              <div className="text-sm text-muted-foreground">{news.relevance_reason}</div>
                              {news.suggested_talking_points && news.suggested_talking_points.length > 0 && (
                                <>
                                  <div className="text-sm font-medium">Talking points:</div>
                                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    {news.suggested_talking_points.map((point: string, idx: number) => (
                                      <li key={idx}>{point}</li>
                                    ))}
                                  </ul>
                                </>
                              )}
                            </div>
                            <Button 
                              onClick={() => {
                                setSelectedNewsForTemplate(news);
                                openTemplateDialog(newsContact, 'industry_news');
                              }}
                              size="sm"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Share
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No news suggestions available for this contact</p>
                      </div>
                    )}
                  </div>
                )}

                {newsContactId && !newsContact && (
                  <div className="text-center py-6 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Contact not found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Contacts Needing Check-In
                </CardTitle>
                <CardDescription>
                  Reach out to contacts you haven't connected with recently
                </CardDescription>
              </CardHeader>
              <CardContent>
                {needsCheckIn && needsCheckIn.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {needsCheckIn.map((contact) => {
                        const daysSinceContact = contact.last_contacted_at 
                          ? Math.floor((Date.now() - new Date(contact.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24))
                          : 999;

                        return (
                          <div key={contact.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/10">
                                <Bell className="h-6 w-6 text-orange-500" />
                              </div>
                              <div>
                                <div className="font-semibold">
                                  {contact.first_name} {contact.last_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {contact.current_title} at {contact.current_company}
                                </div>
                                <div className="text-sm text-orange-500">
                                  {daysSinceContact === 999 ? 'Never contacted' : `Last contact: ${daysSinceContact} days ago`}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => openTemplateDialog(contact, 'check_in')}
                                size="sm"
                                variant="outline"
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Check-In
                              </Button>
                              <Button 
                                onClick={() => {
                                  const contactWithEmail = {
                                    ...contact,
                                    email: contact.email || 'theteamnjit5@gmail.com'
                                  };
                                  setSelectedContact(contactWithEmail);
                                  setNewsDialogOpen(true);
                                }}
                                size="sm"
                                variant="outline"
                              >
                                <Newspaper className="h-4 w-4 mr-2" />
                                Share News
                              </Button>
                              <Button 
                                onClick={() => {
                                  const contactWithEmail = {
                                    ...contact,
                                    email: contact.email || 'theteamnjit5@gmail.com'
                                  };
                                  setSelectedContact(contactWithEmail);
                                  setSuggestionsDialogOpen(true);
                                }}
                                size="sm"
                                variant="outline"
                              >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Suggestions
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>All contacts have been reached recently. Great job maintaining your network!</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </TabsContent>

          {/* Relationship Health Tab */}
          <TabsContent value="health" className="space-y-4 mt-6">
            {/* Contact selector */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Check Relationship Health For:</CardTitle>
              </CardHeader>
              <CardContent className="px-6">
                <Select value={selectedHealthContactId} onValueChange={setSelectedHealthContactId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a contact to view their relationship health..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts?.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name} - {contact.current_company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Show selected contact's health */}
            {selectedHealthContactId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Relationship Health
                  </CardTitle>
                  <CardDescription>
                    Monitor and improve relationship strength
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 space-y-4">
                  {(() => {
                    const metric = healthMetrics?.find((m: any) => m.contact_id === selectedHealthContactId);
                    const contact = contacts?.find(c => c.id === selectedHealthContactId);
                    
                    if (!contact) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p>Contact not found</p>
                        </div>
                      );
                    }
                    
                    if (!metric) {
                      return (
                        <div className="text-center py-8 text-muted-foreground space-y-3">
                          <Heart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p>No health data yet for this contact.</p>
                          <Button 
                            onClick={() => calculateHealth.mutate()} 
                            disabled={calculateHealth.isPending}
                            variant="outline"
                          >
                            {calculateHealth.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Calculating...
                              </>
                            ) : (
                              <>
                                <TrendingUp className="h-4 w-4 mr-2" />
                                Calculate Health Metrics
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    }

                    const healthScore = metric.health_score || 0;
                    const healthColor = healthScore >= 70 ? 'text-green-500' : healthScore >= 40 ? 'text-yellow-500' : 'text-red-500';
                    const strengthBadge = (metric as any).professional_contacts?.relationship_strength || 'weak';
                    const connectionType = (contact as any)?._source === 'contact_suggestion' ? 'AI Generated' : 'Manually Saved';
                    
                    // Get name and company from either enriched metric or contact directly
                    const firstName = (metric as any).professional_contacts?.first_name || contact.first_name;
                    const lastName = (metric as any).professional_contacts?.last_name || contact.last_name;
                    const company = (metric as any).professional_contacts?.current_company || contact.current_company;

                    return (
                      <div className="space-y-4">
                        <div className="p-6 border rounded-lg space-y-4">
                          <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="font-semibold text-base">
                                {firstName} {lastName}
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {connectionType}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {company}
                            </div>
                          </div>
                            <Badge variant={strengthBadge === 'very_strong' || strengthBadge === 'strong' ? 'default' : 'secondary'}>
                              {strengthBadge.replace('_', ' ')}
                            </Badge>
                          </div>

                          <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Health Score</span>
                              <span className={`font-semibold ${healthColor}`}>{healthScore}%</span>
                            </div>
                            <Progress value={healthScore} className="h-2" />
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
                            <div className="space-y-1">
                              <div className="text-muted-foreground">Engagement</div>
                              <div className="font-medium">{metric.engagement_level || 'Low'}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-muted-foreground">Mutual Value</div>
                              <div className="font-medium">{metric.mutual_value_score || 0}%</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-muted-foreground">Last Contact</div>
                              <div className="font-medium">
                                {metric.last_interaction_days !== null && metric.last_interaction_days !== undefined
                                  ? metric.last_interaction_days === 0 
                                    ? 'Today' 
                                    : metric.last_interaction_days >= 999
                                      ? 'Never'
                                      : `${metric.last_interaction_days} days ago`
                                  : 'Never'}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-muted-foreground">Response Rate</div>
                              <div className="font-medium">{Math.round((metric.response_rate || 0) * 100)}%</div>
                            </div>
                          </div>

                          {metric.recommendations && metric.recommendations.length > 0 && (
                            <div className="pt-4 border-t space-y-3">
                              <div className="text-sm font-medium">Recommendations:</div>
                              <ul className="text-sm text-muted-foreground space-y-2">
                                {metric.recommendations.map((rec: string, idx: number) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {(metric as any).professional_contacts?.opportunities_generated > 0 && (
                            <div className="pt-3 border-t text-sm">
                              <div className="flex items-center gap-2 text-green-600">
                                <Award className="h-4 w-4" />
                                <span>{(metric as any).professional_contacts.opportunities_generated} opportunities generated</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Impact Tracking Tab */}
          <TabsContent value="impact" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Network Impact & ROI
                </CardTitle>
                <CardDescription>
                  Track how relationship maintenance leads to opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Top Performers */}
                  <div>
                    <h4 className="font-semibold mb-3">Most Valuable Connections</h4>
                    <div className="space-y-3">
                      {contacts
                        ?.filter(c => c.opportunities_generated > 0)
                        .sort((a, b) => (b.opportunities_generated || 0) - (a.opportunities_generated || 0))
                        .slice(0, 5)
                        .map((contact) => (
                          <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{contact.first_name} {contact.last_name}</div>
                              <div className="text-sm text-muted-foreground">{contact.current_company}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="gap-1">
                                <Award className="h-3 w-3" />
                                {contact.opportunities_generated} opportunities
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Network Statistics */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Total Network Size</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{contacts?.length || 0}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Active Relationships</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {contacts?.filter(c => {
                            if (!c.last_contacted_at) return false;
                            const days = Math.floor((Date.now() - new Date(c.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24));
                            return days < 30;
                          }).length || 0}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Template Dialog */}
      {selectedContact && (
      <>
        <MessageTemplateDialog
          open={templateDialogOpen}
          onOpenChange={(open) => {
            setTemplateDialogOpen(open);
            if (!open) setSelectedNewsForTemplate(null);
          }}
          contact={selectedContact}
          templateType={selectedTemplateType}
          onSend={handleSendMessage}
          newsContent={selectedNewsForTemplate}
        />

        <IndustryNewsDialog
          open={newsDialogOpen}
          onOpenChange={setNewsDialogOpen}
          contact={selectedContact}
        />

        <RelationshipSuggestionsDialog
          open={suggestionsDialogOpen}
          onOpenChange={setSuggestionsDialogOpen}
          contact={selectedContact}
        />
      </>
      )}
    </>
  );
}
