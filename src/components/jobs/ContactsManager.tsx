import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';
import { markChecklistItemComplete } from '@/lib/checklist-utils';

interface Contact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
}

interface ContactsManagerProps {
  jobId: string | undefined;
  companyName?: string;
  isEditing: boolean;
}

export function ContactsManager({ jobId, companyName, isEditing }: ContactsManagerProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [professionalContacts, setProfessionalContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addToNetwork, setAddToNetwork] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({
    name: '',
    role: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (jobId) {
      fetchContacts();
      
      // Set up real-time subscription for contacts
      const channel = supabase
        .channel(`job_contacts_${jobId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'job_contacts',
            filter: `job_id=eq.${jobId}`
          },
          (payload) => {
            console.log('Contact change received:', payload);
            fetchContacts();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [jobId]);

  useEffect(() => {
    if (companyName) {
      fetchProfessionalContacts();
      
      // Set up real-time subscription for professional contacts
      const channel = supabase
        .channel(`professional_contacts_${companyName}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'professional_contacts'
          },
          (payload) => {
            console.log('Professional contact change received:', payload);
            fetchProfessionalContacts();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [companyName]);

  const fetchContacts = async () => {
    if (!jobId) return;
    
    try {
      const { data, error } = await supabase
        .from('job_contacts' as any)
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts((data as any) || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchProfessionalContacts = async () => {
    if (!companyName) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('professional_contacts')
        .select('*')
        .eq('user_id', user.id)
        .ilike('current_company', `%${companyName}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfessionalContacts(data || []);
    } catch (error) {
      console.error('Error fetching professional contacts:', error);
    }
  };

  const handleAddContact = async () => {
    if (!jobId) return;
    
    if (!newContact.name.trim()) {
      toast.error('Contact name is required');
      return;
    }

    setLoading(true);
    try {
      // Add to job contacts
      const { error: jobContactError } = await supabase
        .from('job_contacts' as any)
        .insert([{
          job_id: jobId,
          ...newContact
        } as any]);

      if (jobContactError) throw jobContactError;

      // Optionally add to professional network
      if (addToNetwork && companyName) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const nameParts = newContact.name.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          const { error: professionalContactError } = await supabase
            .from('professional_contacts')
            .insert([{
              user_id: user.id,
              first_name: firstName,
              last_name: lastName,
              email: newContact.email || null,
              phone: newContact.phone || null,
              current_company: companyName,
              current_title: newContact.role || null,
              relationship_type: 'professional'
            }]);

          if (professionalContactError) {
            console.error('Error adding to professional network:', professionalContactError);
            toast.error('Contact added to job but failed to add to network');
          } else {
            toast.success('Contact added to job and professional network');
            fetchProfessionalContacts();
          }
        }
      } else {
        toast.success('Contact added to job');
      }

      // Auto-complete the "research company" checklist item
      await markChecklistItemComplete(jobId, 'research');

      setNewContact({ name: '', role: '', email: '', phone: '' });
      setAddToNetwork(false);
      setShowAddForm(false);
      fetchContacts();
    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error('Failed to add contact');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    setContactToDelete(contactId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteContact = async () => {
    if (!contactToDelete) return;

    try {
      const { error } = await supabase
        .from('job_contacts' as any)
        .delete()
        .eq('id', contactToDelete);

      if (error) throw error;

      toast.success('Contact deleted');
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete contact');
    } finally {
      setDeleteDialogOpen(false);
      setContactToDelete(null);
    }
  };

  const handleLinkProfessionalContact = async (professionalContact: any) => {
    if (!jobId) return;

    // Check if already linked
    const alreadyLinked = contacts.some(c => 
      c.email && professionalContact.email && 
      c.email.toLowerCase() === professionalContact.email.toLowerCase()
    );

    if (alreadyLinked) {
      toast.error('This contact is already linked to this job');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('job_contacts' as any)
        .insert([{
          job_id: jobId,
          name: `${professionalContact.first_name} ${professionalContact.last_name}`,
          role: professionalContact.current_title || '',
          email: professionalContact.email || '',
          phone: professionalContact.phone || ''
        } as any]);

      if (error) throw error;

      toast.success('Contact linked to job');
      fetchContacts();
    } catch (error) {
      console.error('Error linking contact:', error);
      toast.error('Failed to link contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Professional Contacts from Network */}
      {professionalContacts.length > 0 && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            Contacts in Your Network at {companyName}
            <span className="text-sm font-normal text-muted-foreground">({professionalContacts.length})</span>
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            These contacts from your professional network work at this company
          </p>
          <div className="space-y-3">
            {professionalContacts.map((contact) => {
              const isLinked = contacts.some(c => 
                c.email && contact.email && 
                c.email.toLowerCase() === contact.email.toLowerCase()
              );
              
              return (
                <Card key={contact.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <h4 className="font-semibold">{contact.first_name} {contact.last_name}</h4>
                      {contact.current_title && <p className="text-sm text-muted-foreground">{contact.current_title}</p>}
                      {contact.email && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Email: </span>
                          <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                            {contact.email}
                          </a>
                        </p>
                      )}
                      {contact.phone && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Phone: </span>
                          <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                            {contact.phone}
                          </a>
                        </p>
                      )}
                      {contact.relationship_type && (
                        <p className="text-sm text-muted-foreground">
                          Relationship: {contact.relationship_type}
                        </p>
                      )}
                    </div>
                    <div className="ml-4">
                      {isLinked ? (
                        <Button variant="outline" size="sm" disabled>
                          Linked
                        </Button>
                      ) : (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleLinkProfessionalContact(contact)}
                          disabled={loading}
                        >
                          Link to Job
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Linked Job Contacts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Linked Contacts</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {showAddForm ? 'Cancel' : 'Add Contact'}
          </Button>
        </div>
        {contacts.length === 0 ? (
          <div className="text-center py-8 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground mb-2">No contacts linked yet.</p>
            <p className="text-sm text-muted-foreground">
              {professionalContacts.length > 0 
                ? "Link contacts from your network above or add a new contact below."
                : "Add a contact below to get started."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <Card key={contact.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-semibold">{contact.name}</h4>
                    {contact.role && <p className="text-sm text-muted-foreground">{contact.role}</p>}
                    {contact.email && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Email: </span>
                        <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                          {contact.email}
                        </a>
                      </p>
                    )}
                    {contact.phone && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Phone: </span>
                        <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                          {contact.phone}
                        </a>
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteContact(contact.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <h3 className="font-bold text-lg mb-4">Add New Contact</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                value={newContact.name}
                onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-role">Role (e.g., Recruiter)</Label>
              <Input
                id="contact-role"
                value={newContact.role}
                onChange={(e) => setNewContact(prev => ({ ...prev, role: e.target.value }))}
                placeholder="Recruiter"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                type="tel"
                value={newContact.phone}
                onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
          
          {companyName && (
            <div className="flex items-center space-x-2 mt-4">
              <Checkbox 
                id="add-to-network" 
                checked={addToNetwork}
                onCheckedChange={(checked) => setAddToNetwork(checked as boolean)}
              />
              <label
                htmlFor="add-to-network"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Also add to my professional network at {companyName}
              </label>
            </div>
          )}
          
          <Button 
            onClick={handleAddContact} 
            disabled={loading || !newContact.name.trim()}
            className="mt-4"
          >
            {loading ? 'Adding...' : 'Add Contact'}
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this contact? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setContactToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteContact} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
