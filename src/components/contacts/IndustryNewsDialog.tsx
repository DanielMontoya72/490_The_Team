import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Newspaper, Share2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageTemplateDialog } from "./MessageTemplateDialog";

interface IndustryNewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: any;
}

export function IndustryNewsDialog({ open, onOpenChange, contact }: IndustryNewsDialogProps) {
  const queryClient = useQueryClient();
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState<any>(null);

  const { data: newsSuggestions, isLoading, error: queryError } = useQuery({
    queryKey: ['industry-news', contact?.id],
    enabled: open && !!contact?.id,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('suggest-industry-news', {
        body: { contactId: contact.id }
      });
      
      if (error) {
        throw error;
      }
      
      // Handle payment/rate limit errors returned in the response body
      if (data?.isPaymentRequired) {
        toast.error('AI credits exhausted. Please add credits in Settings → Workspace → Usage.');
        throw new Error(data.details);
      }
      
      if (data?.isRateLimited) {
        toast.error('Rate limit exceeded. Please try again in a few moments.');
        throw new Error(data.details);
      }
      
      if (data?.error) {
        toast.error(data.error);
        throw new Error(data.details || data.error);
      }
      
      return data.suggestions;
    }
  });

  const shareNews = useMutation({
    mutationFn: async (newsId: string) => {
      const { error } = await supabase
        .from('industry_news_suggestions')
        .update({ shared_at: new Date().toISOString() })
        .eq('id', newsId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industry-news'] });
      queryClient.invalidateQueries({ queryKey: ['professional-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts-needing-checkin'] });
      queryClient.invalidateQueries({ queryKey: ['relationship-health'] });
      toast.success('News marked as shared!');
    }
  });

  const handleShareNews = (news: any) => {
    setSelectedNews(news);
    setMessageDialogOpen(true);
  };

  const handleSendMessage = () => {
    if (selectedNews) {
      shareNews.mutate(selectedNews.id);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5" />
              Industry News for {contact?.first_name}
            </DialogTitle>
            <DialogDescription>
              AI-curated news articles relevant to their industry and interests
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : queryError ? (
            <div className="text-center py-8 text-muted-foreground">
              <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-destructive font-medium mb-2">Unable to generate news</p>
              <p className="text-sm">
                {queryError.message?.includes('credits') || queryError.message?.includes('Payment')
                  ? 'AI credits exhausted. Please add credits in Settings → Workspace → Usage.'
                  : queryError.message?.includes('Rate limit')
                  ? 'Rate limit exceeded. Please try again in a few moments.'
                  : 'An error occurred. Please try again later.'}
              </p>
            </div>
          ) : newsSuggestions && newsSuggestions.length > 0 ? (
            <div className="space-y-4">
              {newsSuggestions.map((news: any) => (
                <Card key={news.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-base">{news.news_headline}</CardTitle>
                        {news.news_summary && (
                          <CardDescription className="mt-2">
                            {news.news_summary}
                          </CardDescription>
                        )}
                        <CardDescription className="mt-2 font-semibold">
                          {news.relevance_reason}
                        </CardDescription>
                      </div>
                      {news.shared_at && (
                        <Badge variant="secondary">Shared</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {news.suggested_talking_points && news.suggested_talking_points.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Talking Points:</div>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          {news.suggested_talking_points.map((point: string, idx: number) => (
                            <li key={idx}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        onClick={() => handleShareNews(news)}
                        disabled={!!news.shared_at}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        {news.shared_at ? 'Already Shared' : 'Share with Contact'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No news suggestions available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedNews && (
        <MessageTemplateDialog
          open={messageDialogOpen}
          onOpenChange={setMessageDialogOpen}
          contact={contact}
          templateType="industry_news"
          onSend={handleSendMessage}
          newsContent={selectedNews}
        />
      )}
    </>
  );
}
