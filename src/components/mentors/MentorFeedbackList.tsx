import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, XCircle } from "lucide-react";

export function MentorFeedbackList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: feedback, isLoading } = useQuery({
    queryKey: ['mentor-feedback'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('mentor_feedback')
        .select('*')
        .eq('mentee_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const updateFeedbackStatus = useMutation({
    mutationFn: async ({ feedbackId, status }: { feedbackId: string; status: string }) => {
      const updates: any = { status };
      if (status === 'resolved') {
        updates.implemented_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('mentor_feedback')
        .update(updates)
        .eq('id', feedbackId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-feedback'] });
      toast({
        title: "Feedback updated",
        description: "The feedback status has been updated."
      });
    }
  });

  if (isLoading) {
    return <div>Loading feedback...</div>;
  }

  if (!feedback || feedback.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No feedback received yet. Your mentors will provide guidance here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {feedback.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{item.subject}</CardTitle>
                <CardDescription>
                  {item.feedback_type} • {new Date(item.created_at).toLocaleDateString()}
                </CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                <Badge
                  variant={
                    item.priority === 'high' ? 'destructive' :
                    item.priority === 'medium' ? 'default' :
                    'secondary'
                  }
                >
                  {item.priority}
                </Badge>
                <Badge
                  variant={
                    item.status === 'resolved' ? 'default' :
                    item.status === 'open' ? 'secondary' :
                    'outline'
                  }
                >
                  {item.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{item.feedback_text}</p>
            
            {item.status === 'open' && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateFeedbackStatus.mutate({ 
                    feedbackId: item.id, 
                    status: 'resolved' 
                  })}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark Implemented
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateFeedbackStatus.mutate({ 
                    feedbackId: item.id, 
                    status: 'dismissed' 
                  })}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Dismiss
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
