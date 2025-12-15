import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquare, Send, Trash2, Loader2, Plus, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const updateTypes = [
  { value: 'general', label: '📝 General Update', description: 'Share a general job search update' },
  { value: 'milestone', label: '🎉 Milestone', description: 'Celebrate an achievement' },
  { value: 'weekly_summary', label: '📊 Weekly Summary', description: 'Summarize your week' },
  { value: 'request_support', label: '💙 Request Support', description: 'Ask for specific help or encouragement' },
];

export function FamilyUpdates() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newUpdate, setNewUpdate] = useState({
    update_type: 'general',
    update_title: '',
    update_content: '',
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: updates, isLoading } = useQuery({
    queryKey: ['family-updates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_updates')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: jobStats } = useQuery({
    queryKey: ['job-stats-for-update'],
    queryFn: async () => {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('status')
        .eq('user_id', user?.id);
      
      const { data: interviews } = await supabase
        .from('interviews')
        .select('id')
        .eq('user_id', user?.id);

      return {
        totalApplications: jobs?.length || 0,
        interviews: interviews?.length || 0,
        active: jobs?.filter(j => j.status === 'active' || j.status === 'interview').length || 0,
      };
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('family_updates')
        .insert({
          user_id: user?.id,
          ...newUpdate,
          shared_with_all: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-updates'] });
      toast.success("Update shared with supporters!");
      setShowForm(false);
      setNewUpdate({
        update_type: 'general',
        update_title: '',
        update_content: '',
      });
    },
    onError: () => {
      toast.error("Failed to share update");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('family_updates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-updates'] });
      toast.success("Update removed");
    },
  });

  const generateWeeklySummary = () => {
    const summary = `This week I've been working hard on my job search! 

📊 Quick Stats:
• Total Applications: ${jobStats?.totalApplications || 0}
• Active Opportunities: ${jobStats?.active || 0}
• Interviews: ${jobStats?.interviews || 0}

I'm staying positive and focused on finding the right opportunity. Your support means so much to me! 💙`;

    setNewUpdate({
      update_type: 'weekly_summary',
      update_title: 'Weekly Job Search Update',
      update_content: summary,
    });
    setShowForm(true);
  };

  const getTypeEmoji = (type: string) => {
    return updateTypes.find(t => t.value === type)?.label.split(' ')[0] || '📝';
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Family Communication
              </CardTitle>
              <CardDescription>
                Send updates to keep your support network informed
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={generateWeeklySummary} variant="outline">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Weekly Summary
              </Button>
              <Button onClick={() => setShowForm(!showForm)}>
                <Plus className="h-4 w-4 mr-2" />
                New Update
              </Button>
            </div>
          </div>
        </CardHeader>

        {showForm && (
          <CardContent className="border-b pb-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Update Type</Label>
                <Select
                  value={newUpdate.update_type}
                  onValueChange={(v) => setNewUpdate(s => ({ ...s, update_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {updateTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col">
                          <span>{type.label}</span>
                          <span className="text-xs text-muted-foreground">{type.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="e.g., This Week's Progress"
                  value={newUpdate.update_title}
                  onChange={(e) => setNewUpdate(s => ({ ...s, update_title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Share an update with your supporters..."
                  value={newUpdate.update_content}
                  onChange={(e) => setNewUpdate(s => ({ ...s, update_content: e.target.value }))}
                  rows={5}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!newUpdate.update_title || !newUpdate.update_content || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Share Update
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        )}

        <CardContent className="pt-6">
          {!updates || updates.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Updates Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Keep your supporters in the loop by sharing regular updates about your job search journey.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {updates.map((update) => (
                <div
                  key={update.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{getTypeEmoji(update.update_type)}</span>
                        <h4 className="font-semibold">{update.update_title}</h4>
                        <Badge variant="outline" className="text-xs capitalize">
                          {update.update_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{update.update_content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Shared {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(update.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggested Updates */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">💡 Update Ideas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { title: "Weekly Summary", desc: "Share your progress and what you accomplished" },
              { title: "Milestone Celebration", desc: "Got an interview? Share the good news!" },
              { title: "Request Encouragement", desc: "Let supporters know when you need a boost" },
              { title: "Learning Update", desc: "Share new skills you're developing" },
            ].map((idea) => (
              <button
                key={idea.title}
                onClick={() => {
                  setNewUpdate(s => ({ ...s, update_title: idea.title }));
                  setShowForm(true);
                }}
                className="p-3 rounded-lg border bg-background hover:bg-accent text-left transition-colors"
              >
                <span className="font-medium text-sm">{idea.title}</span>
                <p className="text-xs text-muted-foreground">{idea.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
