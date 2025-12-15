import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, ThumbsUp, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface GroupDiscussionsProps {
  groupId: string;
}

export function GroupDiscussions({ groupId }: GroupDiscussionsProps) {
  const [newPost, setNewPost] = useState({ title: "", content: "", type: "discussion", isAnonymous: false });
  const [showNewPost, setShowNewPost] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const queryClient = useQueryClient();

  const { data: discussions, isLoading } = useQuery({
    queryKey: ["peer-discussions", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peer_support_discussions")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["peer-discussion-comments", selectedDiscussion],
    queryFn: async () => {
      if (!selectedDiscussion) return [];
      
      const { data, error } = await supabase
        .from("peer_discussion_comments")
        .select("*")
        .eq("discussion_id", selectedDiscussion)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedDiscussion,
  });

  // Real-time subscription for discussions
  useEffect(() => {
    const channel = supabase
      .channel(`discussions-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "peer_support_discussions",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["peer-discussions", groupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);

  // Real-time subscription for comments
  useEffect(() => {
    if (!selectedDiscussion) return;

    const channel = supabase
      .channel(`comments-${selectedDiscussion}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "peer_discussion_comments",
          filter: `discussion_id=eq.${selectedDiscussion}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["peer-discussion-comments", selectedDiscussion] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDiscussion, queryClient]);

  const createPost = useMutation({
    mutationFn: async (data: typeof newPost) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("peer_support_discussions")
        .insert({
          group_id: groupId,
          user_id: user.id,
          title: data.title,
          content: data.content,
          post_type: data.type,
          is_anonymous: data.isAnonymous,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peer-discussions", groupId] });
      toast.success("Post created successfully!");
      setNewPost({ title: "", content: "", type: "discussion", isAnonymous: false });
      setShowNewPost(false);
    },
    onError: (error) => {
      toast.error("Failed to create post: " + error.message);
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ discussionId, content }: { discussionId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("peer_discussion_comments")
        .insert({
          discussion_id: discussionId,
          user_id: user.id,
          content,
          is_anonymous: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peer-discussion-comments", selectedDiscussion] });
      setNewComment("");
      toast.success("Comment added!");
    },
    onError: (error) => {
      toast.error("Failed to add comment: " + error.message);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Group Discussions</h3>
          <p className="text-sm text-muted-foreground">
            Share insights, ask questions, and connect with peers
          </p>
        </div>
        <Button onClick={() => setShowNewPost(!showNewPost)}>
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </div>

      {showNewPost && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Post</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="post-type">Post Type</Label>
              <Select
                value={newPost.type}
                onValueChange={(value) => setNewPost({ ...newPost, type: value })}
              >
                <SelectTrigger id="post-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discussion">Discussion</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="insight">Insight</SelectItem>
                  <SelectItem value="strategy">Strategy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-title">Title</Label>
              <Input
                id="post-title"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                placeholder="Give your post a descriptive title..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-content">Content</Label>
              <Textarea
                id="post-content"
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                placeholder="Share your thoughts, experiences, or questions..."
                rows={6}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="anonymous"
                checked={newPost.isAnonymous}
                onCheckedChange={(checked) =>
                  setNewPost({ ...newPost, isAnonymous: checked as boolean })
                }
              />
              <label
                htmlFor="anonymous"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Post anonymously
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewPost(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createPost.mutate(newPost)}
                disabled={!newPost.title || !newPost.content || createPost.isPending}
              >
                Create Post
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p>Loading discussions...</p>
      ) : (
        <div className="space-y-4">
          {discussions?.map((discussion) => (
            <Card key={discussion.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{discussion.post_type}</Badge>
                      {discussion.is_pinned && <Badge variant="outline">Pinned</Badge>}
                    </div>
                    <CardTitle className="text-lg">{discussion.title}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        {discussion.is_anonymous ? "Anonymous" : "Member"} •{" "}
                        {formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{discussion.likes_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{discussion.comments_count}</span>
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2 whitespace-pre-wrap">
                  {discussion.content}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelectedDiscussion(selectedDiscussion === discussion.id ? null : discussion.id)
                  }
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {selectedDiscussion === discussion.id ? "Hide Comments" : "View Comments"}
                </Button>

                {selectedDiscussion === discussion.id && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-3">
                      {comments?.map((comment) => (
                        <div key={comment.id} className="bg-muted/50 p-3 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm font-medium">
                              {comment.is_anonymous ? "Anonymous" : "Member"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        onClick={() =>
                          addComment.mutate({ discussionId: discussion.id, content: newComment })
                        }
                        disabled={!newComment.trim() || addComment.isPending}
                        size="icon"
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

      {discussions?.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              No discussions yet. Be the first to start a conversation!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}