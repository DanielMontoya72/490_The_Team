import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, UserPlus, Users, Mail, Phone, Linkedin, Building, MapPin, Trash2, Edit, MessageSquare, Cake, CalendarIcon, Heart, TrendingUp, History, Bell, Network, Search, UserCircle, Briefcase } from "lucide-react";
import { BirthdayEditDialog } from "@/components/contacts/BirthdayEditDialog";
import { ContactInteractionHistory } from "@/components/contacts/ContactInteractionHistory";
import { ContactReminders } from "@/components/contacts/ContactReminders";
import { ContactMutualConnections } from "@/components/contacts/ContactMutualConnections";
import { ContactCompanyLinks } from "@/components/contacts/ContactCompanyLinks";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export function ProfessionalContactsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [filterRelationshipType, setFilterRelationshipType] = useState<string>("all");
  const [sortByStrength, setSortByStrength] = useState<string>("all");
  const [birthdayDialogOpen, setBirthdayDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [birthdayDate, setBirthdayDate] = useState<Date | undefined>(undefined);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedImports, setSelectedImports] = useState<Set<string>>(new Set());
  const [selectedContactForDetails, setSelectedContactForDetails] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    linkedin_url: "",
    current_company: "",
    current_title: "",
    industry: "",
    location: "",
    relationship_type: "colleague",
    relationship_strength: "moderate",
    how_we_met: "",
    professional_notes: "",
    personal_interests: "",
    contact_frequency: "quarterly"
  });

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['professional-contacts', filterRelationshipType, sortByStrength],
    queryFn: async () => {
      let query = supabase
        .from('professional_contacts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filterRelationshipType !== 'all') {
        query = query.eq('relationship_type', filterRelationshipType);
      }
      
      if (sortByStrength !== 'all') {
        query = query.eq('relationship_strength', sortByStrength);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Sort by strength if showing all
      if (sortByStrength === 'all' && data) {
        const strengthOrder = { strong: 0, moderate: 1, weak: 2 };
        return data.sort((a, b) => {
          const orderA = strengthOrder[a.relationship_strength as keyof typeof strengthOrder] ?? 3;
          const orderB = strengthOrder[b.relationship_strength as keyof typeof strengthOrder] ?? 3;
          return orderA - orderB;
        });
      }
      
      return data;
      // Deduplicate by full name (first_name + last_name)
      const uniqueContacts = new Map();
      data?.forEach(contact => {
        const fullName = `${contact.first_name} ${contact.last_name}`.trim().toLowerCase();
        if (!uniqueContacts.has(fullName)) {
          uniqueContacts.set(fullName, contact);
        }
      });
      
      return Array.from(uniqueContacts.values());
    },
  });

  // Fetch relationship health metrics
  const { data: healthMetrics } = useQuery({
    queryKey: ['relationship-health-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('relationship_health_metrics')
        .select('*');
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const birthdayValue = birthdayDate ? format(birthdayDate, "yyyy-MM-dd") : null;
      const dataWithBirthday = { ...data, birthday: birthdayValue };

      if (editingContact) {
        const { error } = await supabase
          .from('professional_contacts')
          .update(dataWithBirthday)
          .eq('id', editingContact.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('professional_contacts')
          .insert({ ...dataWithBirthday, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professional-contacts'] });
      toast({
        title: editingContact ? "Contact Updated" : "Contact Added",
        description: "Professional contact saved successfully.",
      });
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from('professional_contacts')
        .delete()
        .eq('id', contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professional-contacts'] });
      toast({
        title: "Contact Deleted",
        description: "Professional contact removed successfully.",
      });
    },
  });

  // Fetch contacts from Contact Discovery
  const { data: discoveryContacts } = useQuery({
    queryKey: ['contact-suggestions-for-import'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('contact_suggestions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['suggested', 'contacted', 'connected'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: isImportDialogOpen,
  });

  const importMutation = useMutation({
    mutationFn: async (contactIds: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const contactsToImport = discoveryContacts?.filter(c => contactIds.includes(c.id));
      if (!contactsToImport?.length) return;

      const professionalContacts = contactsToImport.map(contact => ({
        user_id: user.id,
        first_name: contact.contact_name?.split(' ')[0] || '',
        last_name: contact.contact_name?.split(' ').slice(1).join(' ') || '',
        email: contact.email,
        phone: contact.phone,
        linkedin_url: contact.linkedin_url,
        current_company: contact.contact_company,
        current_title: contact.contact_title,
        location: contact.contact_location,
        birthday: contact.birthday,
        relationship_type: 'colleague',
        relationship_strength: 'moderate',
        shared_interests: contact.mutual_interests || [],
      }));

      const { error } = await supabase
        .from('professional_contacts')
        .insert(professionalContacts);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professional-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-suggestions-for-import'] });
      toast({
        title: "Contacts Imported",
        description: `${selectedImports.size} contact(s) added successfully.`,
      });
      setSelectedImports(new Set());
      setIsImportDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      linkedin_url: "",
      current_company: "",
      current_title: "",
      industry: "",
      location: "",
      relationship_type: "colleague",
      relationship_strength: "moderate",
      how_we_met: "",
      professional_notes: "",
      personal_interests: "",
      contact_frequency: "quarterly"
    });
    setBirthdayDate(undefined);
    setEditingContact(null);
  };

  const handleEdit = (contact: any) => {
    setEditingContact(contact);
    setFormData({
      first_name: contact.first_name || "",
      last_name: contact.last_name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      linkedin_url: contact.linkedin_url || "",
      current_company: contact.current_company || "",
      current_title: contact.current_title || "",
      industry: contact.industry || "",
      location: contact.location || "",
      relationship_type: contact.relationship_type || "colleague",
      relationship_strength: contact.relationship_strength || "moderate",
      how_we_met: contact.how_we_met || "",
      professional_notes: contact.professional_notes || "",
      personal_interests: contact.personal_interests || "",
      contact_frequency: contact.contact_frequency || "quarterly"
    });
    setBirthdayDate(contact.birthday ? parseISO(contact.birthday) : undefined);
    setIsAddDialogOpen(true);
  };

  const getRelationshipBadgeColor = (strength: string) => {
    const colors = {
      weak: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
      moderate: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      strong: 'bg-green-500/10 text-green-500 border-green-500/20'
    };
    return colors[strength as keyof typeof colors] || colors.moderate;
  };

  const getHealthBadge = (status: string, score: number) => {
    const statusConfig = {
      strong: { color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: Heart, label: 'Strong' },
      healthy: { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: TrendingUp, label: 'Healthy' },
      needs_attention: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: TrendingUp, label: 'Needs Attention' },
      at_risk: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: Heart, label: 'At Risk' }
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.healthy;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Professional Network
            </CardTitle>
            <CardDescription>
              Manage your professional contacts and relationships
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Add Contact Button */}
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>{editingContact ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
                <DialogDescription>
                  Add detailed information about your professional contact
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4 -mx-1">
                <div className="space-y-4 py-1 px-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                    <Input
                      id="linkedin_url"
                      value={formData.linkedin_url}
                      onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="current_company">Current Company</Label>
                      <Input
                        id="current_company"
                        value={formData.current_company}
                        onChange={(e) => setFormData({ ...formData, current_company: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="current_title">Current Title</Label>
                      <Input
                        id="current_title"
                        value={formData.current_title}
                        onChange={(e) => setFormData({ ...formData, current_title: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="relationship_type">Relationship Type</Label>
                      <Select value={formData.relationship_type} onValueChange={(value) => setFormData({ ...formData, relationship_type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="colleague">Colleague</SelectItem>
                          <SelectItem value="mentor">Mentor</SelectItem>
                          <SelectItem value="recruiter">Recruiter</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="relationship_strength">Relationship Strength</Label>
                      <Select value={formData.relationship_strength} onValueChange={(value) => setFormData({ ...formData, relationship_strength: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weak">Weak</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="strong">Strong</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_frequency">Contact Frequency</Label>
                    <Select value={formData.contact_frequency} onValueChange={(value) => setFormData({ ...formData, contact_frequency: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="how_we_met">How We Met</Label>
                    <Textarea
                      id="how_we_met"
                      value={formData.how_we_met}
                      onChange={(e) => setFormData({ ...formData, how_we_met: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="professional_notes">Professional Notes</Label>
                    <Textarea
                      id="professional_notes"
                      value={formData.professional_notes}
                      onChange={(e) => setFormData({ ...formData, professional_notes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="personal_interests">Personal Interests</Label>
                    <Textarea
                      id="personal_interests"
                      value={formData.personal_interests}
                      onChange={(e) => setFormData({ ...formData, personal_interests: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthday">Birthday</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal", !birthdayDate && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {birthdayDate ? format(birthdayDate, "MM-dd-yyyy") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={birthdayDate}
                          onSelect={setBirthdayDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      You'll receive reminders 30 days before their birthday
                    </p>
                  </div>

                  <Button
                    onClick={() => saveMutation.mutate(formData)}
                    disabled={saveMutation.isPending || !formData.first_name || !formData.last_name}
                    className="w-full"
                  >
                    {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingContact ? 'Update Contact' : 'Add Contact'}
                  </Button>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search contacts by name, company, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={filterRelationshipType} onValueChange={setFilterRelationshipType}>
              <SelectTrigger className="h-8 w-full sm:w-auto">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contacts</SelectItem>
                <SelectItem value="colleague">Colleagues</SelectItem>
                <SelectItem value="mentor">Mentors</SelectItem>
                <SelectItem value="recruiter">Recruiters</SelectItem>
                <SelectItem value="referral">Referrals</SelectItem>
                <SelectItem value="manager">Managers</SelectItem>
                <SelectItem value="client">Clients</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortByStrength} onValueChange={setSortByStrength}>
              <SelectTrigger className="h-8 w-full sm:w-auto">
                <SelectValue placeholder="Sort by strength" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Strengths</SelectItem>
                <SelectItem value="strong">Strong Connections</SelectItem>
                <SelectItem value="moderate">Moderate Connections</SelectItem>
                <SelectItem value="weak">Weak Connections</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : contacts && contacts.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {contacts
                .filter(contact => {
                  if (!searchQuery) return true;
                  const query = searchQuery.toLowerCase();
                  const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
                  const company = contact.current_company?.toLowerCase() || '';
                  const title = contact.current_title?.toLowerCase() || '';
                  return fullName.includes(query) || company.includes(query) || title.includes(query);
                })
                .map((contact) => {
                  // Generate a consistent color based on contact ID
                  const colors = [
                    'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
                    'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
                    'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
                    'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
                    'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800',
                    'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800',
                    'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
                    'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800',
                  ];
                  const colorIndex = contact.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
                  const cardColor = colors[colorIndex];
                  
                  return (
                <Card 
                  key={contact.id} 
                  className={`cursor-pointer hover:shadow-md transition-all ${cardColor}`}
                  onClick={() => {
                    setSelectedContactForDetails(contact);
                    setIsDetailsDialogOpen(true);
                  }}
                >
                  <CardContent className="p-4 flex flex-col justify-between min-h-[120px]">
                    <div className="space-y-1.5">
                      <div>
                        <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
                          {contact.first_name} {contact.last_name}
                        </h3>
                        {contact.current_title && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-1">
                            {contact.current_title}
                          </p>
                        )}
                        {contact.current_company && (
                          <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                            {contact.current_company}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-1.5 mt-2 pt-2 border-t">
                      <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0.5">
                        {contact.relationship_type}
                      </Badge>
                      {(() => {
                        const health = healthMetrics?.find(m => m.contact_id === contact.id);
                        if (health) {
                          const config = getHealthBadge(health.health_status, health.health_score);
                          const Icon = config.icon;
                          return (
                            <Badge variant="outline" className={`${config.color} text-xs px-2 py-1 flex-shrink-0`}>
                              <Icon className="h-4 w-4 mr-1" />
                              {health.health_score}
                            </Badge>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )})}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No professional contacts yet.</p>
              <p className="text-sm">Start building your network by adding contacts.</p>
            </div>
          )}
        </div>
      </CardContent>
      
      {selectedContact && (
        <BirthdayEditDialog
          open={birthdayDialogOpen}
          onOpenChange={setBirthdayDialogOpen}
          contact={selectedContact}
        />
      )}

      {/* Contact Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl">
                  {selectedContactForDetails?.first_name} {selectedContactForDetails?.last_name}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Detailed contact information and relationship management
                </DialogDescription>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedContact(selectedContactForDetails);
                    setBirthdayDialogOpen(true);
                  }}
                  title="Edit Birthday"
                >
                  <Cake className="h-4 w-4 mr-2" />
                  Birthday
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(selectedContactForDetails);
                    setIsDetailsDialogOpen(false);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this contact?')) {
                      deleteMutation.mutate(selectedContactForDetails.id);
                      setIsDetailsDialogOpen(false);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          {/* Basic Information Section */}
          {selectedContactForDetails && (
            <div className="flex-shrink-0 mb-4 p-4 bg-muted/30 rounded-lg border">
              <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                {selectedContactForDetails.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Email</p>
                      <p className="font-medium break-all">{selectedContactForDetails.email}</p>
                    </div>
                  </div>
                )}
                {selectedContactForDetails.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Phone</p>
                      <p className="font-medium">{selectedContactForDetails.phone}</p>
                    </div>
                  </div>
                )}
                {selectedContactForDetails.current_company && (
                  <div className="flex items-start gap-3">
                    <Building className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Company</p>
                      <p className="font-medium truncate">{selectedContactForDetails.current_company}</p>
                    </div>
                  </div>
                )}
                {selectedContactForDetails.current_title && (
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Title</p>
                      <p className="font-medium truncate">{selectedContactForDetails.current_title}</p>
                    </div>
                  </div>
                )}
                {selectedContactForDetails.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Location</p>
                      <p className="font-medium truncate">{selectedContactForDetails.location}</p>
                    </div>
                  </div>
                )}
                {selectedContactForDetails.linkedin_url && (
                  <div className="flex items-start gap-3">
                    <Linkedin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">LinkedIn</p>
                      <a href={selectedContactForDetails.linkedin_url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline truncate block">
                        View Profile
                      </a>
                    </div>
                  </div>
                )}
                {selectedContactForDetails.birthday && (
                  <div className="flex items-start gap-3">
                    <Cake className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Birthday</p>
                      <p className="font-medium">
                        {(() => {
                          const [year, month, day] = selectedContactForDetails.birthday.split('-');
                          return format(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)), 'MMM d, yyyy');
                        })()}
                      </p>
                    </div>
                  </div>
                )}
                {selectedContactForDetails.industry && (
                  <div className="flex items-start gap-3">
                    <Building className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Industry</p>
                      <p className="font-medium truncate">{selectedContactForDetails.industry}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Relationship Info */}
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize">
                    {selectedContactForDetails.relationship_type}
                  </Badge>
                  <Badge variant="outline" className={getRelationshipBadgeColor(selectedContactForDetails.relationship_strength)}>
                    {selectedContactForDetails.relationship_strength} connection
                  </Badge>
                </div>
                {selectedContactForDetails.how_we_met && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">How We Met</p>
                    <p className="text-sm leading-relaxed">{selectedContactForDetails.how_we_met}</p>
                  </div>
                )}
                {selectedContactForDetails.professional_notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Professional Notes</p>
                    <p className="text-sm leading-relaxed">{selectedContactForDetails.professional_notes}</p>
                  </div>
                )}
                {selectedContactForDetails.personal_interests && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Personal Interests</p>
                    <p className="text-sm leading-relaxed">{selectedContactForDetails.personal_interests}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <Tabs defaultValue="interactions" className="w-full flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
              <TabsTrigger value="interactions">
                <History className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
              <TabsTrigger value="reminders">
                <Bell className="h-4 w-4 mr-2" />
                Reminders
              </TabsTrigger>
              <TabsTrigger value="connections">
                <Network className="h-4 w-4 mr-2" />
                Mutual
              </TabsTrigger>
              <TabsTrigger value="jobs">
                <Building className="h-4 w-4 mr-2" />
                Jobs
              </TabsTrigger>
            </TabsList>
            <ScrollArea className="flex-1 mt-4">
              <div className="pr-4">
                <TabsContent value="interactions" className="mt-0">
                  {selectedContactForDetails && (
                    <ContactInteractionHistory contactId={selectedContactForDetails.id} />
                  )}
                </TabsContent>
                <TabsContent value="reminders" className="mt-0">
                  {selectedContactForDetails && (
                    <ContactReminders contactId={selectedContactForDetails.id} />
                  )}
                </TabsContent>
                <TabsContent value="connections" className="mt-0">
                  {selectedContactForDetails && (
                    <ContactMutualConnections 
                      contactId={selectedContactForDetails.id}
                      currentMutualConnections={selectedContactForDetails.mutual_connections || []}
                    />
                  )}
                </TabsContent>
                <TabsContent value="jobs" className="mt-0">
                  {selectedContactForDetails && (
                    <ContactCompanyLinks contactId={selectedContactForDetails.id} />
                  )}
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Import Contacts from Discovery</DialogTitle>
            <DialogDescription>
              Select contacts to add to your professional network
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {discoveryContacts && discoveryContacts.length > 0 ? (
              <div className="space-y-3">
                {discoveryContacts.map(contact => (
                  <Card 
                    key={contact.id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      selectedImports.has(contact.id) && "border-primary bg-primary/5"
                    )}
                    onClick={() => {
                      const newSelected = new Set(selectedImports);
                      if (newSelected.has(contact.id)) {
                        newSelected.delete(contact.id);
                      } else {
                        newSelected.add(contact.id);
                      }
                      setSelectedImports(newSelected);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{contact.contact_name}</p>
                          {contact.contact_title && contact.contact_company && (
                            <p className="text-sm text-muted-foreground">
                              {contact.contact_title} at {contact.contact_company}
                            </p>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            {contact.email && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {contact.email}
                              </span>
                            )}
                            {contact.contact_location && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {contact.contact_location}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant={selectedImports.has(contact.id) ? "default" : "outline"}>
                          {selectedImports.has(contact.id) ? "Selected" : "Select"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No contacts available to import</p>
                <p className="text-sm">Visit Contact Discovery to find new connections</p>
              </div>
            )}
          </ScrollArea>
          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {selectedImports.size} contact(s) selected
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedImports(new Set());
                  setIsImportDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => importMutation.mutate(Array.from(selectedImports))}
                disabled={selectedImports.size === 0 || importMutation.isPending}
              >
                {importMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Import {selectedImports.size > 0 && `(${selectedImports.size})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
