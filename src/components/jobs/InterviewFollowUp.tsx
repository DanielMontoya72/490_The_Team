import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, Plus, CheckCircle2, Clock, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { FollowUpPlaceholderForm } from "./FollowUpPlaceholderForm";
import { FollowUpMetrics } from "./FollowUpMetrics";

interface FollowUp {
  id: string;
  follow_up_type: string;
  subject: string;
  content: string;
  sent_at: string | null;
  response_received: boolean;
  response_date: string | null;
  notes: string | null;
  created_at: string;
}

interface InterviewFollowUpProps {
  interviewId: string;
}

export function InterviewFollowUp({ interviewId }: InterviewFollowUpProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('thank_you');
  const [customContext, setCustomContext] = useState('');
  
  const [generatedTemplate, setGeneratedTemplate] = useState<{
    subject: string;
    content: string;
    timing_recommendation: string;
    tips: string[];
  } | null>(null);

  const { data: followUps, isLoading } = useQuery({
    queryKey: ['interview-follow-ups', interviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_follow_ups')
        .select('*')
        .eq('interview_id', interviewId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FollowUp[];
    },
  });

  const generateTemplateMutation = useMutation({
    mutationFn: async ({ type, context }: { type: string; context: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-follow-up-template', {
        body: { 
          interviewId,
          followUpType: type,
          customContext: context
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setGeneratedTemplate(data);
      setIsGenerating(false);
      toast({
        title: "Template Generated",
        description: "Your follow-up email template is ready!",
      });
    },
    onError: (error) => {
      setIsGenerating(false);
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveFollowUpMutation = useMutation({
    mutationFn: async (followUpData: {
      subject: string;
      content: string;
      type: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('interview_follow_ups')
        .insert({
          user_id: user.id,
          interview_id: interviewId,
          follow_up_type: followUpData.type,
          subject: followUpData.subject,
          content: followUpData.content,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-follow-ups', interviewId] });
      setIsDialogOpen(false);
      setGeneratedTemplate(null);
      setCustomContext('');
      toast({
        title: "Follow-up Saved",
        description: "Your follow-up email has been saved. You can now copy and send it.",
      });
    },
  });

  const markAsSentMutation = useMutation({
    mutationFn: async (followUpId: string) => {
      const { error } = await supabase
        .from('interview_follow_ups')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', followUpId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-follow-ups', interviewId] });
      toast({
        title: "Marked as Sent",
        description: "Follow-up has been marked as sent.",
      });
    },
  });

  const markResponseMutation = useMutation({
    mutationFn: async ({ followUpId, received }: { followUpId: string; received: boolean }) => {
      const { error } = await supabase
        .from('interview_follow_ups')
        .update({ 
          response_received: received,
          response_date: received ? new Date().toISOString() : null
        })
        .eq('id', followUpId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-follow-ups', interviewId] });
    },
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    generateTemplateMutation.mutate({ type: selectedType, context: customContext });
  };

  const handlePlaceholderComplete = (filledSubject: string, filledContent: string) => {
    saveFollowUpMutation.mutate({
      subject: filledSubject,
      content: filledContent,
      type: selectedType,
    });
  };

  const handleCancelPlaceholders = () => {
    setGeneratedTemplate(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "Content has been copied to your clipboard.",
    });
  };

  const followUpTypes = [
    { value: 'thank_you', label: 'Thank You Email' },
    { value: 'status_inquiry', label: 'Status Inquiry' },
    { value: 'feedback_request', label: 'Feedback Request' },
    { value: 'networking', label: 'Networking Follow-up' },
  ];

  const getTypeLabel = (type: string) => {
    return followUpTypes.find(t => t.value === type)?.label || type;
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'thank_you': return 'default';
      case 'status_inquiry': return 'secondary';
      case 'feedback_request': return 'outline';
      case 'networking': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Interview Follow-ups</h3>
          <p className="text-sm text-muted-foreground">
            Generate and track professional follow-up communications
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Follow-up
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Generate Follow-up Email</DialogTitle>
              <DialogDescription>
                Create a personalized follow-up email template for this interview
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Follow-up Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {followUpTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Additional Context (Optional)</Label>
                <Textarea
                  placeholder="Add any specific details you'd like to include..."
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  className="resize-none overflow-hidden"
                  style={{ height: 'auto', minHeight: '72px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.max(72, target.scrollHeight) + 'px';
                  }}
                />
              </div>

              <Button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Mail className="mr-2 h-4 w-4" />
                Generate Template
              </Button>

              {generatedTemplate && (
                <div className="space-y-4 border-t pt-4">
                  {/* Timing recommendation at top */}
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{generatedTemplate.timing_recommendation}</span>
                  </div>

                  {/* Tips collapsed */}
                  {generatedTemplate.tips.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Tips for personalizing
                      </summary>
                      <ul className="mt-2 space-y-1 pl-4">
                        {generatedTemplate.tips.map((tip, index) => (
                          <li key={index} className="text-muted-foreground flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {/* Integrated placeholder form */}
                  <FollowUpPlaceholderForm
                    subject={generatedTemplate.subject}
                    content={generatedTemplate.content}
                    followUpType={selectedType}
                    onComplete={handlePlaceholderComplete}
                    onCancel={handleCancelPlaceholders}
                    isSaving={saveFollowUpMutation.isPending}
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : followUps && followUps.length > 0 ? (
        <>
          <FollowUpMetrics followUps={followUps} />
          <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="unsent">Unsent</TabsTrigger>
            <TabsTrigger value="responded">Responded</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {followUps.map((followUp) => (
              <FollowUpCard
                key={followUp.id}
                followUp={followUp}
                getTypeLabel={getTypeLabel}
                getTypeBadgeVariant={getTypeBadgeVariant}
                copyToClipboard={copyToClipboard}
                markAsSentMutation={markAsSentMutation}
                markResponseMutation={markResponseMutation}
              />
            ))}
          </TabsContent>

          <TabsContent value="sent" className="space-y-3">
            {followUps.filter(f => f.sent_at).map((followUp) => (
              <FollowUpCard
                key={followUp.id}
                followUp={followUp}
                getTypeLabel={getTypeLabel}
                getTypeBadgeVariant={getTypeBadgeVariant}
                copyToClipboard={copyToClipboard}
                markAsSentMutation={markAsSentMutation}
                markResponseMutation={markResponseMutation}
              />
            ))}
          </TabsContent>

          <TabsContent value="unsent" className="space-y-3">
            {followUps.filter(f => !f.sent_at).map((followUp) => (
              <FollowUpCard
                key={followUp.id}
                followUp={followUp}
                getTypeLabel={getTypeLabel}
                getTypeBadgeVariant={getTypeBadgeVariant}
                copyToClipboard={copyToClipboard}
                markAsSentMutation={markAsSentMutation}
                markResponseMutation={markResponseMutation}
              />
            ))}
          </TabsContent>

          <TabsContent value="responded" className="space-y-3">
            {followUps.filter(f => f.response_received).map((followUp) => (
              <FollowUpCard
                key={followUp.id}
                followUp={followUp}
                getTypeLabel={getTypeLabel}
                getTypeBadgeVariant={getTypeBadgeVariant}
                copyToClipboard={copyToClipboard}
                markAsSentMutation={markAsSentMutation}
                markResponseMutation={markResponseMutation}
              />
            ))}
          </TabsContent>
        </Tabs>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No follow-ups yet. Click "New Follow-up" to create one.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FollowUpCard({ 
  followUp, 
  getTypeLabel, 
  getTypeBadgeVariant, 
  copyToClipboard, 
  markAsSentMutation,
  markResponseMutation 
}: { 
  followUp: FollowUp;
  getTypeLabel: (type: string) => string;
  getTypeBadgeVariant: (type: string) => "default" | "secondary" | "outline";
  copyToClipboard: (text: string) => void;
  markAsSentMutation: any;
  markResponseMutation: any;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{followUp.subject}</CardTitle>
              <Badge variant={getTypeBadgeVariant(followUp.follow_up_type)}>
                {getTypeLabel(followUp.follow_up_type)}
              </Badge>
            </div>
            <CardDescription>
              Created {format(new Date(followUp.created_at), 'MMM d, yyyy')}
              {followUp.sent_at && ` • Sent ${format(new Date(followUp.sent_at), 'MMM d, yyyy')}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {followUp.response_received && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Response Received
              </Badge>
            )}
            {!followUp.sent_at && (
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                Draft
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Email Content</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(`Subject: ${followUp.subject}\n\n${followUp.content}`)}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
          <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
            {followUp.content}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!followUp.sent_at && (
            <Button
              size="sm"
              onClick={() => markAsSentMutation.mutate(followUp.id)}
              disabled={markAsSentMutation.isPending}
            >
              Mark as Sent
            </Button>
          )}
          {followUp.sent_at && !followUp.response_received && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => markResponseMutation.mutate({ followUpId: followUp.id, received: true })}
              disabled={markResponseMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Response Received
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
