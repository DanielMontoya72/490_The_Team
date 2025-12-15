import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FeedbackThemesSummary } from "./FeedbackThemesSummary";
import { MaterialReviewImpact } from "./MaterialReviewImpact";
import { ApprovalWorkflow } from "./ApprovalWorkflow";
import { ReviewDeadlineManager } from "./ReviewDeadlineManager";
import { FileText, MessageSquare, BarChart3, Shield, Clock, Users } from "lucide-react";

interface CollaborativeReviewDashboardProps {
  materialType?: "resume" | "cover_letter" | "all";
}

// Helper function to get readable label for feedback type
function getFeedbackTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    resume: "Resume",
    cover_letter: "Cover Letter",
    interview: "Interview",
    job_search: "Job Search",
    general: "General",
    skill_development: "Skill Development",
    mentor: "Mentor Guidance",
  };
  return labels[type] || type;
}

export function CollaborativeReviewDashboard({ materialType = "all" }: CollaborativeReviewDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all shares and feedback
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["collaborative-review-dashboard", materialType],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return null;

      // Fetch resume shares
      const { data: resumeShares } = await (supabase as any)
        .from("resume_shares")
        .select(`
          *,
          resumes(id, resume_name, user_id)
        `)
        .eq("user_id", session.user.id)
        .eq("is_active", true);

      // Fetch cover letter shares
      const { data: coverLetterShares } = await (supabase as any)
        .from("cover_letter_shares")
        .select(`
          *,
          application_materials(id, version_name, user_id)
        `)
        .eq("user_id", session.user.id)
        .eq("is_active", true);

      // Fetch resume feedback
      const resumeIds = resumeShares?.map((s: any) => s.resume_id) || [];
      const { data: resumeFeedback } = resumeIds.length > 0 
        ? await (supabase as any)
            .from("resume_feedback")
            .select("*")
            .in("resume_id", resumeIds)
        : { data: [] };

      // Fetch cover letter feedback
      const coverLetterIds = coverLetterShares?.map((s: any) => s.cover_letter_id) || [];
      const { data: coverLetterFeedback } = coverLetterIds.length > 0
        ? await (supabase as any)
            .from("cover_letter_feedback")
            .select("*")
            .in("cover_letter_id", coverLetterIds)
        : { data: [] };

      // Fetch mentor feedback (feedback given by mentors to this user as mentee)
      const { data: rawMentorFeedback } = await supabase
        .from("mentor_feedback")
        .select("*")
        .eq("mentee_id", session.user.id)
        .order("created_at", { ascending: false });

      // Fetch mentor profiles for the feedback
      const mentorIds = [...new Set((rawMentorFeedback || []).map((f: any) => f.mentor_id))];
      let mentorProfiles: Record<string, any> = {};
      if (mentorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("user_id, first_name, last_name, email")
          .in("user_id", mentorIds);
        
        if (profiles) {
          mentorProfiles = profiles.reduce((acc: Record<string, any>, p) => {
            acc[p.user_id] = p;
            return acc;
          }, {});
        }
      }

      // Fetch material details for mentor feedback that references specific materials
      const materialFeedback = (rawMentorFeedback || []).filter(
        (f: any) => f.related_item_id && (f.related_item_type === 'resume' || f.related_item_type === 'cover_letter')
      );
      const materialIds = materialFeedback.map((f: any) => f.related_item_id);
      let materialDetails: Record<string, any> = {};
      
      if (materialIds.length > 0) {
        const { data: materials } = await supabase
          .from("application_materials")
          .select("id, version_name, file_name, material_type")
          .in("id", materialIds);
        
        if (materials) {
          materialDetails = materials.reduce((acc: Record<string, any>, m) => {
            acc[m.id] = m;
            return acc;
          }, {});
        }
      }

      // Merge mentor profiles and material details with feedback
      const mentorFeedback = (rawMentorFeedback || []).map((f: any) => ({
        ...f,
        mentor: mentorProfiles[f.mentor_id] || null,
        material: f.related_item_id ? materialDetails[f.related_item_id] || null : null,
      }));

      return {
        resumeShares: resumeShares || [],
        coverLetterShares: coverLetterShares || [],
        resumeFeedback: resumeFeedback || [],
        coverLetterFeedback: coverLetterFeedback || [],
        mentorFeedback: mentorFeedback || [],
      };
    },
  });

  const updateFeedbackTheme = async (feedbackId: string, theme: string, type: "resume" | "cover_letter") => {
    try {
      const tableName = type === "resume" ? "resume_feedback" : "cover_letter_feedback";
      const { error } = await (supabase as any)
        .from(tableName)
        .update({ feedback_theme: theme })
        .eq("id", feedbackId);

      if (error) throw error;

      toast({
        title: "Theme updated",
        description: "Feedback has been categorized.",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error updating theme",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Update mentor feedback status (mark as resolved/implemented)
  const updateMentorFeedbackStatus = async (feedbackId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "implemented" || newStatus === "resolved") {
        updateData.implemented_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("mentor_feedback")
        .update(updateData)
        .eq("id", feedbackId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Feedback marked as ${newStatus}.`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Get only mentor feedback for the dedicated tab
  const mentorFeedbackList = data?.mentorFeedback || [];

  // Combine all feedback sources, including mentor feedback
  const allFeedback = [
    ...(data?.resumeFeedback || []).map((f: any) => ({ ...f, type: "resume", source: "share" })),
    ...(data?.coverLetterFeedback || []).map((f: any) => ({ ...f, type: "cover_letter", source: "share" })),
    ...(data?.mentorFeedback || []).map((f: any) => ({
      id: f.id,
      comment_text: f.feedback_text,
      reviewer_name: f.mentor 
        ? `${f.mentor.first_name || ''} ${f.mentor.last_name || ''}`.trim() || 'Mentor'
        : 'Mentor',
      reviewer_email: f.mentor?.email || '',
      status: f.status,
      created_at: f.created_at,
      type: f.feedback_type || "mentor",
      source: "mentor",
      subject: f.subject,
      priority: f.priority,
      feedback_theme: f.feedback_type,
      implemented_at: f.implemented_at,
      material: f.material,
      related_item_type: f.related_item_type,
    })),
  ];

  const pendingReviews = [
    ...(data?.resumeShares || []).filter((s: any) => s.approval_status === "pending"),
    ...(data?.coverLetterShares || []).filter((s: any) => s.approval_status === "pending"),
  ];

  const upcomingDeadlines = [
    ...(data?.resumeShares || []),
    ...(data?.coverLetterShares || []),
  ].filter((s: any) => s.review_deadline && new Date(s.review_deadline) > new Date())
   .sort((a: any, b: any) => new Date(a.review_deadline).getTime() - new Date(b.review_deadline).getTime());

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">Loading review dashboard...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {(data?.resumeShares?.length || 0) + (data?.coverLetterShares?.length || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Active Shares</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{mentorFeedbackList.length}</p>
                <p className="text-xs text-muted-foreground">Mentor Feedback</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{allFeedback.length}</p>
                <p className="text-xs text-muted-foreground">Total Feedback</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{pendingReviews.length}</p>
                <p className="text-xs text-muted-foreground">Pending Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{upcomingDeadlines.length}</p>
                <p className="text-xs text-muted-foreground">Upcoming Deadlines</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="mentor">Mentor Feedback</TabsTrigger>
          <TabsTrigger value="feedback">Feedback Themes</TabsTrigger>
          <TabsTrigger value="approval">Approval Status</TabsTrigger>
          <TabsTrigger value="impact">Review Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Upcoming Deadlines */}
          {upcomingDeadlines.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Upcoming Review Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingDeadlines.slice(0, 5).map((share: any) => {
                    const isResume = 'resumes' in share;
                    const name = isResume 
                      ? share.resumes?.resume_name 
                      : share.application_materials?.version_name;
                    const deadline = new Date(share.review_deadline);
                    const daysRemaining = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                    return (
                      <div key={share.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{name || "Untitled"}</p>
                            <p className="text-xs text-muted-foreground">
                              {isResume ? "Resume" : "Cover Letter"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={daysRemaining <= 3 ? "destructive" : "secondary"}>
                            {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allFeedback.length > 0 ? (
                <div className="space-y-3">
                  {allFeedback.slice(0, 5).map((feedback: any) => (
                    <div key={feedback.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          {feedback.subject && (
                            <p className="font-medium text-sm mb-1">{feedback.subject}</p>
                          )}
                          <p className="text-sm">{feedback.comment_text}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              by {feedback.reviewer_name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {feedback.source === "mentor" ? (
                                getFeedbackTypeLabel(feedback.type)
                              ) : (
                                feedback.type === "resume" ? "Resume" : "Cover Letter"
                              )}
                            </Badge>
                            {feedback.source === "mentor" && (
                              <Badge variant="secondary" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                Mentor
                              </Badge>
                            )}
                            {feedback.material && (
                              <Badge variant="secondary" className="text-xs">
                                <FileText className="h-3 w-3 mr-1" />
                                {feedback.material.version_name || feedback.material.file_name}
                              </Badge>
                            )}
                            {feedback.priority && (
                              <Badge 
                                variant={feedback.priority === "high" ? "destructive" : "secondary"}
                                className="text-xs"
                              >
                                {feedback.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge variant={feedback.status === "resolved" || feedback.status === "implemented" ? "default" : "secondary"}>
                          {feedback.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-muted-foreground">
                  No feedback received yet. Share your materials to get started.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mentor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Feedback from Mentors
              </CardTitle>
              <CardDescription>
                Feedback and guidance provided by your mentors on your application materials and job search
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mentorFeedbackList.length > 0 ? (
                <div className="space-y-4">
                  {mentorFeedbackList.map((feedback: any) => {
                    const mentorName = feedback.mentor 
                      ? `${feedback.mentor.first_name || ''} ${feedback.mentor.last_name || ''}`.trim() || 'Mentor'
                      : 'Mentor';
                    
                    return (
                      <div key={feedback.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="font-medium">{feedback.subject}</span>
                              <Badge variant="outline" className="text-xs">
                                {getFeedbackTypeLabel(feedback.feedback_type)}
                              </Badge>
                              <Badge 
                                variant={feedback.priority === "high" ? "destructive" : feedback.priority === "medium" ? "secondary" : "outline"}
                                className="text-xs"
                              >
                                {feedback.priority}
                              </Badge>
                              {feedback.material && (
                                <Badge variant="secondary" className="text-xs">
                                  <FileText className="h-3 w-3 mr-1" />
                                  {feedback.material.version_name || feedback.material.file_name}
                                </Badge>
                              )}
                              {feedback.review_deadline && (
                                <Badge 
                                  variant={new Date(feedback.review_deadline) < new Date() ? "destructive" : "outline"}
                                  className="text-xs"
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  Due: {new Date(feedback.review_deadline).toLocaleDateString()}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{feedback.feedback_text}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              <span>From: {mentorName}</span>
                              <span>•</span>
                              <span>{new Date(feedback.created_at).toLocaleDateString()}</span>
                              {feedback.implemented_at && (
                                <>
                                  <span>•</span>
                                  <span className="text-green-600">
                                    Implemented on {new Date(feedback.implemented_at).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant={feedback.status === "implemented" || feedback.status === "resolved" ? "default" : "secondary"}>
                              {feedback.status}
                            </Badge>
                            {feedback.status === "open" && (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => updateMentorFeedbackStatus(feedback.id, "implemented")}
                                >
                                  Mark Implemented
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => updateMentorFeedbackStatus(feedback.id, "dismissed")}
                                >
                                  Dismiss
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No mentor feedback yet</p>
                  <p className="text-sm text-muted-foreground">
                    Your mentors can provide feedback through the mentor dashboard
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback">
          <FeedbackThemesSummary 
            feedback={allFeedback}
            onUpdateTheme={(feedbackId, theme) => {
              const feedback = allFeedback.find((f: any) => f.id === feedbackId);
              if (feedback) {
                updateFeedbackTheme(feedbackId, theme, feedback.type);
              }
            }}
          />
        </TabsContent>

        <TabsContent value="approval" className="space-y-4">
          {/* Materials Under Mentor Review */}
          {(() => {
            const materialsUnderReview = (data?.mentorFeedback || []).filter(
              (f: any) => f.related_item_id && f.material
            );
            
            // Group by material and get deadline from feedback directly
            const uniqueMaterials = materialsUnderReview.reduce((acc: any[], f: any) => {
              const existing = acc.find((m) => m.materialId === f.related_item_id);
              if (!existing) {
                acc.push({
                  materialId: f.related_item_id,
                  materialType: f.related_item_type,
                  materialName: f.material?.version_name || f.material?.file_name || "Untitled",
                  feedback: [f],
                  latestStatus: f.status,
                  latestDate: f.created_at,
                  // Get nearest upcoming deadline from feedback items
                  reviewDeadline: f.review_deadline,
                });
              } else {
                existing.feedback.push(f);
                // Update deadline if this feedback has a nearer upcoming deadline
                if (f.review_deadline) {
                  const newDeadline = new Date(f.review_deadline);
                  const currentDeadline = existing.reviewDeadline ? new Date(existing.reviewDeadline) : null;
                  if (!currentDeadline || newDeadline < currentDeadline) {
                    existing.reviewDeadline = f.review_deadline;
                  }
                }
              }
              return acc;
            }, []);

            if (uniqueMaterials.length > 0) {
              return (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Materials Under Mentor Review
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    These materials have received specific feedback from your mentors
                  </p>
                  {uniqueMaterials.map((material: any) => {
                    const openFeedback = material.feedback.filter((f: any) => f.status === 'open').length;
                    const implementedFeedback = material.feedback.filter((f: any) => f.status === 'implemented' || f.status === 'resolved').length;
                    const hasDeadline = material.reviewDeadline;
                    const isOverdue = hasDeadline && new Date(material.reviewDeadline) < new Date();
                    const daysRemaining = hasDeadline 
                      ? Math.ceil((new Date(material.reviewDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      : null;
                    
                    return (
                      <div key={material.materialId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium">{material.materialName}</p>
                            <p className="text-sm text-muted-foreground">
                              {material.materialType === 'resume' ? 'Resume' : 'Cover Letter'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {hasDeadline && (
                              <Badge 
                                variant={isOverdue ? "destructive" : daysRemaining !== null && daysRemaining <= 3 ? "secondary" : "outline"}
                                className="text-xs"
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                {isOverdue 
                                  ? `Overdue (${new Date(material.reviewDeadline).toLocaleDateString()})`
                                  : daysRemaining === 0 
                                    ? "Due Today"
                                    : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`
                                }
                              </Badge>
                            )}
                            {openFeedback > 0 && (
                              <Badge variant="secondary">
                                {openFeedback} open
                              </Badge>
                            )}
                            {implementedFeedback > 0 && (
                              <Badge variant="default">
                                {implementedFeedback} implemented
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {hasDeadline && (
                          <div className={`mb-3 p-2 rounded text-sm flex items-center gap-2 ${
                            isOverdue 
                              ? "bg-red-50 text-red-700 border border-red-200" 
                              : daysRemaining !== null && daysRemaining <= 3 
                                ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}>
                            <Clock className="h-4 w-4" />
                            <span>
                              Review deadline: {new Date(material.reviewDeadline).toLocaleDateString()}
                              {isOverdue && " - Please implement feedback soon"}
                              {!isOverdue && daysRemaining !== null && daysRemaining <= 3 && " - Approaching deadline"}
                            </span>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          {material.feedback.map((f: any) => {
                            const mentorName = f.mentor 
                              ? `${f.mentor.first_name || ''} ${f.mentor.last_name || ''}`.trim() || 'Mentor'
                              : 'Mentor';
                            
                            return (
                              <div key={f.id} className="p-3 bg-muted/50 rounded-lg">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{f.subject}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Reviewed by {mentorName} on {new Date(f.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <Badge 
                                    variant={f.status === 'implemented' || f.status === 'resolved' ? 'default' : 
                                             f.status === 'open' ? 'secondary' : 'outline'}
                                  >
                                    {f.status}
                                  </Badge>
                                </div>
                                {f.status === 'open' && (
                                  <div className="mt-2 flex gap-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => updateMentorFeedbackStatus(f.id, "implemented")}
                                    >
                                      Mark Implemented
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={() => updateMentorFeedbackStatus(f.id, "dismissed")}
                                    >
                                      Dismiss
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }
            return null;
          })()}

          {/* Resume Approvals */}
          {data?.resumeShares?.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Resume Approvals</h3>
              {data.resumeShares.map((share: any) => (
                <div key={share.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium">{share.resumes?.resume_name || "Untitled Resume"}</p>
                      <p className="text-sm text-muted-foreground">
                        Shared on {new Date(share.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <ApprovalWorkflow
                    shareId={share.id}
                    materialType="resume"
                    approvalStatus={share.approval_status || "pending"}
                    approvedBy={share.approved_by}
                    approvedAt={share.approved_at}
                    approvalNotes={share.approval_notes}
                    isOwner={true}
                    onStatusChange={() => refetch()}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Cover Letter Approvals */}
          {data?.coverLetterShares?.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Cover Letter Approvals</h3>
              {data.coverLetterShares.map((share: any) => (
                <div key={share.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium">{share.application_materials?.version_name || "Untitled Cover Letter"}</p>
                      <p className="text-sm text-muted-foreground">
                        Shared on {new Date(share.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <ApprovalWorkflow
                    shareId={share.id}
                    materialType="cover_letter"
                    approvalStatus={share.approval_status || "pending"}
                    approvedBy={share.approved_by}
                    approvedAt={share.approved_at}
                    approvalNotes={share.approval_notes}
                    isOwner={true}
                    onStatusChange={() => refetch()}
                  />
                </div>
              ))}
            </div>
          )}

          {(!data?.resumeShares?.length && !data?.coverLetterShares?.length && 
            !(data?.mentorFeedback || []).some((f: any) => f.related_item_id && f.material)) && (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No materials under review</p>
                <p className="text-sm text-muted-foreground">
                  Share your resume or cover letter, or ask your mentor to review specific versions
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="impact">
          <MaterialReviewImpact />
        </TabsContent>
      </Tabs>
    </div>
  );
}
