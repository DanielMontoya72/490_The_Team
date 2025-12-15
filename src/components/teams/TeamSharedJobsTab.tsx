import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Share2, MessageSquare, Briefcase, ExternalLink, Send, Trash2, User, Link } from "lucide-react";
import { ShareJobDialog } from "./ShareJobDialog";
import { formatDistanceToNow } from "date-fns";

interface TeamSharedJobsTabProps {
  teamId: string;
}

interface SharedJob {
  id: string;
  job_id: string;
  shared_by: string;
  notes: string | null;
  created_at: string;
  type: 'job';
  job: {
    id: string;
    job_title: string;
    company_name: string;
    status: string;
    location: string | null;
    job_url: string | null;
  };
  sharer_profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

interface SharedLink {
  id: string;
  shared_by: string;
  job_title: string;
  company_name: string | null;
  job_url: string;
  notes: string | null;
  created_at: string;
  type: 'link';
  sharer_profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

type SharedItem = SharedJob | SharedLink;

interface JobComment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  commenter_profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export const TeamSharedJobsTab = ({ teamId }: TeamSharedJobsTabProps) => {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: sharedItems, isLoading } = useQuery({
    queryKey: ['team-shared-items', teamId],
    queryFn: async () => {
      // Fetch shared jobs
      const { data: sharedJobsData, error: jobsError } = await supabase
        .from("team_shared_jobs")
        .select("*")
        .eq("team_id", teamId);

      if (jobsError) throw jobsError;

      // Fetch shared links
      const { data: sharedLinksData, error: linksError } = await supabase
        .from("team_shared_links")
        .select("*")
        .eq("team_id", teamId);

      if (linksError) throw linksError;

      // Enrich shared jobs
      const enrichedJobs = await Promise.all(
        (sharedJobsData || []).map(async (sharedJob) => {
          const [jobResult, profileResult] = await Promise.all([
            supabase
              .from("jobs")
              .select("id, job_title, company_name, status, location, job_url")
              .eq("id", sharedJob.job_id)
              .single(),
            supabase
              .from("user_profiles")
              .select("first_name, last_name, email")
              .eq("user_id", sharedJob.shared_by)
              .single()
          ]);

          return {
            ...sharedJob,
            type: 'job' as const,
            job: jobResult.data,
            sharer_profile: profileResult.data
          };
        })
      );

      // Enrich shared links
      const enrichedLinks = await Promise.all(
        (sharedLinksData || []).map(async (sharedLink) => {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("first_name, last_name, email")
            .eq("user_id", sharedLink.shared_by)
            .single();

          return {
            ...sharedLink,
            type: 'link' as const,
            sharer_profile: profile
          };
        })
      );

      // Combine and sort by created_at
      const allItems = [
        ...enrichedJobs.filter(job => job.job !== null),
        ...enrichedLinks
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return allItems as SharedItem[];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ['team-item-comments', teamId, expandedItem],
    queryFn: async () => {
      if (!expandedItem) return {};
      
      const item = sharedItems?.find(i => i.id === expandedItem);
      if (!item) return {};

      let data;
      let error;
      
      if (item.type === 'job') {
        const result = await supabase
          .from('team_job_comments')
          .select("*")
          .eq('shared_job_id', expandedItem)
          .order("created_at", { ascending: true });
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase
          .from('team_link_comments')
          .select("*")
          .eq('shared_link_id', expandedItem)
          .order("created_at", { ascending: true });
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      const enrichedComments = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("first_name, last_name, email")
            .eq("user_id", comment.user_id)
            .single();

          return {
            ...comment,
            commenter_profile: profile
          };
        })
      );

      return { [expandedItem]: enrichedComments as JobComment[] };
    },
    enabled: !!expandedItem && !!sharedItems,
  });

  const handleAddComment = async (itemId: string) => {
    const commentText = newComment[itemId]?.trim();
    if (!commentText) return;

    const item = sharedItems?.find(i => i.id === itemId);
    if (!item) return;

    setSubmittingComment(itemId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let error;
      if (item.type === 'job') {
        const result = await supabase
          .from('team_job_comments')
          .insert({
            shared_job_id: itemId,
            user_id: user.id,
            comment: commentText,
          });
        error = result.error;
      } else {
        const result = await supabase
          .from('team_link_comments')
          .insert({
            shared_link_id: itemId,
            user_id: user.id,
            comment: commentText,
          });
        error = result.error;
      }

      if (error) throw error;

      toast.success("Comment added!");
      setNewComment(prev => ({ ...prev, [itemId]: "" }));
      queryClient.invalidateQueries({ queryKey: ['team-item-comments', teamId, itemId] });
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmittingComment(null);
    }
  };

  const handleDeleteItem = async (item: SharedItem) => {
    try {
      const tableName = item.type === 'job' ? 'team_shared_jobs' : 'team_shared_links';
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      toast.success("Shared item removed");
      queryClient.invalidateQueries({ queryKey: ['team-shared-items', teamId] });
    } catch (error: any) {
      console.error("Error deleting item:", error);
      toast.error("Failed to remove item");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'applied': return 'bg-blue-500/20 text-blue-500';
      case 'interview': return 'bg-purple-500/20 text-purple-500';
      case 'offer': return 'bg-green-500/20 text-green-500';
      case 'rejected': return 'bg-red-500/20 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSharerName = (profile: { first_name: string | null; last_name: string | null; email: string | null } | null) => {
    if (!profile) return "Unknown";
    const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    return name || profile.email || "Unknown";
  };

  const getItemTitle = (item: SharedItem) => {
    if (item.type === 'job') return item.job.job_title;
    return item.job_title;
  };

  const getItemCompany = (item: SharedItem) => {
    if (item.type === 'job') return item.job.company_name;
    return item.company_name || 'Unknown Company';
  };

  const getItemUrl = (item: SharedItem) => {
    if (item.type === 'job') return item.job.job_url;
    return item.job_url;
  };

  if (isLoading) {
    return <div className="p-4">Loading shared jobs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Shared Job Postings</h3>
          <p className="text-sm text-muted-foreground">
            Collaborate with your team on job opportunities
          </p>
        </div>
        <Button onClick={() => setShareDialogOpen(true)}>
          <Share2 className="h-4 w-4 mr-2" />
          Share a Job
        </Button>
      </div>

      {(!sharedItems || sharedItems.length === 0) ? (
        <Card>
          <CardContent className="text-center py-12">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">No Shared Jobs Yet</h4>
            <p className="text-muted-foreground mb-4">
              Share job postings with your team to get feedback and recommendations.
            </p>
            <Button onClick={() => setShareDialogOpen(true)}>
              <Share2 className="h-4 w-4 mr-2" />
              Share Your First Job
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sharedItems.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {item.type === 'link' ? (
                        <Link className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                      )}
                      <CardTitle className="text-lg">{getItemTitle(item)}</CardTitle>
                      {item.type === 'job' && (
                        <Badge className={getStatusColor(item.job.status)}>
                          {item.job.status}
                        </Badge>
                      )}
                      {item.type === 'link' && (
                        <Badge variant="outline">External Link</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">{getItemCompany(item)}</p>
                    {item.type === 'job' && item.job.location && (
                      <p className="text-sm text-muted-foreground">{item.job.location}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getItemUrl(item) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(getItemUrl(item)!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteItem(item)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <User className="h-3 w-3" />
                  <span>Shared by {getSharerName(item.sharer_profile)}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {item.notes && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm">{item.notes}</p>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {expandedItem === item.id ? "Hide Comments" : "View Comments & Recommendations"}
                </Button>

                {expandedItem === item.id && (
                  <div className="space-y-4 pt-2 border-t">
                    <div className="space-y-3">
                      {(comments?.[item.id] || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No comments yet. Be the first to add a recommendation!
                        </p>
                      ) : (
                        (comments?.[item.id] || []).map((comment) => (
                          <div key={comment.id} className="bg-muted/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">
                                {getSharerName(comment.commenter_profile)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm">{comment.comment}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Add a comment or recommendation..."
                        value={newComment[item.id] || ""}
                        onChange={(e) => setNewComment(prev => ({ ...prev, [item.id]: e.target.value }))}
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleAddComment(item.id)}
                        disabled={submittingComment === item.id || !newComment[item.id]?.trim()}
                        size="icon"
                        className="self-end"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ShareJobDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        teamId={teamId}
        onShared={() => queryClient.invalidateQueries({ queryKey: ['team-shared-items', teamId] })}
      />
    </div>
  );
};
