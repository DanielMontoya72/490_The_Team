import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, CheckCircle2, XCircle, Send } from "lucide-react";
import { ResumeFeedback } from "@/types/resume-collaboration";

interface ResumeFeedbackPanelProps {
  resumeId: string;
  shareId: string;
  isOwner?: boolean;
  allowComments?: boolean;
}

export function ResumeFeedbackPanel({ 
  resumeId, 
  shareId, 
  isOwner = false,
  allowComments = true 
}: ResumeFeedbackPanelProps) {
  const [feedback, setFeedback] = useState<ResumeFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    loadFeedback();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`resume-feedback-${resumeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resume_feedback',
          filter: `resume_id=eq.${resumeId}`
        },
        () => {
          loadFeedback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resumeId]);

  const loadFeedback = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("resume_feedback")
        .select("*")
        .eq("resume_id", resumeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFeedback(data as ResumeFeedback[] || []);
    } catch (error) {
      console.error("Error loading feedback:", error);
    }
  };

  const submitFeedback = async () => {
    if (!newComment.trim() || !reviewerName.trim() || !reviewerEmail.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("resume_feedback")
        .insert({
          resume_id: resumeId,
          share_id: shareId,
          reviewer_name: reviewerName,
          reviewer_email: reviewerEmail,
          comment_text: newComment,
          section_reference: selectedSection || null,
          status: "open",
        });

      if (error) throw error;

      setNewComment("");
      setSelectedSection("");
      toast({
        title: "Feedback submitted",
        description: "Your feedback has been added successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error submitting feedback",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFeedbackStatus = async (feedbackId: string, status: "resolved" | "dismissed") => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await (supabase as any)
        .from("resume_feedback")
        .update({
          status,
          resolved_by: user?.id || null,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", feedbackId);

      if (error) throw error;

      toast({
        title: status === "resolved" ? "Feedback resolved" : "Feedback dismissed",
        description: `The feedback has been marked as ${status}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating feedback",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="outline">Open</Badge>;
      case "resolved":
        return <Badge variant="default">Resolved</Badge>;
      case "dismissed":
        return <Badge variant="secondary">Dismissed</Badge>;
      default:
        return null;
    }
  };

  const openFeedback = feedback.filter(f => f.status === "open");
  const closedFeedback = feedback.filter(f => f.status !== "open");

  return (
    <div className="space-y-6">
      {allowComments && !isOwner && (
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Add Feedback</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Share your thoughts and suggestions - no account required
            </p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Your Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={reviewerEmail}
                  onChange={(e) => setReviewerEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="section">Section (Optional)</Label>
              <Input
                id="section"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                placeholder="e.g., Experience, Education"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Your Feedback</Label>
              <Textarea
                id="comment"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts and suggestions..."
                rows={4}
              />
            </div>

            <Button onClick={submitFeedback} disabled={loading} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              Submit Feedback
            </Button>
          </div>
        </Card>
      )}

      {openFeedback.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Open Feedback ({openFeedback.length})
          </h3>
          {openFeedback.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{item.reviewer_name}</p>
                    <p className="text-sm text-muted-foreground">{item.reviewer_email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(item.status)}
                    {item.section_reference && (
                      <Badge variant="outline">{item.section_reference}</Badge>
                    )}
                  </div>
                </div>

                <p className="text-sm">{item.comment_text}</p>

                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                  {isOwner && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateFeedbackStatus(item.id, "resolved")}
                        disabled={loading}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateFeedbackStatus(item.id, "dismissed")}
                        disabled={loading}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {closedFeedback.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Resolved Feedback ({closedFeedback.length})</h3>
          {closedFeedback.map((item) => (
            <Card key={item.id} className="p-4 opacity-60">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{item.reviewer_name}</p>
                    <p className="text-sm text-muted-foreground">{item.reviewer_email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(item.status)}
                    {item.section_reference && (
                      <Badge variant="outline">{item.section_reference}</Badge>
                    )}
                  </div>
                </div>

                <p className="text-sm">{item.comment_text}</p>

                <p className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {feedback.length === 0 && (
        <Card className="p-8 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No feedback yet</p>
        </Card>
      )}
    </div>
  );
}
