import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageSquarePlus, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

type FeedbackType = 'resume' | 'cover_letter' | 'interview' | 'job_search' | 'general' | 'skill_development';
type Priority = 'low' | 'medium' | 'high';

interface GiveFeedbackDialogProps {
  menteeId?: string;
  relationshipId?: string;
}

export function GiveFeedbackDialog({ menteeId: propMenteeId, relationshipId: propRelationshipId }: GiveFeedbackDialogProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedMenteeId, setSelectedMenteeId] = useState<string>(propMenteeId || "");
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string>(propRelationshipId || "");
  const [subject, setSubject] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [priority, setPriority] = useState<Priority>('medium');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
  const [reviewDeadline, setReviewDeadline] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Update state when props change
  useState(() => {
    if (propMenteeId) setSelectedMenteeId(propMenteeId);
    if (propRelationshipId) setSelectedRelationshipId(propRelationshipId);
  });

  // Get current user's mentee relationships (where they are the mentor)
  const { data: relationships } = useQuery({
    queryKey: ['mentor-mentees'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('mentor_relationships')
        .select('id, mentee_id, status')
        .eq('mentor_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      return data;
    }
  });

  // Fetch mentee's materials when a mentee is selected and feedback type is resume or cover_letter
  const { data: menteeMaterials } = useQuery({
    queryKey: ['mentee-materials', selectedMenteeId, feedbackType],
    queryFn: async () => {
      if (!selectedMenteeId || (feedbackType !== 'resume' && feedbackType !== 'cover_letter')) {
        return [];
      }

      const materialType = feedbackType === 'resume' ? 'resume' : 'cover_letter';
      
      const { data, error } = await supabase
        .from('application_materials')
        .select('id, version_name, file_name, created_at')
        .eq('user_id', selectedMenteeId)
        .eq('material_type', materialType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedMenteeId && (feedbackType === 'resume' || feedbackType === 'cover_letter')
  });

  // Reset material selection and deadline when feedback type changes
  useEffect(() => {
    setSelectedMaterialId("");
    setReviewDeadline(undefined);
  }, [feedbackType]);

  const createFeedback = useMutation({
    mutationFn: async () => {
      if (!selectedMenteeId || !selectedRelationshipId || !subject.trim() || !feedbackText.trim()) {
        throw new Error("Please fill in all required fields");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get mentor's name for the notification
      const { data: mentorProfile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();

      const mentorName = mentorProfile 
        ? `${mentorProfile.first_name} ${mentorProfile.last_name}`.trim() || 'Your mentor'
        : 'Your mentor';

      // Save feedback with deadline directly on the feedback record
      const { error } = await supabase
        .from('mentor_feedback')
        .insert({
          mentor_id: user.id,
          mentee_id: selectedMenteeId,
          relationship_id: selectedRelationshipId,
          subject: subject.trim(),
          feedback_text: feedbackText.trim(),
          feedback_type: feedbackType,
          priority: priority,
          status: 'open',
          related_item_id: selectedMaterialId || null,
          related_item_type: selectedMaterialId ? feedbackType : null,
          review_deadline: reviewDeadline?.toISOString() || null
        });

      if (error) throw error;

      // Create in-app notification for the mentee
      await supabase
        .from('notifications')
        .insert({
          user_id: selectedMenteeId,
          title: 'New Feedback from Mentor',
          message: `${mentorName} sent you feedback: "${subject.trim()}"${reviewDeadline ? ` (Review deadline: ${format(reviewDeadline, 'PPP')})` : ''}`,
          type: 'mentor_feedback',
          link: '/mentors',
          is_read: false
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-feedback'] });
      toast({
        title: "Feedback Sent!",
        description: "Your feedback has been shared with the mentee."
      });
      // Reset form
      setSelectedMenteeId("");
      setSelectedRelationshipId("");
      setSubject("");
      setFeedbackText("");
      setFeedbackType('general');
      setPriority('medium');
      setSelectedMaterialId("");
      setReviewDeadline(undefined);
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Feedback",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleMenteeSelect = (menteeId: string) => {
    setSelectedMenteeId(menteeId);
    const relationship = relationships?.find(r => r.mentee_id === menteeId);
    if (relationship) {
      setSelectedRelationshipId(relationship.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          Give Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Give Feedback to Mentee</DialogTitle>
          <DialogDescription>
            Provide constructive feedback and guidance to help your mentee grow
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="mentee">Select Mentee *</Label>
            <Select 
              value={selectedMenteeId} 
              onValueChange={handleMenteeSelect}
              disabled={!!propMenteeId}
            >
              <SelectTrigger id="mentee">
                <SelectValue placeholder="Choose a mentee..." />
              </SelectTrigger>
              <SelectContent>
                {relationships && relationships.length > 0 ? (
                  relationships.map((rel) => (
                    <SelectItem key={rel.id} value={rel.mentee_id}>
                      <MenteeOption menteeId={rel.mentee_id} />
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No active mentees
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-type">Feedback Type *</Label>
            <Select value={feedbackType} onValueChange={(v) => setFeedbackType(v as FeedbackType)}>
              <SelectTrigger id="feedback-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Guidance</SelectItem>
                <SelectItem value="resume">Resume Review</SelectItem>
                <SelectItem value="cover_letter">Cover Letter</SelectItem>
                <SelectItem value="interview">Interview Preparation</SelectItem>
                <SelectItem value="job_search">Job Search Strategy</SelectItem>
                <SelectItem value="skill_development">Skill Development</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(feedbackType === 'resume' || feedbackType === 'cover_letter') && selectedMenteeId && (
            <div className="space-y-2">
              <Label htmlFor="material-version">
                Select {feedbackType === 'resume' ? 'Resume' : 'Cover Letter'} Version
              </Label>
              <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                <SelectTrigger id="material-version">
                  <SelectValue placeholder={`Choose a ${feedbackType === 'resume' ? 'resume' : 'cover letter'} version...`} />
                </SelectTrigger>
                <SelectContent>
                  {menteeMaterials && menteeMaterials.length > 0 ? (
                    menteeMaterials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.version_name || material.file_name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No {feedbackType === 'resume' ? 'resumes' : 'cover letters'} found
                    </div>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the specific version you're reviewing for approval tracking
              </p>
            </div>
          )}

          {(feedbackType === 'resume' || feedbackType === 'cover_letter') && selectedMenteeId && selectedMaterialId && (
            <div className="space-y-2">
              <Label>Review Deadline (Optional)</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {reviewDeadline ? format(reviewDeadline, "PPP") : "Set review deadline..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={reviewDeadline}
                    onSelect={(date) => {
                      setReviewDeadline(date);
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {reviewDeadline && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setReviewDeadline(undefined)}
                  className="text-xs"
                >
                  Clear deadline
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Set a deadline for the mentee to implement your feedback
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="priority">Priority *</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - General Suggestion</SelectItem>
                <SelectItem value="medium">Medium - Important</SelectItem>
                <SelectItem value="high">High - Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your feedback"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">{subject.length}/200 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">Detailed Feedback *</Label>
            <Textarea
              id="feedback"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Provide detailed, constructive feedback and actionable recommendations..."
              className="min-h-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              Be specific, constructive, and actionable. Focus on growth opportunities.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => createFeedback.mutate()}
              disabled={!selectedMenteeId || !subject.trim() || !feedbackText.trim() || createFeedback.isPending}
              className="flex-1"
            >
              {createFeedback.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Feedback'
              )}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MenteeOption({ menteeId }: { menteeId: string }) {
  const { data: profile } = useUserProfile(menteeId);
  
  if (!profile) return <span>Loading...</span>;
  
  return (
    <span>
      {profile.first_name} {profile.last_name}
      {profile.email && <span className="text-muted-foreground ml-2">({profile.email})</span>}
    </span>
  );
}
