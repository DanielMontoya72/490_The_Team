import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { UserPlus, Send, CheckCircle, XCircle, Clock, ThumbsUp, Sparkles, BarChart3, BookOpen, Heart, RefreshCw } from "lucide-react";
import { ReferralGuidance } from "./ReferralGuidance";
import { ReferralMetrics } from "./ReferralMetrics";
import { ReferralRelationshipImpact } from "./ReferralRelationshipImpact";
import { ReferralFollowUp } from "./ReferralFollowUp";

export function ReferralRequestManager({ jobId }: { jobId?: string }) {
  const [selectedJob, setSelectedJob] = useState<string>(jobId || "");
  const [selectedContact, setSelectedContact] = useState<string>("");
  const [requestMessage, setRequestMessage] = useState("");
  const [templateType, setTemplateType] = useState("general");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  // Fetch jobs for current user only
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ['professional_contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professional_contacts')
        .select('*')
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch referral requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['referral_requests', jobId],
    queryFn: async () => {
      let query = supabase
        .from('referral_requests')
        .select(`
          *,
          jobs (job_title, company_name),
          professional_contacts (first_name, last_name, current_company)
        `)
        .order('created_at', { ascending: false });
      
      if (jobId) {
        query = query.eq('job_id', jobId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Generate template mutation
  const generateTemplate = useMutation({
    mutationFn: async () => {
      if (!selectedJob || !selectedContact) {
        throw new Error('Please select both a job and contact');
      }

      setIsGenerating(true);
      const { data, error } = await supabase.functions.invoke('generate-referral-request-template', {
        body: { jobId: selectedJob, contactId: selectedContact, requestType: templateType },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setRequestMessage(data.full_message);
      toast.success('Template generated successfully!');
      setIsGenerating(false);
    },
    onError: (error) => {
      console.error('Error generating template:', error);
      toast.error('Failed to generate template');
      setIsGenerating(false);
    },
  });

  // Create referral request
  const createRequest = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedJob || !selectedContact || !requestMessage) {
        throw new Error('Missing required fields');
      }

      const { data, error } = await supabase
        .from('referral_requests')
        .insert({
          user_id: user.id,
          job_id: selectedJob,
          contact_id: selectedContact,
          request_message: requestMessage,
          request_template_type: templateType,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral_requests'] });
      toast.success('Referral request created');
      setIsDialogOpen(false);
      setRequestMessage("");
      setSelectedJob("");
      setSelectedContact("");
    },
    onError: (error) => {
      console.error('Error creating request:', error);
      toast.error('Failed to create referral request');
    },
  });

  // Update request status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status, updates }: { id: string; status: string; updates?: any }) => {
      const { data, error } = await supabase
        .from('referral_requests')
        .update({ status, ...updates })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral_requests'] });
      toast.success('Status updated');
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Send className="h-4 w-4" />;
      case 'accepted': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'declined': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'successful': return <ThumbsUp className="h-4 w-4 text-blue-500" />;
      case 'no_response': return <Clock className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'successful': return 'default';
      case 'accepted': return 'default';
      case 'sent': return 'secondary';
      case 'declined': return 'destructive';
      case 'no_response': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Referral Request Management</h2>
          <p className="text-muted-foreground">Leverage your network effectively with guidance and tracking</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              New Referral Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Referral Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Job Position</Label>
                <Select value={selectedJob} onValueChange={setSelectedJob}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job: any) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.job_title} at {job.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Contact</Label>
                <Select value={selectedContact} onValueChange={setSelectedContact}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((contact: any) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
                        {contact.current_company && ` - ${contact.current_company}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Request Type</Label>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Referral</SelectItem>
                    <SelectItem value="warm_introduction">Warm Introduction</SelectItem>
                    <SelectItem value="internal_referral">Internal Referral</SelectItem>
                    <SelectItem value="informational">Informational Interview</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Message</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateTemplate.mutate()}
                    disabled={!selectedJob || !selectedContact || isGenerating}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isGenerating ? 'Generating...' : 'Generate with AI'}
                  </Button>
                </div>
                <Textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Write your referral request message..."
                  className="min-h-[200px]"
                />
              </div>

              <Button
                onClick={() => createRequest.mutate()}
                disabled={!selectedJob || !selectedContact || !requestMessage || createRequest.isPending}
                className="w-full"
              >
                Save Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="requests">
            <Send className="h-4 w-4 mr-2" />
            Requests
          </TabsTrigger>
          <TabsTrigger value="follow-ups">
            <RefreshCw className="h-4 w-4 mr-2" />
            Follow-ups
          </TabsTrigger>
          <TabsTrigger value="guidance">
            <BookOpen className="h-4 w-4 mr-2" />
            Guidance
          </TabsTrigger>
          <TabsTrigger value="metrics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="impact">
            <Heart className="h-4 w-4 mr-2" />
            Impact
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No referral requests yet. Create your first one!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((request: any) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {request.jobs?.job_title} at {request.jobs?.company_name}
                    </CardTitle>
                    <CardDescription>
                      Contact: {request.professional_contacts?.first_name} {request.professional_contacts?.last_name}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusVariant(request.status)} className="flex items-center gap-1">
                    {getStatusIcon(request.status)}
                    {request.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm whitespace-pre-wrap">{request.request_message}</p>
                  
                  <div className="flex gap-2 flex-wrap">
                    {request.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus.mutate({
                          id: request.id,
                          status: 'sent',
                          updates: { requested_at: new Date().toISOString() }
                        })}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Mark as Sent
                      </Button>
                    )}
                    {request.status === 'sent' && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => updateStatus.mutate({
                            id: request.id,
                            status: 'accepted',
                            updates: { response_received_at: new Date().toISOString() }
                          })}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Accepted
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({
                            id: request.id,
                            status: 'declined',
                            updates: { response_received_at: new Date().toISOString() }
                          })}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Declined
                        </Button>
                      </>
                    )}
                    {request.status === 'accepted' && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => updateStatus.mutate({
                          id: request.id,
                          status: 'successful'
                        })}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Mark Successful
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </TabsContent>

        <TabsContent value="follow-ups">
          <ReferralFollowUp />
        </TabsContent>

        <TabsContent value="guidance">
          <ReferralGuidance />
        </TabsContent>

        <TabsContent value="metrics">
          <ReferralMetrics />
        </TabsContent>

        <TabsContent value="impact">
          <ReferralRelationshipImpact />
        </TabsContent>
      </Tabs>
    </div>
  );
}