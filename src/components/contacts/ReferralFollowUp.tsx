import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Clock, Send, AlertTriangle, CheckCircle, MessageSquare, RefreshCw, Calendar, Sparkles, Loader2 } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";

interface FollowUpDialogProps {
  request: any;
  onSuccess: () => void;
}

function FollowUpDialog({ request, onSuccess }: FollowUpDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const daysSinceSent = request.requested_at 
    ? differenceInDays(new Date(), new Date(request.requested_at))
    : 0;

  const generateFollowUp = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-referral-followup', {
        body: {
          originalMessage: request.request_message,
          contactName: `${request.professional_contacts?.first_name || ''} ${request.professional_contacts?.last_name || ''}`.trim(),
          jobTitle: request.jobs?.job_title,
          companyName: request.jobs?.company_name,
          daysSinceSent,
          followUpNumber: request.follow_up_count || 0,
        },
      });
      if (error) throw error;
      setFollowUpMessage(data.message);
      toast.success('Follow-up message generated');
    } catch (error) {
      console.error('Error generating follow-up:', error);
      toast.error('Failed to generate follow-up message');
    } finally {
      setIsGenerating(false);
    }
  };

  const sendFollowUp = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('referral_requests')
        .update({
          followed_up_at: new Date().toISOString(),
          follow_up_count: (request.follow_up_count || 0) + 1,
          last_follow_up_message: followUpMessage,
        })
        .eq('id', request.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral_requests'] });
      toast.success('Follow-up recorded');
      setIsOpen(false);
      setFollowUpMessage("");
      onSuccess();
    },
    onError: () => toast.error('Failed to record follow-up'),
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <RefreshCw className="h-4 w-4 mr-1" />
          Follow Up
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Follow-Up</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
            <p><strong>Contact:</strong> {request.professional_contacts?.first_name} {request.professional_contacts?.last_name}</p>
            <p><strong>Position:</strong> {request.jobs?.job_title} at {request.jobs?.company_name}</p>
            <p><strong>Days since request:</strong> {daysSinceSent} days</p>
            {request.follow_up_count > 0 && (
              <p><strong>Previous follow-ups:</strong> {request.follow_up_count}</p>
            )}
          </div>

          {daysSinceSent < 5 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Consider waiting a few more days before following up. 5-7 days is typically recommended.
              </AlertDescription>
            </Alert>
          )}

          {request.follow_up_count >= 2 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You've already sent {request.follow_up_count} follow-ups. Consider moving on to preserve the relationship.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Follow-Up Message</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={generateFollowUp}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate with AI
              </Button>
            </div>
            <Textarea
              value={followUpMessage}
              onChange={(e) => setFollowUpMessage(e.target.value)}
              placeholder="Write your follow-up message..."
              className="min-h-[150px]"
            />
          </div>

          <Button
            onClick={() => sendFollowUp.mutate()}
            disabled={!followUpMessage || sendFollowUp.isPending}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            Record Follow-Up Sent
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReferralFollowUp() {
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['referral_requests_followup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_requests')
        .select(`
          *,
          jobs (job_title, company_name),
          professional_contacts (first_name, last_name, current_company, email)
        `)
        .in('status', ['sent', 'no_response'])
        .order('requested_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const getFollowUpStatus = (request: any) => {
    if (!request.requested_at) return { status: 'not_sent', label: 'Not Sent', variant: 'outline' as const };
    
    const daysSinceSent = differenceInDays(new Date(), new Date(request.requested_at));
    const daysSinceFollowUp = request.followed_up_at 
      ? differenceInDays(new Date(), new Date(request.followed_up_at))
      : null;

    if (request.follow_up_count >= 3) {
      return { status: 'max_reached', label: 'Max Follow-ups', variant: 'destructive' as const };
    }

    if (daysSinceFollowUp !== null && daysSinceFollowUp < 5) {
      return { status: 'recent_followup', label: 'Recently Followed Up', variant: 'secondary' as const };
    }

    if (daysSinceSent >= 14 && (request.follow_up_count || 0) < 2) {
      return { status: 'overdue', label: 'Follow-up Overdue', variant: 'destructive' as const };
    }

    if (daysSinceSent >= 7) {
      return { status: 'due', label: 'Follow-up Due', variant: 'default' as const };
    }

    return { status: 'waiting', label: 'Waiting', variant: 'outline' as const };
  };

  const overdueRequests = requests.filter(r => {
    const status = getFollowUpStatus(r);
    return status.status === 'overdue' || status.status === 'due';
  });

  const waitingRequests = requests.filter(r => {
    const status = getFollowUpStatus(r);
    return status.status === 'waiting' || status.status === 'recent_followup';
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Follow-up Timing Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Follow-Up Timing Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="font-medium text-green-700 dark:text-green-400">First Follow-up</p>
              <p className="text-sm text-muted-foreground">5-7 days after initial request</p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="font-medium text-yellow-700 dark:text-yellow-400">Second Follow-up</p>
              <p className="text-sm text-muted-foreground">7-10 days after first follow-up</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="font-medium text-red-700 dark:text-red-400">Final Follow-up</p>
              <p className="text-sm text-muted-foreground">10-14 days later, then move on</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overdue / Due Follow-ups */}
      {overdueRequests.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Action Needed ({overdueRequests.length})
            </CardTitle>
            <CardDescription>These referral requests need follow-up attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdueRequests.map((request: any) => {
              const followUpStatus = getFollowUpStatus(request);
              const daysSinceSent = differenceInDays(new Date(), new Date(request.requested_at));
              const suggestedDate = addDays(new Date(request.followed_up_at || request.requested_at), 7);

              return (
                <div key={request.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {request.professional_contacts?.first_name} {request.professional_contacts?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {request.jobs?.job_title} at {request.jobs?.company_name}
                      </p>
                    </div>
                    <Badge variant={followUpStatus.variant}>{followUpStatus.label}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Sent {daysSinceSent} days ago
                    </span>
                    {request.follow_up_count > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {request.follow_up_count} follow-up{request.follow_up_count > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <FollowUpDialog 
                      request={request} 
                      onSuccess={() => queryClient.invalidateQueries({ queryKey: ['referral_requests_followup'] })} 
                    />
                    {request.professional_contacts?.email && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`mailto:${request.professional_contacts.email}`, '_blank')}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Email
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Waiting / Recently Followed Up */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Requests ({waitingRequests.length})
          </CardTitle>
          <CardDescription>Requests that are waiting for response or recently followed up</CardDescription>
        </CardHeader>
        <CardContent>
          {waitingRequests.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>No pending follow-ups at this time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {waitingRequests.map((request: any) => {
                const followUpStatus = getFollowUpStatus(request);
                const daysSinceSent = request.requested_at 
                  ? differenceInDays(new Date(), new Date(request.requested_at))
                  : 0;
                const nextFollowUpDate = addDays(
                  new Date(request.followed_up_at || request.requested_at || new Date()),
                  7
                );

                return (
                  <div key={request.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {request.professional_contacts?.first_name} {request.professional_contacts?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {request.jobs?.job_title} at {request.jobs?.company_name}
                        </p>
                      </div>
                      <Badge variant={followUpStatus.variant}>{followUpStatus.label}</Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Sent {daysSinceSent} days ago</span>
                      {request.follow_up_count > 0 && (
                        <span>{request.follow_up_count} follow-up{request.follow_up_count > 1 ? 's' : ''}</span>
                      )}
                      <span>Next follow-up: {format(nextFollowUpDate, 'MMM d')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
