import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Video, Plus, Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface AdvisorSessionsProps {
  advisors: any[];
}

export function AdvisorSessions({ advisors }: AdvisorSessionsProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    advisor_id: "",
    session_type: "coaching",
    scheduled_at: "",
    duration_minutes: "60",
    meeting_link: "",
    notes: "",
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("advisor_sessions")
        .select("*, external_advisors(advisor_name)")
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const selectedAdvisor = advisors.find(a => a.id === formData.advisor_id);

      const { error } = await supabase.from("advisor_sessions").insert({
        user_id: user.id,
        advisor_id: formData.advisor_id,
        session_type: formData.session_type,
        scheduled_at: formData.scheduled_at,
        duration_minutes: parseInt(formData.duration_minutes),
        meeting_link: formData.meeting_link || null,
        notes: formData.notes || null,
        amount_charged: selectedAdvisor?.hourly_rate ? 
          (selectedAdvisor.hourly_rate * parseInt(formData.duration_minutes) / 60) : null,
      });

      if (error) throw error;

      toast.success("Session scheduled");
      setDialogOpen(false);
      fetchSessions();
      setFormData({
        advisor_id: "",
        session_type: "coaching",
        scheduled_at: "",
        duration_minutes: "60",
        meeting_link: "",
        notes: "",
      });
    } catch (error: any) {
      toast.error("Failed to schedule session");
    }
  };

  const updateSessionStatus = async (sessionId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("advisor_sessions")
        .update({ status })
        .eq("id", sessionId);

      if (error) throw error;
      toast.success(`Session marked as ${status}`);
      fetchSessions();
    } catch (error: any) {
      toast.error("Failed to update session");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-500/10 text-blue-500";
      case "completed": return "bg-green-500/10 text-green-500";
      case "cancelled": return "bg-red-500/10 text-red-500";
      case "no_show": return "bg-yellow-500/10 text-yellow-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const activeAdvisors = advisors.filter(a => a.status === 'active');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Coaching Sessions</h3>
          <p className="text-sm text-muted-foreground">Schedule and manage sessions with your advisors</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={activeAdvisors.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Session
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading sessions...</div>
      ) : sessions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No sessions scheduled yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {session.session_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Session
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        with {session.external_advisors?.advisor_name}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(session.scheduled_at), "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(session.scheduled_at), "h:mm a")} ({session.duration_minutes} min)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(session.status)}>{session.status}</Badge>
                    {session.meeting_link && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={session.meeting_link} target="_blank" rel="noopener noreferrer">
                          <Video className="h-4 w-4 mr-1" />
                          Join
                        </a>
                      </Button>
                    )}
                    {session.status === 'scheduled' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateSessionStatus(session.id, 'completed')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateSessionStatus(session.id, 'cancelled')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Session</DialogTitle>
            <DialogDescription>Book a coaching session with your advisor</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Advisor *</Label>
              <Select
                value={formData.advisor_id}
                onValueChange={(value) => setFormData({ ...formData, advisor_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select advisor" />
                </SelectTrigger>
                <SelectContent>
                  {activeAdvisors.map((advisor) => (
                    <SelectItem key={advisor.id} value={advisor.id}>
                      {advisor.advisor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Session Type</Label>
                <Select
                  value={formData.session_type}
                  onValueChange={(value) => setFormData({ ...formData, session_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coaching">General Coaching</SelectItem>
                    <SelectItem value="review">Document Review</SelectItem>
                    <SelectItem value="strategy">Strategy Session</SelectItem>
                    <SelectItem value="mock_interview">Mock Interview</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={formData.duration_minutes}
                  onValueChange={(value) => setFormData({ ...formData, duration_minutes: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date & Time *</Label>
              <Input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Meeting Link</Label>
              <Input
                placeholder="https://zoom.us/j/..."
                value={formData.meeting_link}
                onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Topics to discuss..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Schedule Session</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
