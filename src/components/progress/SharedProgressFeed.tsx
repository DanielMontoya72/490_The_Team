import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MessageCircle, TrendingUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

export function SharedProgressFeed() {
  const queryClient = useQueryClient();
  const [commentingOnShare, setCommentingOnShare] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  const { data: shares, isLoading } = useQuery({
    queryKey: ["progress-shares"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("progress_shares")
        .select("*")
        .or(`user_id.eq.${user.id},shared_with_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch user profiles for shared items
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", userIds);

      return data.map(share => {
        const profile = profiles?.find(p => p.user_id === share.user_id);
        return {
          ...share,
          user_name: profile 
            ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email
            : "Unknown User"
        };
      });
    },
  });

  const celebrateProgress = useMutation({
    mutationFn: async (shareId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: currentShare } = await supabase
        .from("progress_shares")
        .select("reaction_count")
        .eq("id", shareId)
        .single();

      const { error } = await supabase
        .from("progress_shares")
        .update({ reaction_count: (currentShare?.reaction_count || 0) + 1 })
        .eq("id", shareId);

      if (error) throw error;

      await supabase
        .from("achievement_celebrations")
        .insert({
          progress_share_id: shareId,
          celebrated_by: user.id,
          celebration_type: "reaction",
          message: "🎉",
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-shares"] });
      toast.success("Celebration sent! 🎉");
    },
    onError: () => {
      toast.error("Failed to celebrate");
    },
  });

  const addComment = useMutation({
    mutationFn: async (shareId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!commentText.trim()) {
        throw new Error("Comment cannot be empty");
      }

      const { error } = await supabase
        .from("achievement_celebrations")
        .insert({
          progress_share_id: shareId,
          celebrated_by: user.id,
          celebration_type: "comment",
          message: commentText,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-shares"] });
      toast.success("Comment added!");
      setCommentText("");
      setCommentingOnShare(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add comment");
    },
  });

  if (isLoading) {
    return <div>Loading progress feed...</div>;
  }

  if (!shares || shares.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No progress updates yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Share your progress to see updates here
          </p>
        </CardContent>
      </Card>
    );
  }

  const getShareTypeIcon = (type: string) => {
    switch (type) {
      case "achievement": return "🏆";
      case "milestone": return "🎯";
      case "report": return "📊";
      default: return "📝";
    }
  };

  return (
    <div className="space-y-4">
      {shares.map((share: any) => (
        <Card key={share.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getShareTypeIcon(share.share_type)}</span>
                <div>
                  <h3 className="font-semibold">{share.user_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(share.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="capitalize">
                {share.share_type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap mb-4">
              {share.content?.message || "No message"}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                <span>{share.reaction_count || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                <span>{share.view_count || 0} views</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => celebrateProgress.mutate(share.id)}
                disabled={celebrateProgress.isPending}
              >
                <Heart className="h-4 w-4 mr-1" />
                Celebrate
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setCommentingOnShare(
                  commentingOnShare === share.id ? null : share.id
                )}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Comment
              </Button>
            </div>
            
            {commentingOnShare === share.id && (
              <div className="mt-4 space-y-2">
                <Textarea
                  placeholder="Add your comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCommentingOnShare(null);
                      setCommentText("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => addComment.mutate(share.id)}
                    disabled={addComment.isPending || !commentText.trim()}
                  >
                    Post Comment
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
