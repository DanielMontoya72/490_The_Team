import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Share2, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface SuccessStoriesProps {
  groupId: string;
}

export function SuccessStories({ groupId }: SuccessStoriesProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    story_title: "",
    story_content: "",
    success_type: "job_offer",
    company_name: "",
    role_title: "",
    timeframe_weeks: "",
    key_learnings: "",
    advice_for_others: "",
    is_anonymous: false,
  });

  const queryClient = useQueryClient();

  const { data: stories, isLoading } = useQuery({
    queryKey: ["peer-success-stories", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peer_success_stories")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createStory = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("peer_success_stories")
        .insert({
          ...data,
          group_id: groupId,
          user_id: user.id,
          timeframe_weeks: data.timeframe_weeks ? parseInt(data.timeframe_weeks) : null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peer-success-stories", groupId] });
      toast.success("Success story shared!");
      setDialogOpen(false);
      setFormData({
        story_title: "",
        story_content: "",
        success_type: "job_offer",
        company_name: "",
        role_title: "",
        timeframe_weeks: "",
        key_learnings: "",
        advice_for_others: "",
        is_anonymous: false,
      });
    },
    onError: (error) => {
      toast.error("Failed to share story: " + error.message);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Success Stories</h3>
          <p className="text-sm text-muted-foreground">
            Celebrate wins and learn from peer experiences
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Share2 className="h-4 w-4 mr-2" />
          Share Your Story
        </Button>
      </div>

      {isLoading ? (
        <p>Loading success stories...</p>
      ) : (
        <div className="space-y-4">
          {stories?.map((story) => (
            <Card key={story.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <Badge variant="secondary">{story.success_type.replace("_", " ")}</Badge>
                    </div>
                    <CardTitle className="text-lg">{story.story_title}</CardTitle>
                    {story.role_title && story.company_name && (
                      <CardDescription>
                        {story.role_title} at {story.company_name}
                      </CardDescription>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        {story.is_anonymous ? "Anonymous" : "Member"} •{" "}
                        {formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}
                      </span>
                      {story.timeframe_weeks && <span>{story.timeframe_weeks} weeks</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ThumbsUp className="h-4 w-4" />
                    <span>{story.likes_count}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">The Story</h4>
                  <p className="text-sm whitespace-pre-wrap">{story.story_content}</p>
                </div>

                {story.key_learnings && (
                  <div>
                    <h4 className="font-semibold mb-2">Key Learnings</h4>
                    <p className="text-sm whitespace-pre-wrap">{story.key_learnings}</p>
                  </div>
                )}

                {story.advice_for_others && (
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Advice for Others</h4>
                    <p className="text-sm whitespace-pre-wrap">{story.advice_for_others}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {stories?.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              No success stories yet. Be the first to share your win!
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Share Your Success Story</DialogTitle>
            <DialogDescription>
              Inspire others by sharing your journey and achievements
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="story_title">Story Title *</Label>
              <Input
                id="story_title"
                value={formData.story_title}
                onChange={(e) => setFormData({ ...formData, story_title: e.target.value })}
                placeholder="e.g., Landed my dream role after 3 months"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="success_type">Success Type *</Label>
              <Select
                value={formData.success_type}
                onValueChange={(value) => setFormData({ ...formData, success_type: value })}
              >
                <SelectTrigger id="success_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="job_offer">Job Offer</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="career_change">Career Change</SelectItem>
                  <SelectItem value="skill_mastery">Skill Mastery</SelectItem>
                  <SelectItem value="networking_win">Networking Win</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Company name (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role_title">Role</Label>
                <Input
                  id="role_title"
                  value={formData.role_title}
                  onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                  placeholder="Role title (optional)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeframe_weeks">Timeframe (weeks)</Label>
              <Input
                id="timeframe_weeks"
                type="number"
                value={formData.timeframe_weeks}
                onChange={(e) => setFormData({ ...formData, timeframe_weeks: e.target.value })}
                placeholder="How long did it take?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="story_content">Your Story *</Label>
              <Textarea
                id="story_content"
                value={formData.story_content}
                onChange={(e) => setFormData({ ...formData, story_content: e.target.value })}
                placeholder="Share your journey, challenges, and how you overcame them..."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="key_learnings">Key Learnings</Label>
              <Textarea
                id="key_learnings"
                value={formData.key_learnings}
                onChange={(e) => setFormData({ ...formData, key_learnings: e.target.value })}
                placeholder="What did you learn along the way?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="advice_for_others">Advice for Others</Label>
              <Textarea
                id="advice_for_others"
                value={formData.advice_for_others}
                onChange={(e) => setFormData({ ...formData, advice_for_others: e.target.value })}
                placeholder="What advice would you give to others?"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_anonymous"
                checked={formData.is_anonymous}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_anonymous: checked as boolean })
                }
              />
              <label htmlFor="is_anonymous" className="text-sm font-medium">
                Share anonymously
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createStory.mutate(formData)}
                disabled={!formData.story_title || !formData.story_content || createStory.isPending}
              >
                Share Story
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}