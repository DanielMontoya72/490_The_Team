import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Coffee, Plus, Loader2, Calendar, MessageSquare, CheckCircle, FileText, Trash2, Sparkles, Mail, Link2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export default function InformationalInterviewManager() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isInsightsDialogOpen, setIsInsightsDialogOpen] = useState(false);
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false);
  const [isJobLinkDialogOpen, setIsJobLinkDialogOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<any>(null);
  const [requestTemplate, setRequestTemplate] = useState<any>(null);
  const [preparationFramework, setPreparationFramework] = useState<any>(null);
  const [isInterviewDetailsOpen, setIsInterviewDetailsOpen] = useState(false);
  const [isPrepFrameworkOpen, setIsPrepFrameworkOpen] = useState(false);
  const [editableSubject, setEditableSubject] = useState("");
  const [editableMessage, setEditableMessage] = useState("");
  const [useExistingContact, setUseExistingContact] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [insights, setInsights] = useState<any>(null);
  const [followUpTemplate, setFollowUpTemplate] = useState<any>(null);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [linkNotes, setLinkNotes] = useState("");

  const [formData, setFormData] = useState({
    candidate_name: "",
    candidate_title: "",
    candidate_company: "",
    candidate_linkedin_url: "",
    candidate_email: "",
    notes: "",
    contact_id: null as string | null,
    interview_date: "",
    outcome: "",
  });

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: interviews } = useQuery({
    queryKey: ["informational-interviews", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("informational_interviews")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: savedTemplates } = useQuery({
    queryKey: ["interview-templates", selectedInterview?.id],
    queryFn: async () => {
      if (!user || !selectedInterview?.id) return [];
      const { data, error } = await (supabase
        .from("informational_interview_templates" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("interview_id", selectedInterview.id)
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!selectedInterview?.id,
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("professional_contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addInterviewMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user) throw new Error("Not authenticated");
      
      console.log("Saving informational interview with data:", data);
      
      const { data: result, error } = await supabase
        .from("informational_interviews")
        .insert({
          user_id: user.id,
          candidate_name: data.candidate_name,
          candidate_title: data.candidate_title || null,
          candidate_company: data.candidate_company || null,
          candidate_linkedin_url: data.candidate_linkedin_url || null,
          candidate_email: data.candidate_email || null,
          notes: data.notes || null,
          interview_date: data.interview_date || null,
          outcome: data.outcome || null,
        })
        .select()
        .single();
      if (error) throw error;
      
      console.log("Saved informational interview:", result);
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["informational-interviews"] });
      setIsAddDialogOpen(false);
      setFormData({
        candidate_name: "",
        candidate_title: "",
        candidate_company: "",
        candidate_linkedin_url: "",
        candidate_email: "",
        notes: "",
        contact_id: null,
        interview_date: "",
        outcome: "",
      });
      setUseExistingContact(false);
      setSelectedContactId("");
      toast.success("Informational interview request added!");
    },
    onError: (error) => {
      console.error("Failed to add interview request:", error);
      toast.error("Failed to add interview request");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("informational_interviews")
        .update({ request_status: status })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["informational-interviews"] });
      toast.success("Status updated!");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const markFollowUpCompleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("informational_interviews")
        .update({
          follow_up_completed: true,
          follow_up_date: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["informational-interviews"] });
      toast.success("Follow-up marked as completed!");
    },
    onError: () => {
      toast.error("Failed to mark follow-up complete");
    },
  });

  const deleteInterviewMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("informational_interviews")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["informational-interviews"] });
      setIsInterviewDetailsOpen(false);
      toast.success("Interview request deleted");
    },
    onError: () => {
      toast.error("Failed to delete interview request");
    },
  });

  const generateRequestMutation = useMutation({
    mutationFn: async (interview: any) => {
      if (!user) throw new Error("Not authenticated");
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No active session");

      const { data, error } = await supabase.functions.invoke("generate-informational-interview-request", {
        body: {
          candidateName: interview.candidate_name,
          candidateTitle: interview.candidate_title,
          candidateCompany: interview.candidate_company,
          reason: interview.notes || "",
          topics: [],
        },
      });
      
      if (error) {
        console.error("Generate request error:", error);
        throw error;
      }
      
      return data;
    },
    onSuccess: (data) => {
      setRequestTemplate(data);
      setEditableSubject(data.subject || "");
      setEditableMessage(data.message || "");
      toast.success("Request template generated!");
    },
    onError: (error: any) => {
      console.error("Failed to generate request:", error);
      toast.error(error?.message || "Failed to generate request template");
    },
  });

  const generatePrepMutation = useMutation({
    mutationFn: async (interviewId: string) => {
      if (!user) throw new Error("Not authenticated");
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No active session");

      const { data, error } = await supabase.functions.invoke("generate-informational-interview-prep", {
        body: { interviewId },
      });
      
      if (error) {
        console.error("Generate prep error:", error);
        throw error;
      }
      
      return data;
    },
    onSuccess: (data) => {
      setPreparationFramework(data);
      setIsPrepFrameworkOpen(true);
      toast.success("Prep framework generated!");
    },
    onError: (error: any) => {
      console.error("Failed to generate prep:", error);
      toast.error(error?.message || "Failed to generate prep framework");
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async ({ subject, message, interviewId }: { subject: string; message: string; interviewId: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase
        .from("informational_interview_templates" as any)
        .insert({
          user_id: user.id,
          interview_id: interviewId,
          subject,
          message,
        }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-templates"] });
      toast.success("Template saved!");
    },
    onError: () => {
      toast.error("Failed to save template");
    },
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async ({ interviewId, notes }: { interviewId: string; notes: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-interview-insights", {
        body: { interviewId, conversationNotes: notes },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setInsights(data);
      queryClient.invalidateQueries({ queryKey: ["informational-interviews"] });
      toast.success("Insights generated and saved!");
    },
    onError: () => {
      toast.error("Failed to generate insights");
    },
  });

  const generateFollowUpMutation = useMutation({
    mutationFn: async ({ interviewId, type }: { interviewId: string; type: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-informational-interview-followup", {
        body: { interviewId, followUpType: type },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setFollowUpTemplate(data);
      toast.success("Follow-up template generated!");
    },
    onError: () => {
      toast.error("Failed to generate follow-up template");
    },
  });

  const linkJobMutation = useMutation({
    mutationFn: async ({ interviewId, jobId, type, linkNotesData }: { interviewId: string; jobId: string; type: string; linkNotesData: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("informational_interview_job_links")
        .insert({
          user_id: user.id,
          interview_id: interviewId,
          job_id: jobId,
          connection_type: type,
          notes: linkNotesData,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-job-links"] });
      setIsJobLinkDialogOpen(false);
      setSelectedJobId("");
      setLinkNotes("");
      toast.success("Interview linked to job opportunity!");
    },
    onError: () => {
      toast.error("Failed to link to job");
    },
  });

  const { data: jobs } = useQuery({
    queryKey: ["jobs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("jobs")
        .select("id, job_title, company_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: jobLinks } = useQuery({
    queryKey: ["interview-job-links", selectedInterview?.id],
    queryFn: async () => {
      if (!selectedInterview) return [];
      const { data, error } = await supabase
        .from("informational_interview_job_links")
        .select("*, jobs(job_title, company_name)")
        .eq("interview_id", selectedInterview.id)
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedInterview && !!user,
  });

  const getStatusBadge = (status: string) => {
    const config: any = {
      pending: { variant: "secondary", label: "Pending" },
      accepted: { variant: "default", label: "Accepted" },
      completed: { variant: "outline", label: "Completed" },
      declined: { variant: "destructive", label: "Declined" },
    };
    const { variant, label } = config[status] || config.pending;
    return <Badge variant={variant as any}>{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Coffee className="h-5 w-5" />
                Informational Interviews
              </CardTitle>
              <CardDescription>
                Request and manage informational interviews to gain industry insights
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Request Informational Interview</DialogTitle>
                  <DialogDescription>
                    Add details about the person you want to interview
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select
                      value={useExistingContact ? "existing" : "new"}
                      onValueChange={(value) => {
                        const isExisting = value === "existing";
                        setUseExistingContact(isExisting);
                        if (!isExisting) {
                          setSelectedContactId("");
                          setFormData({
                            candidate_name: "",
                            candidate_title: "",
                            candidate_company: "",
                            candidate_linkedin_url: "",
                            candidate_email: "",
                            notes: "",
                            contact_id: null,
                            interview_date: "",
                            outcome: "",
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New Contact</SelectItem>
                        <SelectItem value="existing">Existing Contact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {useExistingContact && (
                    <div className="space-y-2">
                      <Label>Select Contact *</Label>
                      <Select
                        value={selectedContactId}
                        onValueChange={(value) => {
                          setSelectedContactId(value);
                          const contact = contacts?.find((c: any) => c.id === value);
                          if (contact) {
                            console.log("Selected contact:", contact);
                            setFormData({
                              candidate_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
                              candidate_title: contact.current_title || "",
                              candidate_company: contact.current_company || "",
                              candidate_linkedin_url: contact.linkedin_url || "",
                              candidate_email: contact.email || "",
                              notes: "",
                              contact_id: contact.id,
                              interview_date: "",
                              outcome: "",
                            });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a contact" />
                        </SelectTrigger>
                        <SelectContent>
                          {contacts && contacts.length > 0 ? (
                            contacts.map((contact: any) => (
                              <SelectItem key={contact.id} value={contact.id}>
                                {contact.name}{contact.company ? ` - ${contact.company}` : ""}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-2 text-sm text-muted-foreground">
                              No contacts found. Add contacts first.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      {contacts && (
                        <p className="text-xs text-muted-foreground">
                          {contacts.length} contact{contacts.length !== 1 ? 's' : ''} available
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={formData.candidate_name}
                        onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
                        placeholder="John Doe"
                        disabled={useExistingContact}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={formData.candidate_title}
                        onChange={(e) => setFormData({ ...formData, candidate_title: e.target.value })}
                        placeholder="Senior Engineer"
                        disabled={useExistingContact}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      value={formData.candidate_company}
                      onChange={(e) => setFormData({ ...formData, candidate_company: e.target.value })}
                      placeholder="Tech Corp"
                      disabled={useExistingContact}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>LinkedIn URL</Label>
                      <Input
                        value={formData.candidate_linkedin_url}
                        onChange={(e) => setFormData({ ...formData, candidate_linkedin_url: e.target.value })}
                        placeholder="https://linkedin.com/in/..."
                        disabled={useExistingContact}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={formData.candidate_email}
                        onChange={(e) => setFormData({ ...formData, candidate_email: e.target.value })}
                        placeholder="john@example.com"
                        disabled={useExistingContact}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Reason / Topics of Interest</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Why do you want to speak with this person? What topics are you interested in?"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Interview Date (Optional)</Label>
                      <Input
                        type="datetime-local"
                        value={formData.interview_date}
                        onChange={(e) => setFormData({ ...formData, interview_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expected Outcome</Label>
                      <Input
                        value={formData.outcome}
                        onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                        placeholder="Career advice, job leads, etc."
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => addInterviewMutation.mutate(formData)}
                    disabled={!formData.candidate_name || addInterviewMutation.isPending}
                  >
                    {addInterviewMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Request
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4 pr-4">
              {interviews && interviews.length > 0 ? (
                interviews.map((interview: any) => (
                  <Card 
                    key={interview.id} 
                    className="border-2 cursor-pointer hover:border-primary transition-colors"
                    onClick={() => {
                      setSelectedInterview(interview);
                      setIsInterviewDetailsOpen(true);
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{interview.candidate_name}</CardTitle>
                          <CardDescription>
                            {interview.candidate_title && `${interview.candidate_title}${interview.candidate_company ? ' at ' : ''}`}
                            {interview.candidate_company}
                          </CardDescription>
                        </div>
                        {getStatusBadge(interview.request_status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {interview.notes && (
                        <p className="text-sm text-muted-foreground">{interview.notes}</p>
                      )}

                      {interview.interview_date && (
                        <div className="text-sm">
                          <strong>Interview Date:</strong> {format(new Date(interview.interview_date), 'PPp')}
                        </div>
                      )}

                      {interview.impact_score !== null && (
                        <div className="flex items-center gap-2">
                          <strong className="text-sm">Impact Score:</strong>
                          <Badge variant={interview.impact_score >= 7 ? "default" : "secondary"}>
                            {interview.impact_score}/10
                          </Badge>
                        </div>
                      )}

                      {interview.relationship_strength && (
                        <div className="flex items-center gap-2">
                          <strong className="text-sm">Relationship:</strong>
                          <Badge variant="outline">{interview.relationship_strength}</Badge>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <div onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={interview.request_status}
                            onValueChange={(status) =>
                              updateStatusMutation.mutate({ id: interview.id, status })
                            }
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="accepted">Accepted</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="declined">Declined</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {interview.request_status === "accepted" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInterview(interview);
                              generatePrepMutation.mutate(interview.id);
                            }}
                            disabled={generatePrepMutation.isPending}
                          >
                            {generatePrepMutation.isPending && selectedInterview?.id === interview.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Calendar className="h-4 w-4 mr-1" />
                            )}
                            Generate Prep
                          </Button>
                        )}

                        {interview.request_status === "completed" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInterview(interview);
                                setIsInsightsDialogOpen(true);
                              }}
                            >
                              <Sparkles className="h-4 w-4 mr-1" />
                              Generate Insights
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInterview(interview);
                                setIsFollowUpDialogOpen(true);
                              }}
                            >
                              <Mail className="h-4 w-4 mr-1" />
                              Follow-up Template
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInterview(interview);
                                setIsJobLinkDialogOpen(true);
                              }}
                            >
                              <Link2 className="h-4 w-4 mr-1" />
                              Link to Job
                            </Button>
                          </>
                        )}

                        {interview.request_status === "completed" && !interview.follow_up_completed && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              markFollowUpCompleteMutation.mutate(interview.id);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Follow-up Done
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No informational interviews yet. Click "New Request" to add one.
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Interview Details Dialog with Tabs */}
      <Dialog open={isInterviewDetailsOpen} onOpenChange={setIsInterviewDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle>
                  {selectedInterview?.candidate_name}
                  {selectedInterview?.candidate_title && ` - ${selectedInterview.candidate_title}`}
                </DialogTitle>
                <DialogDescription>
                  {selectedInterview?.candidate_company}
                </DialogDescription>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (selectedInterview && confirm(`Are you sure you want to delete the interview request for ${selectedInterview.candidate_name}?`)) {
                    deleteInterviewMutation.mutate(selectedInterview.id);
                  }
                }}
                disabled={deleteInterviewMutation.isPending}
              >
                {deleteInterviewMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                Delete
              </Button>
            </div>
          </DialogHeader>
          <Tabs defaultValue="generate" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">Generate Request</TabsTrigger>
              <TabsTrigger value="templates">View Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="flex-1 overflow-y-auto mt-4 space-y-4">
              {selectedInterview?.notes && (
                <div className="bg-muted p-4 rounded-lg">
                  <Label className="text-sm font-medium">Reason / Topics of Interest</Label>
                  <p className="text-sm mt-2">{selectedInterview.notes}</p>
                </div>
              )}
              
              {!requestTemplate ? (
                <div className="text-center py-8">
                  <Button
                    onClick={() => {
                      if (selectedInterview) {
                        generateRequestMutation.mutate(selectedInterview);
                      }
                    }}
                    disabled={generateRequestMutation.isPending}
                  >
                    {generateRequestMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4 mr-2" />
                    )}
                    Generate Request Template
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Subject Line</Label>
                    <Input
                      value={editableSubject}
                      onChange={(e) => setEditableSubject(e.target.value)}
                      className="mt-2"
                      placeholder="Email subject"
                    />
                  </div>

                  <div>
                    <Label>Email Message</Label>
                    <Textarea
                      value={editableMessage}
                      onChange={(e) => setEditableMessage(e.target.value)}
                      rows={12}
                      className="mt-2"
                      placeholder="Email message"
                    />
                  </div>

                  <div>
                    <Label>Sending Tips</Label>
                    <ul className="mt-2 space-y-2 list-disc list-inside text-sm text-muted-foreground">
                      {requestTemplate.tips?.map((tip: string, i: number) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (selectedInterview) {
                          saveTemplateMutation.mutate({
                            subject: editableSubject,
                            message: editableMessage,
                            interviewId: selectedInterview.id,
                          });
                        }
                      }}
                      disabled={saveTemplateMutation.isPending}
                    >
                      {saveTemplateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Template
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(editableMessage);
                        toast.success("Message copied to clipboard!");
                      }}
                    >
                      Copy Message
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const fullText = `Subject: ${editableSubject}\n\n${editableMessage}`;
                        navigator.clipboard.writeText(fullText);
                        toast.success("Subject and message copied!");
                      }}
                    >
                      Copy All
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="templates" className="flex-1 overflow-y-auto mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {savedTemplates && savedTemplates.length > 0 ? (
                    savedTemplates.map((template: any) => (
                      <Card key={template.id} className="border-2">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-sm font-medium">
                                {new Date(template.created_at).toLocaleDateString()} at{" "}
                                {new Date(template.created_at).toLocaleTimeString()}
                              </CardTitle>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Subject</Label>
                            <p className="text-sm mt-1">{template.subject}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Message</Label>
                            <p className="text-sm mt-1 whitespace-pre-wrap">{template.message}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditableSubject(template.subject);
                                setEditableMessage(template.message);
                                setRequestTemplate({ subject: template.subject, message: template.message, tips: [] });
                                toast.success("Template loaded for editing");
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Use Template
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(template.message);
                                toast.success("Message copied!");
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No saved templates yet. Generate and save a template first.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Request Template Dialog - Remove */}
      {/* Saved Templates Dialog - Remove */}

      {/* Preparation Framework Dialog */}
      <Dialog open={isPrepFrameworkOpen} onOpenChange={setIsPrepFrameworkOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Interview Preparation Framework</DialogTitle>
            <DialogDescription>
              Use this guide to prepare for your interview with {selectedInterview?.candidate_name}
            </DialogDescription>
          </DialogHeader>
          {preparationFramework && (
            <Tabs defaultValue="research">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="research">Research</TabsTrigger>
                <TabsTrigger value="questions">Questions</TabsTrigger>
                <TabsTrigger value="structure">Structure</TabsTrigger>
                <TabsTrigger value="followup">Follow-up</TabsTrigger>
              </TabsList>

              <TabsContent value="research" className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Research Areas</h3>
                  <ul className="space-y-2 list-disc list-inside text-sm">
                    {preparationFramework.research_areas?.map((area: string, i: number) => (
                      <li key={i}>{area}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Things to Avoid</h3>
                  <ul className="space-y-2 list-disc list-inside text-sm text-muted-foreground">
                    {preparationFramework.things_to_avoid?.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="questions" className="space-y-4">
                <h3 className="font-semibold mb-2">Suggested Questions</h3>
                <ul className="space-y-3">
                  {preparationFramework.suggested_questions?.map((question: string, i: number) => (
                    <li key={i} className="text-sm bg-muted p-3 rounded-md">{question}</li>
                  ))}
                </ul>
              </TabsContent>

              <TabsContent value="structure" className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Opening</h3>
                  <p className="text-sm">{preparationFramework.conversation_structure?.opening}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Main Discussion</h3>
                  <p className="text-sm">{preparationFramework.conversation_structure?.main_discussion}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Closing</h3>
                  <p className="text-sm">{preparationFramework.conversation_structure?.closing}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Discussion Topics</h3>
                  <ul className="space-y-2 list-disc list-inside text-sm">
                    {preparationFramework.discussion_topics?.map((topic: string, i: number) => (
                      <li key={i}>{topic}</li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="followup" className="space-y-4">
                <h3 className="font-semibold mb-2">Follow-up Best Practices</h3>
                <ul className="space-y-2 list-disc list-inside text-sm">
                  {preparationFramework.follow_up_tips?.map((tip: string, i: number) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}