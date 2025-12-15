import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Target, TrendingUp, Users, Mail, Plus, Loader2, CheckCircle, Clock, MessageSquare, Phone, Linkedin, Send, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface CampaignDetailsDialogProps {
  campaign: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CampaignDetailsDialog({ campaign, open, onOpenChange }: CampaignDetailsDialogProps) {
  const queryClient = useQueryClient();
  const goals = (campaign.goals || {}) as { outreach_target?: number; response_target?: number; connection_target?: number };
  
  // Outreach form state
  const [showAddOutreach, setShowAddOutreach] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [outreachType, setOutreachType] = useState("message");
  const [messageVariant, setMessageVariant] = useState("A");
  const [messageContent, setMessageContent] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch outreach records for this campaign
  const { data: outreachRecords, isLoading: outreachLoading } = useQuery({
    queryKey: ['campaign-outreach', campaign.id],
    enabled: open,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('campaign_outreach')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch metrics for this campaign
  const { data: campaignMetrics } = useQuery({
    queryKey: ['campaign-metrics', campaign.id],
    enabled: open,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('campaign_metrics')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('user_id', user.id)
        .order('metric_date', { ascending: false });

      if (error) throw error;
      
      // Aggregate metrics
      const totals = (data || []).reduce((acc, m) => ({
        outreach_sent: acc.outreach_sent + (m.outreach_sent || 0),
        responses_received: acc.responses_received + (m.responses_received || 0),
        connections_made: acc.connections_made + (m.connections_made || 0),
        meetings_scheduled: acc.meetings_scheduled + (m.meetings_scheduled || 0),
        variant_a_sent: acc.variant_a_sent + (m.variant_a_sent || 0),
        variant_a_responses: acc.variant_a_responses + (m.variant_a_responses || 0),
        variant_b_sent: acc.variant_b_sent + (m.variant_b_sent || 0),
        variant_b_responses: acc.variant_b_responses + (m.variant_b_responses || 0),
      }), { 
        outreach_sent: 0, 
        responses_received: 0, 
        connections_made: 0, 
        meetings_scheduled: 0,
        variant_a_sent: 0,
        variant_a_responses: 0,
        variant_b_sent: 0,
        variant_b_responses: 0
      });
      
      return totals;
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
          campaign_id: campaign.id,
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
      queryClient.invalidateQueries({ queryKey: ['campaign-outreach', campaign.id] });
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics', campaign.id] });
      queryClient.invalidateQueries({ queryKey: ['networking-campaigns'] });
      toast.success('Outreach logged successfully!');
      resetForm();
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
      queryClient.invalidateQueries({ queryKey: ['campaign-outreach', campaign.id] });
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics', campaign.id] });
      queryClient.invalidateQueries({ queryKey: ['networking-campaigns'] });
      toast.success('Response status updated!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update response');
    }
  });

  const resetForm = () => {
    setShowAddOutreach(false);
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

  const respondedCount = outreachRecords?.filter(r => r.response_received).length || 0;
  const pendingCount = outreachRecords?.filter(r => !r.response_received).length || 0;
  const responseRate = outreachRecords && outreachRecords.length > 0 
    ? (respondedCount / outreachRecords.length) * 100 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{campaign.campaign_name}</DialogTitle>
            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
              {campaign.status}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="outreach">Outreach</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <TabsContent value="overview" className="space-y-4 mt-4">
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {campaign.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">{campaign.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Start Date</p>
                    <p className="font-medium">{format(new Date(campaign.start_date), 'MMM dd, yyyy')}</p>
                  </div>
                  {campaign.end_date && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">End Date</p>
                      <p className="font-medium">{format(new Date(campaign.end_date), 'MMM dd, yyyy')}</p>
                    </div>
                  )}
                </div>

                {campaign.target_companies && campaign.target_companies.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Target Companies</p>
                    <div className="flex flex-wrap gap-2">
                      {campaign.target_companies.map((company: string, idx: number) => (
                        <Badge key={idx} variant="secondary">{company}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {campaign.target_industries && campaign.target_industries.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Target Industries</p>
                    <div className="flex flex-wrap gap-2">
                      {campaign.target_industries.map((industry: string, idx: number) => (
                        <Badge key={idx} variant="secondary">{industry}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {campaign.target_roles && campaign.target_roles.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Target Roles</p>
                    <div className="flex flex-wrap gap-2">
                      {campaign.target_roles.map((role: string, idx: number) => (
                        <Badge key={idx} variant="secondary">{role}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{outreachRecords?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Outreach Sent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{respondedCount}</div>
                    <div className="text-sm text-muted-foreground">Responses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{Math.round(responseRate)}%</div>
                    <div className="text-sm text-muted-foreground">Response Rate</div>
                  </div>
                </div>

                {goals.outreach_target && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Outreach Goal</span>
                      <span className="font-medium">
                        {outreachRecords?.length || 0} / {goals.outreach_target}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(((outreachRecords?.length || 0) / goals.outreach_target) * 100, 100)} 
                    />
                  </div>
                )}

                {goals.response_target && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Response Goal</span>
                      <span className="font-medium">
                        {respondedCount} / {goals.response_target}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((respondedCount / goals.response_target) * 100, 100)} 
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="outreach" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Send className="h-4 w-4" /> {outreachRecords?.length || 0} sent
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" /> {respondedCount} responded
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-yellow-500" /> {pendingCount} pending
                </span>
              </div>
              <Button onClick={() => setShowAddOutreach(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Log Outreach
              </Button>
            </div>

            {showAddOutreach && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Log New Outreach</CardTitle>
                  <CardDescription>Record outreach sent as part of this campaign</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                      rows={3}
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

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => createOutreach.mutate()}
                      disabled={!contactName || createOutreach.isPending}
                    >
                      {createOutreach.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Log Outreach
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {outreachLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : outreachRecords && outreachRecords.length > 0 ? (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3 pr-4">
                  {outreachRecords.map((record) => {
                    const Icon = getOutreachIcon(record.outreach_type);

                    return (
                      <Card key={record.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                                  <Icon className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{record.contact_name}</p>
                                  {record.contact_title && record.contact_company && (
                                    <p className="text-sm text-muted-foreground">
                                      {record.contact_title} at {record.contact_company}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
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
                                )}{record.outcome && (
                                  <Badge variant="secondary">{record.outcome.replace('_', ' ')}</Badge>
                                )}
                              </div>

                              {record.message_content && (
                                <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded line-clamp-2">
                                  {record.message_content}
                                </p>
                              )}

                              <div className="text-xs text-muted-foreground">
                                Sent: {format(new Date(record.sent_at), 'MMM dd, yyyy')}
                                {record.response_date && (
                                  <span className="ml-4">
                                    Responded: {format(new Date(record.response_date), 'MMM dd, yyyy')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {!record.response_received && (
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
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No outreach logged yet</p>
                  <p className="text-sm">Start logging your campaign outreach to track progress</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Total Outreach
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{outreachRecords?.length || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Response Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(responseRate)}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Responses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{respondedCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingCount}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  A/B Testing Results
                </CardTitle>
                <CardDescription>Compare response rates across message variants</CardDescription>
              </CardHeader>
              <CardContent>
                {outreachRecords && outreachRecords.length > 0 ? (
                  <div className="space-y-4">
                    {['A', 'B', 'C', 'D'].map(variant => {
                      const variantRecords = outreachRecords.filter(r => r.message_variant === variant);
                      const variantResponses = variantRecords.filter(r => r.response_received).length;
                      const variantRate = variantRecords.length > 0 
                        ? (variantResponses / variantRecords.length) * 100 
                        : 0;

                      if (variantRecords.length === 0) return null;

                      return (
                        <div key={variant} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Variant {variant}</span>
                            <span className="text-muted-foreground">
                              {variantResponses}/{variantRecords.length} ({Math.round(variantRate)}%)
                            </span>
                          </div>
                          <Progress value={variantRate} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Log outreach with different variants to see A/B testing results</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Outreach by Type</CardTitle>
              </CardHeader>
              <CardContent>
                {outreachRecords && outreachRecords.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { type: 'message', label: 'Message', icon: MessageSquare },
                      { type: 'email', label: 'Email', icon: Mail },
                      { type: 'linkedin', label: 'LinkedIn', icon: Linkedin },
                      { type: 'call', label: 'Phone', icon: Phone }
                    ].map(({ type, label, icon: Icon }) => {
                      const count = outreachRecords.filter(r => r.outreach_type === type).length;
                      if (count === 0) return null;
                      return (
                        <div key={type} className="flex items-center gap-3 p-3 border rounded-lg">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{count}</p>
                            <p className="text-xs text-muted-foreground">{label}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">No outreach data yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
