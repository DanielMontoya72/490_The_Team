import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Send, CheckCircle, Clock, XCircle, MessageSquare, Sparkles, Heart, Trash2, BookOpen, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { ReferencePreparationDialog } from "./ReferencePreparationDialog";
import { RecordFeedbackDialog } from "./RecordFeedbackDialog";

interface Reference {
  id: string;
  reference_name: string;
  reference_title: string | null;
  reference_company: string | null;
  reference_email: string | null;
  skills_they_can_speak_to: string[];
  talking_points: string[];
}

interface ReferenceRequest {
  id: string;
  reference_id: string;
  job_id: string | null;
  request_date: string;
  request_status: string;
  request_type: string;
  company_name: string | null;
  role_title: string | null;
  deadline: string | null;
  preparation_materials: Record<string, unknown>;
  talking_points_sent: string[];
  reference_feedback: string | null;
  feedback_received_at: string | null;
  outcome: string | null;
  outcome_notes: string | null;
  thank_you_sent: boolean;
  thank_you_sent_at: string | null;
  professional_references?: Reference;
}

export function ReferenceRequests() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState<string | null>(null);
  const [preparationDialogOpen, setPreparationDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedRequestForPrep, setSelectedRequestForPrep] = useState<ReferenceRequest | null>(null);
  const [selectedRequestForFeedback, setSelectedRequestForFeedback] = useState<ReferenceRequest | null>(null);
  const [formData, setFormData] = useState({
    reference_id: "",
    request_type: "job_application",
    company_name: "",
    role_title: "",
    deadline: "",
  });

  const { data: references } = useQuery({
    queryKey: ["professional-references-list"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("professional_references")
        .select("id, reference_name, reference_title, reference_company, reference_email")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) throw error;
      return data as Reference[];
    },
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ["reference-requests"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("reference_requests")
        .select(`
          *,
          professional_references (
            id,
            reference_name,
            reference_title,
            reference_company,
            reference_email,
            skills_they_can_speak_to,
            talking_points
          )
        `)
        .eq("user_id", user.id)
        .order("request_date", { ascending: false });

      if (error) throw error;
      return data as ReferenceRequest[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update reference usage
      await supabase
        .from("professional_references")
        .update({
          usage_count: (await supabase.from("professional_references").select("usage_count").eq("id", data.reference_id).single()).data?.usage_count + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", data.reference_id);

      const { error } = await supabase
        .from("reference_requests")
        .insert({
          user_id: user.id,
          reference_id: data.reference_id,
          request_type: data.request_type,
          company_name: data.company_name || null,
          role_title: data.role_title || null,
          deadline: data.deadline || null,
          request_status: "pending",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reference-requests"] });
      queryClient.invalidateQueries({ queryKey: ["professional-references"] });
      toast.success("Reference request created");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to create request: " + error.message);
    },
  });

  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReferenceRequest | null>(null);
  const [emailMessage, setEmailMessage] = useState("");

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("reference_requests")
        .update({ request_status: status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reference-requests"] });
      toast.success("Status updated");
    },
  });

  const sendReferenceRequestEmail = async (request: ReferenceRequest, message: string) => {
    setIsSendingEmail(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("first_name, last_name")
        .eq("user_id", user.id)
        .single();

      const senderName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "A job seeker";

      if (!request.professional_references?.reference_email) {
        throw new Error("Reference email not available. Please add their email first.");
      }

      const { error: emailError } = await supabase.functions.invoke("send-reference-request-email", {
        body: {
          requestId: request.id,
          recipientEmail: request.professional_references.reference_email,
          recipientName: request.professional_references.reference_name,
          senderName,
          companyName: request.company_name || "",
          roleTitle: request.role_title || "",
          requestType: request.request_type,
          deadline: request.deadline,
          message,
        },
      });

      if (emailError) throw emailError;

      // Update status to sent
      await supabase
        .from("reference_requests")
        .update({ request_status: "sent" })
        .eq("id", request.id);

      queryClient.invalidateQueries({ queryKey: ["reference-requests"] });
      toast.success("Reference request email sent!");
      setSendEmailDialogOpen(false);
      setEmailMessage("");
      setSelectedRequest(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const openSendEmailDialog = (request: ReferenceRequest) => {
    setSelectedRequest(request);
    setEmailMessage("");
    setSendEmailDialogOpen(true);
  };

  const sendThankYouMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reference_requests")
        .update({
          thank_you_sent: true,
          thank_you_sent_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reference-requests"] });
      toast.success("Thank you marked as sent");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reference_requests")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reference-requests"] });
      toast.success("Reference request deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  const updateFeedbackMutation = useMutation({
    mutationFn: async ({ id, feedback, outcome }: { id: string; feedback: string; outcome: string }) => {
      const { error } = await supabase
        .from("reference_requests")
        .update({
          reference_feedback: feedback,
          outcome,
          feedback_received_at: new Date().toISOString(),
          request_status: "completed",
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reference-requests"] });
      toast.success("Feedback recorded");
    },
  });

  const generateTemplate = async () => {
    if (!formData.reference_id || !formData.company_name || !formData.role_title) {
      toast.error("Please fill in reference, company, and role first");
      return;
    }

    setIsGenerating(true);
    try {
      const selectedRef = references?.find(r => r.id === formData.reference_id);
      const { data, error } = await supabase.functions.invoke("generate-reference-request-template", {
        body: {
          referenceName: selectedRef?.reference_name,
          referenceTitle: selectedRef?.reference_title,
          referenceCompany: selectedRef?.reference_company,
          targetCompany: formData.company_name,
          targetRole: formData.role_title,
          requestType: formData.request_type,
        },
      });

      if (error) throw error;
      setGeneratedTemplate(data.template);
    } catch (error: any) {
      toast.error("Failed to generate template: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      reference_id: "",
      request_type: "job_application",
      company_name: "",
      role_title: "",
      deadline: "",
    });
    setGeneratedTemplate(null);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      pending: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: <Clock className="h-3 w-3" /> },
      sent: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: <Send className="h-3 w-3" /> },
      confirmed: { color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", icon: <CheckCircle className="h-3 w-3" /> },
      completed: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: <CheckCircle className="h-3 w-3" /> },
      declined: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: <XCircle className="h-3 w-3" /> },
    };
    return config[status] || config.pending;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading requests...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Reference Requests</h2>
          <p className="text-muted-foreground">Track and manage your reference requests</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Reference Request</DialogTitle>
              <DialogDescription>
                Request a reference for a job application or other opportunity
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Select Reference *</Label>
                <Select value={formData.reference_id} onValueChange={(value) => setFormData({ ...formData, reference_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a reference" />
                  </SelectTrigger>
                  <SelectContent>
                    {references?.map((ref) => (
                      <SelectItem key={ref.id} value={ref.id}>
                        {ref.reference_name} - {ref.reference_title || ref.reference_company || "No title"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Request Type</Label>
                <Select value={formData.request_type} onValueChange={(value) => setFormData({ ...formData, request_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="job_application">Job Application</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="character">Character Reference</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Target company"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role Title</Label>
                  <Input
                    value={formData.role_title}
                    onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                    placeholder="Position you're applying for"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <Label>Request Template</Label>
                  <Button variant="outline" size="sm" onClick={generateTemplate} disabled={isGenerating}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isGenerating ? "Generating..." : "Generate with AI"}
                  </Button>
                </div>
                <Textarea
                  value={generatedTemplate || ""}
                  onChange={(e) => setGeneratedTemplate(e.target.value)}
                  placeholder="Generate a template with AI or write your own message..."
                  rows={8}
                  className="text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.reference_id || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!requests?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Send className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Reference Requests</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create a reference request when you need someone to vouch for you
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const statusConfig = getStatusBadge(request.request_status);
            return (
              <Card key={request.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {request.professional_references?.reference_name || "Unknown Reference"}
                      </CardTitle>
                      <CardDescription>
                        {request.role_title && request.company_name
                          ? `${request.role_title} at ${request.company_name}`
                          : request.role_title || request.company_name || "No details"}
                      </CardDescription>
                    </div>
                    <Badge className={statusConfig.color}>
                      {statusConfig.icon}
                      <span className="ml-1 capitalize">{request.request_status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span>Type: {request.request_type.replace("_", " ")}</span>
                    {request.deadline && (
                      <span>• Deadline: {format(new Date(request.deadline), "MMM d, yyyy")}</span>
                    )}
                    <span>• Requested: {format(new Date(request.request_date), "MMM d, yyyy")}</span>
                  </div>

                  {request.reference_feedback && (
                    <div className="bg-muted p-3 rounded-md">
                      <div className="flex items-center gap-2 text-sm font-medium mb-1">
                        <MessageSquare className="h-4 w-4" />
                        Feedback Received
                      </div>
                      <p className="text-sm">{request.reference_feedback}</p>
                      {request.outcome && (
                        <Badge variant="outline" className="mt-2 capitalize">{request.outcome}</Badge>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {request.request_status === "pending" && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => openSendEmailDialog(request)}
                        disabled={!request.professional_references?.reference_email}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Send Request Email
                      </Button>
                    )}
                    {request.request_status === "sent" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: request.id, status: "confirmed" })}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark Confirmed
                      </Button>
                    )}
                    {(request.request_status === "sent" || request.request_status === "confirmed") && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedRequestForPrep(request);
                          setPreparationDialogOpen(true);
                        }}
                      >
                        <BookOpen className="h-4 w-4 mr-1" />
                        Prep Guide
                      </Button>
                    )}
                    {(request.request_status === "confirmed" || request.request_status === "completed") && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedRequestForFeedback(request);
                          setFeedbackDialogOpen(true);
                        }}
                      >
                        <ClipboardList className="h-4 w-4 mr-1" />
                        Record Feedback
                      </Button>
                    )}
                    {!request.thank_you_sent && request.request_status !== "pending" && (
                      <Button size="sm" variant="outline" onClick={() => sendThankYouMutation.mutate(request.id)}>
                        <Heart className="h-4 w-4 mr-1" />
                        Mark Thank You Sent
                      </Button>
                    )}
                    {request.thank_you_sent && (
                      <Badge variant="secondary">
                        <Heart className="h-3 w-3 mr-1" />
                        Thank you sent
                      </Badge>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this reference request?")) {
                          deleteMutation.mutate(request.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Send Email Dialog */}
      <Dialog open={sendEmailDialogOpen} onOpenChange={setSendEmailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Reference Request Email</DialogTitle>
            <DialogDescription>
              Send a reference request email to {selectedRequest?.professional_references?.reference_name}
              {selectedRequest?.professional_references?.reference_email && (
                <span className="text-green-600 dark:text-green-400"> ({selectedRequest.professional_references.reference_email})</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted p-3 rounded-md text-sm">
              <p><strong>Position:</strong> {selectedRequest?.role_title || "Not specified"}</p>
              <p><strong>Company:</strong> {selectedRequest?.company_name || "Not specified"}</p>
              {selectedRequest?.deadline && (
                <p><strong>Deadline:</strong> {format(new Date(selectedRequest.deadline), "MMM d, yyyy")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Personal Message (optional)</Label>
              <Textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Add a personal message to your reference request..."
                rows={4}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              The email will include Confirm and Decline buttons for the reference to respond.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedRequest && sendReferenceRequestEmail(selectedRequest, emailMessage)}
              disabled={isSendingEmail}
            >
              <Send className="h-4 w-4 mr-1" />
              {isSendingEmail ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preparation Dialog */}
      <ReferencePreparationDialog
        request={selectedRequestForPrep}
        open={preparationDialogOpen}
        onOpenChange={setPreparationDialogOpen}
      />

      {/* Feedback Dialog */}
      <RecordFeedbackDialog
        request={selectedRequestForFeedback}
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
      />
    </div>
  );
}
