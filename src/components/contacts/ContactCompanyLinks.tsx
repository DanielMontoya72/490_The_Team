import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building, Plus, Loader2, ExternalLink, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ContactCompanyLinksProps {
  contactId: string;
}

interface LinkedJobData {
  id: string;
  job_id: string;
  jobs?: {
    id: string;
    job_title: string;
    company_name: string;
    status: string;
  };
}

export function ContactCompanyLinks({ contactId }: ContactCompanyLinksProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  // Fetch jobs for current user only
  const { data: jobs } = useQuery({
    queryKey: ['jobs-for-linking'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_title, company_name, status')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch existing links for this contact
  const { data: linkedJobs, isLoading } = useQuery<LinkedJobData[]>({
    queryKey: ['contact-job-links', contactId],
    queryFn: async () => {
      // Get contact name first
      const { data: contact } = await supabase
        .from('professional_contacts')
        .select('first_name, last_name')
        .eq('id', contactId)
        .single();

      if (!contact) return [];

      const contactName = `${contact.first_name} ${contact.last_name}`.trim();

      // Fetch job_contacts matching this contact's name
      const { data, error } = await supabase
        .from('job_contacts')
        .select('id, job_id, name')
        .eq('name', contactName) as any;
      
      if (error) throw error;
      
      if (!data || data.length === 0) return [];
      
      // Fetch job details separately - only for current user's jobs
      const { data: { session } } = await supabase.auth.getSession();
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, job_title, company_name, status')
        .eq('user_id', session?.user?.id || '') as any;
      
      if (jobsError) throw jobsError;
      
      // Combine the data and deduplicate by job_id (keep first occurrence)
      const seenJobIds = new Set<string>();
      return data
        .map((link: any) => ({
          id: link.id,
          job_id: link.job_id,
          jobs: jobs?.find((j: any) => j.id === link.job_id)
        }))
        .filter((link: any) => {
          if (!link.jobs || seenJobIds.has(link.job_id)) return false;
          seenJobIds.add(link.job_id);
          return true;
        }) as LinkedJobData[];
    },
  });

  const linkJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get contact name for the link
      const { data: contact } = await supabase
        .from('professional_contacts')
        .select('first_name, last_name, email, phone')
        .eq('id', contactId)
        .single();

      if (!contact) throw new Error('Contact not found');

      const contactName = `${contact.first_name} ${contact.last_name}`.trim();

      // Check if this contact is already linked to this job (by name)
      const { data: existing } = await supabase
        .from('job_contacts')
        .select('id')
        .eq('job_id', jobId)
        .eq('name', contactName)
        .maybeSingle();

      if (existing) {
        throw new Error('This contact is already linked to this job');
      }

      // Create job_contact link
      const { error } = await supabase
        .from('job_contacts')
        .insert({
          job_id: jobId,
          name: contactName,
          email: contact.email,
          phone: contact.phone
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-job-links', contactId] });
      toast({
        title: "Job Linked",
        description: "Contact successfully linked to job application.",
      });
      setSelectedJobId("");
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Link Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unlinkJobMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('job_contacts')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-job-links', contactId] });
      toast({
        title: "Unlinked",
        description: "Contact unlinked from job application.",
      });
    },
  });

  const getStatusColor = (status: string) => {
    const colors = {
      applied: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      interviewing: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      offer: 'bg-green-500/10 text-green-500 border-green-500/20',
      rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
      accepted: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      withdrawn: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Linked Job Applications
            </CardTitle>
            <CardDescription>
              Connect this contact to specific job opportunities
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Link Job
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link to Job Application</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Job</Label>
                  <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a job application" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs?.map(job => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.job_title} at {job.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => linkJobMutation.mutate(selectedJobId)}
                  disabled={!selectedJobId || linkJobMutation.isPending}
                  className="w-full"
                >
                  {linkJobMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Link to Job
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : linkedJobs && linkedJobs.length > 0 ? (
          <div className="space-y-3">
            {linkedJobs.map((link) => (
              <div key={link.id} className="flex items-start justify-between p-3 rounded-lg border">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{link.jobs?.job_title}</h4>
                    <Badge variant="outline" className={getStatusColor(link.jobs?.status || 'applied')}>
                      {link.jobs?.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{link.jobs?.company_name}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.location.href = '/jobs'}
                    title="View Job"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => unlinkJobMutation.mutate(link.id)}
                    title="Unlink"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No linked job applications</p>
            <p className="text-sm">Connect this contact to relevant job opportunities</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
