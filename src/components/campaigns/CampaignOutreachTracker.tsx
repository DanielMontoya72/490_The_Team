import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Plus, Mail, MessageSquare, Phone, Linkedin, CheckCircle, XCircle, Clock, Send } from "lucide-react";
import { format } from "date-fns";

export function CampaignOutreachTracker() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [outreachType, setOutreachType] = useState("message");
  const [messageVariant, setMessageVariant] = useState("A");
  const [messageContent, setMessageContent] = useState("");
  const [notes, setNotes] = useState("");
  const [filterCampaign, setFilterCampaign] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: campaigns } = useQuery({
    queryKey: ['networking-campaigns-for-outreach'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('networking_campaigns')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const { data: outreachRecords, isLoading } = useQuery({
    queryKey: ['campaign-outreach', filterCampaign, filterStatus],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let query = supabase
        .from('campaign_outreach')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false });

      if (filterCampaign !== 'all') {
        query = query.eq('campaign_id', filterCampaign);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by status on client side
      let filtered = data || [];
      if (filterStatus === 'responded') {
        filtered = filtered.filter(r => r.response_received);
      } else if (filterStatus === 'pending') {
        filtered = filtered.filter(r => !r.response_received);
      }

      return filtered;
    }
  });

  const createOutreach = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('campaign_outreach')
        .insert({
          user_id: user.id,
          campaign_id: selectedCampaign,
          contact_name: contactName,
          contact_company: contactCompany,
          contact_title: contactTitle,
          outreach_type: outreachType,
          message_variant: messageVariant,
          message_content: messageContent,
          notes: notes,
          sent_at: new Date().toISOString()
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-outreach'] });
      queryClient.invalidateQueries({ queryKey: ['networking-campaigns'] });
      toast.success('Outreach logged successfully!');
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to log outreach');
    }
  });

  const updateResponse = useMutation({
    mutationFn: async ({ outreachId, responseReceived, outcome }: { 
      outreachId: string; 
      responseReceived: boolean;
      outcome?: string;
    }) => {
      const { error } = await supabase
        .from('campaign_outreach')
        .update({
          response_received: responseReceived,
          response_date: responseReceived ? new Date().toISOString() : null,
          outcome: outcome || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', outreachId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-outreach'] });
      queryClient.invalidateQueries({ queryKey: ['networking-campaigns'] });
      toast.success('Response status updated!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update response');
    }
  });

  const resetForm = () => {
    setContactName("");
    setContactCompany("");
    setContactTitle("");
    setOutreachType("message");
    setMessageVariant("A");
    setMessageContent("");
    setNotes("");
  };

  const getOutreachIcon = (type: string) => {
    const icons: Record<string, any> = {
      message: MessageSquare,
      email: Mail,
      linkedin: Linkedin,
      call: Phone
    };
    return icons[type] || MessageSquare;
  };

  const getOutcomeBadge = (outcome: string | null) => {
    if (!outcome) return null;
    const config: Record<string, { variant: any; label: string }> = {
      connected: { variant: "default", label: "Connected" },
      interested: { variant: "default", label: "Interested" },
      meeting_scheduled: { variant: "default", label: "Meeting Scheduled" },
      not_interested: { variant: "secondary", label: "Not Interested" },
      no_response: { variant: "outline", label: "No Response" }
    };
    return config[outcome] || null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Outreach Tracking</h2>
          <p className="text-muted-foreground">Log and track all campaign outreach</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Log Outreach
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Filter by Campaign</Label>
          <Select value={filterCampaign} onValueChange={setFilterCampaign}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns?.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.campaign_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Filter by Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="responded">Responded</SelectItem>
              <SelectItem value="pending">Pending Response</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : outreachRecords && outreachRecords.length > 0 ? (
        <div className="space-y-4">
          {outreachRecords.map((record) => {
            const Icon = getOutreachIcon(record.outreach_type);
            const campaign = campaigns?.find(c => c.id === record.campaign_id);
            const outcomeBadge = getOutcomeBadge(record.outcome);

            return (
              <Card key={record.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{record.contact_name}</p>
                          {record.contact_title && record.contact_company && (
                            <p className="text-sm text-muted-foreground">
                              {record.contact_title} at {record.contact_company}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {campaign && (
                          <Badge variant="outline">{campaign.campaign_name}</Badge>
                        )}
                        <Badge variant="secondary">Variant {record.message_variant}</Badge>
                        {record.response_received ? (
                          <Badge variant="default" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Responded
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                        {outcomeBadge && (
                          <Badge variant={outcomeBadge.variant}>{outcomeBadge.label}</Badge>
                        )}
                      </div>

                      {record.message_content && (
                        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                          <p className="line-clamp-3">{record.message_content}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Sent: {format(new Date(record.sent_at), 'MMM dd, yyyy')}</span>
                        {record.response_date && (
                          <span>Responded: {format(new Date(record.response_date), 'MMM dd, yyyy')}</span>
                        )}
                      </div>
                    </div>

                    {!record.response_received && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateResponse.mutate({ 
                            outreachId: record.id, 
                            responseReceived: true,
                            outcome: 'interested'
                          })}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Responded
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No outreach logged yet</p>
            <p className="text-sm">Start logging your campaign outreach to track progress</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Log Campaign Outreach</DialogTitle>
            <DialogDescription>
              Record outreach sent as part of your networking campaign
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign *</Label>
                <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns?.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.campaign_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name *</Label>
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    value={contactCompany}
                    onChange={(e) => setContactCompany(e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={contactTitle}
                  onChange={(e) => setContactTitle(e.target.value)}
                  placeholder="Senior Engineer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Outreach Type</Label>
                  <Select value={outreachType} onValueChange={setOutreachType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="message">Message</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="call">Phone Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Message Variant (A/B Testing)</Label>
                  <Select value={messageVariant} onValueChange={setMessageVariant}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Variant A</SelectItem>
                      <SelectItem value="B">Variant B</SelectItem>
                      <SelectItem value="C">Variant C</SelectItem>
                      <SelectItem value="D">Variant D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Message Content</Label>
                <Textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="What did you send in your outreach message?"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional context..."
                  rows={2}
                />
              </div>
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createOutreach.mutate()}
              disabled={!selectedCampaign || !contactName || createOutreach.isPending}
            >
              {createOutreach.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Log Outreach
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
