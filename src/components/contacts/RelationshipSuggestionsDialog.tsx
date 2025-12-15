import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, CheckCircle2, Circle, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageTemplateDialog } from "./MessageTemplateDialog";

interface RelationshipSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: any;
}

export function RelationshipSuggestionsDialog({ open, onOpenChange, contact }: RelationshipSuggestionsDialogProps) {
  const queryClient = useQueryClient();
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['relationship-suggestions', contact?.id],
    enabled: open && !!contact?.id,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-relationship-suggestions', {
        body: { contactId: contact.id }
      });
      if (error) throw error;
      return data.suggestions;
    }
  });

  const completeSuggestion = useMutation({
    mutationFn: async (suggestionId: string) => {
      const { error } = await supabase
        .from('relationship_strengthening_suggestions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', suggestionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationship-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['professional-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts-needing-checkin'] });
      queryClient.invalidateQueries({ queryKey: ['relationship-health'] });
      toast.success('Suggestion marked as complete!');
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Relationship Strengthening for {contact?.first_name}
          </DialogTitle>
          <DialogDescription>
            AI-powered suggestions to deepen your professional relationship
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : suggestions && suggestions.length > 0 ? (
          <div className="space-y-4">
            {suggestions.map((suggestion: any) => (
              <Card key={suggestion.id} className={suggestion.completed_at ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Checkbox
                        checked={!!suggestion.completed_at}
                        onCheckedChange={() => {
                          if (!suggestion.completed_at) {
                            completeSuggestion.mutate(suggestion.id);
                          }
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-base">
                            {suggestion.suggestion_title}
                          </CardTitle>
                          {suggestion.relevance_score && (
                            <Badge variant="secondary">
                              {suggestion.relevance_score}% match
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="capitalize mb-2">
                          {suggestion.suggestion_type.replace(/_/g, ' ')}
                        </CardDescription>
                        {suggestion.suggestion_description && (
                          <p className="text-sm text-foreground mt-2">
                            {suggestion.suggestion_description}
                          </p>
                        )}
                      </div>
                      <Badge variant={getPriorityColor(suggestion.priority || 'medium')}>
                        {suggestion.priority || 'medium'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                {!suggestion.completed_at && (
                  <CardContent>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSuggestion(suggestion);
                        setMessageDialogOpen(true);
                      }}
                      className="w-full"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Add to Message
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No suggestions available</p>
          </div>
        )}

        {selectedSuggestion && (
          <MessageTemplateDialog
            open={messageDialogOpen}
            onOpenChange={setMessageDialogOpen}
            contact={contact}
            templateType="relationship_strengthening"
            newsContent={{
              headline: selectedSuggestion.suggestion_title,
              summary: selectedSuggestion.suggestion_description,
              talkingPoints: selectedSuggestion.action_items || []
            }}
            onSend={async () => {
              completeSuggestion.mutate(selectedSuggestion.id);
              setMessageDialogOpen(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
