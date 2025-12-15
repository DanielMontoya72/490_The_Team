import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, MessageSquare, Clock, TrendingUp } from "lucide-react";
import { format, differenceInHours } from "date-fns";

interface FollowUp {
  id: string;
  follow_up_type: string;
  sent_at: string | null;
  response_received: boolean;
  response_date: string | null;
  created_at: string;
}

interface FollowUpMetricsProps {
  followUps: FollowUp[];
}

export function FollowUpMetrics({ followUps }: FollowUpMetricsProps) {
  if (!followUps || followUps.length === 0) {
    return null;
  }

  const totalFollowUps = followUps.length;
  const sentFollowUps = followUps.filter(f => f.sent_at).length;
  const respondedFollowUps = followUps.filter(f => f.response_received).length;
  
  const sendRate = totalFollowUps > 0 ? (sentFollowUps / totalFollowUps * 100).toFixed(1) : '0';
  const responseRate = sentFollowUps > 0 ? (respondedFollowUps / sentFollowUps * 100).toFixed(1) : '0';

  // Calculate average time to send (from creation to sent)
  const sentWithTimes = followUps.filter(f => f.sent_at).map(f => ({
    created: new Date(f.created_at),
    sent: new Date(f.sent_at!)
  }));
  
  const avgTimeToSendHours = sentWithTimes.length > 0
    ? sentWithTimes.reduce((sum, f) => sum + differenceInHours(f.sent, f.created), 0) / sentWithTimes.length
    : 0;

  // Calculate average time to response (from sent to response)
  const respondedWithTimes = followUps
    .filter(f => f.sent_at && f.response_received && f.response_date)
    .map(f => ({
      sent: new Date(f.sent_at!),
      responded: new Date(f.response_date!)
    }));
  
  const avgTimeToResponseHours = respondedWithTimes.length > 0
    ? respondedWithTimes.reduce((sum, f) => sum + differenceInHours(f.responded, f.sent), 0) / respondedWithTimes.length
    : 0;

  // Group by type
  const byType = followUps.reduce((acc, f) => {
    if (!acc[f.follow_up_type]) {
      acc[f.follow_up_type] = { total: 0, sent: 0, responded: 0 };
    }
    acc[f.follow_up_type].total++;
    if (f.sent_at) acc[f.follow_up_type].sent++;
    if (f.response_received) acc[f.follow_up_type].responded++;
    return acc;
  }, {} as Record<string, { total: number; sent: number; responded: number }>);

  const formatHours = (hours: number) => {
    if (hours < 1) return '<1 hour';
    if (hours < 24) return `${Math.round(hours)} hours`;
    const days = Math.round(hours / 24);
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      thank_you: 'Thank You',
      status_inquiry: 'Status Inquiry',
      feedback_request: 'Feedback Request',
      networking: 'Networking'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Total Follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFollowUps}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Send className="h-4 w-4 text-muted-foreground" />
              Send Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sendRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {sentFollowUps} of {totalFollowUps} sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Response Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responseRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {respondedFollowUps} of {sentFollowUps} responded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Avg. Time to Send
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sentFollowUps > 0 ? formatHours(avgTimeToSendHours) : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {respondedFollowUps > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Average Response Time
            </CardTitle>
            <CardDescription>Time from sending to receiving a response</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {formatHours(avgTimeToResponseHours)}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Performance by Type</CardTitle>
          <CardDescription>Breakdown of follow-up effectiveness by template type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(byType).map(([type, stats]) => (
              <div key={type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{getTypeLabel(type)}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {stats.total} total
                    </Badge>
                    {stats.sent > 0 && (
                      <Badge variant="default" className="bg-blue-600 text-xs">
                        {stats.sent} sent
                      </Badge>
                    )}
                    {stats.responded > 0 && (
                      <Badge variant="default" className="bg-green-600 text-xs">
                        {stats.responded} responded
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div>
                    Send Rate: {stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(0) : 0}%
                  </div>
                  <div>
                    Response Rate: {stats.sent > 0 ? ((stats.responded / stats.sent) * 100).toFixed(0) : 0}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
