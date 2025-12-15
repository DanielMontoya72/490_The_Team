import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Copy, Send, Sparkles } from "lucide-react";

interface MessageTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: any;
  templateType?: string;
  onSend?: (subject: string, message: string) => void;
  newsContent?: any;
}

export function MessageTemplateDialog({ open, onOpenChange, contact, templateType: initialType, onSend, newsContent }: MessageTemplateDialogProps) {
  const queryClient = useQueryClient();
  const [templateType, setTemplateType] = useState(initialType || 'check_in');
  const [tone, setTone] = useState('professional');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generatedSubject, setGeneratedSubject] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');

  // Reset form when dialog opens or template type changes
  useEffect(() => {
    if (open) {
      setTemplateType(initialType || 'check_in');
      setGeneratedSubject('');
      setGeneratedMessage('');
      
      // Pre-fill context if news content is provided
      if (newsContent && initialType === 'industry_news') {
        const contextText = `Article: ${newsContent.news_headline}\nURL: ${newsContent.news_url || 'N/A'}\n\nSummary: ${newsContent.news_summary}\n\nWhy it matters: ${newsContent.relevance_reason}\n\nTalking points:\n${newsContent.suggested_talking_points?.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}`;
        setAdditionalContext(contextText);
      } else if (newsContent && initialType === 'relationship_strengthening') {
        const contextText = `Suggestion: ${newsContent.headline}\n\nDetails: ${newsContent.summary}\n\nKey Actions:\n${newsContent.talkingPoints?.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n') || 'N/A'}`;
        setAdditionalContext(contextText);
      } else {
        setAdditionalContext('');
      }
    }
  }, [open, initialType, newsContent]);

  const { data: savedTemplates } = useQuery({
    queryKey: ['message-templates', templateType],
    enabled: open,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('relationship_message_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('template_type', templateType)
        .order('usage_count', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  const generateTemplate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-relationship-message-template', {
        body: {
          templateType,
          contactName: `${contact.first_name} ${contact.last_name}`,
          contactTitle: contact.current_title,
          contactCompany: contact.current_company,
          tone,
          additionalContext,
          birthday: contact.birthday,
          sharedInterests: contact.shared_interests,
          newsContent
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setGeneratedSubject(data.subject);
      setGeneratedMessage(data.message);
      toast.success('Template generated!');
    },
    onError: (error) => {
      console.error('Template generation error:', error);
      toast.error('Failed to generate template');
    },
  });

  const saveTemplate = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Use contact's birthday for birthday templates, otherwise use current date
      let templateName = `${templateType} - ${new Date().toLocaleDateString()}`;
      if (templateType === 'birthday' && contact.birthday) {
        const birthdayDate = new Date(contact.birthday);
        templateName = `birthday - ${birthdayDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`;
      }
      
      const { error } = await supabase
        .from('relationship_message_templates')
        .insert({
          user_id: user?.id,
          template_type: templateType,
          template_name: templateName,
          subject_line: generatedSubject,
          message_body: generatedMessage,
          tone
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates', templateType] });
      toast.success('Template saved!');
    },
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`Subject: ${generatedSubject}\n\n${generatedMessage}`);
    toast.success('Copied to clipboard!');
  };

  const sendMessage = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('send-relationship-message', {
        body: {
          contactId: contact.id,
          subject: generatedSubject,
          message: generatedMessage
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professional-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts-needing-checkin'] });
      queryClient.invalidateQueries({ queryKey: ['relationship-health'] });
      if (onSend) {
        onSend(generatedSubject, generatedMessage);
      }
      onOpenChange(false);
      toast.success('Message sent successfully!');
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    },
  });

  const handleSend = () => {
    // Edge function handles fallback email for contacts without email addresses
    sendMessage.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Message for {contact.first_name}
          </DialogTitle>
          <DialogDescription>
            Create personalized messages to maintain your professional relationship
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-8rem)] pr-4">
          <div className="space-y-6 py-2 px-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Message Type</Label>
              <Select value={templateType} onValueChange={setTemplateType}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="birthday">🎂 Birthday Wish</SelectItem>
                  <SelectItem value="congratulations">🎉 Congratulations</SelectItem>
                  <SelectItem value="check_in">👋 Check-In</SelectItem>
                  <SelectItem value="industry_news">📰 Share Industry News</SelectItem>
                  <SelectItem value="thank_you">🙏 Thank You</SelectItem>
                  <SelectItem value="update">📝 Personal Update</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">💼 Professional</SelectItem>
                  <SelectItem value="casual">😊 Casual</SelectItem>
                  <SelectItem value="formal">🎩 Formal</SelectItem>
                  <SelectItem value="friendly">🤝 Friendly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Additional Context (Optional)</Label>
            <Textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder={
                templateType === 'birthday' ? 'Mention a shared memory or inside joke...' :
                templateType === 'congratulations' ? 'What are you congratulating them for?' :
                templateType === 'industry_news' ? 'Paste the news headline or link...' :
                'Add any specific details you want to include...'
              }
              rows={3}
              className="resize-none"
            />
          </div>

          <Button 
            onClick={() => generateTemplate.mutate()} 
            disabled={generateTemplate.isPending}
            className="w-full h-11 pl-6"
            size="lg"
          >
            {generateTemplate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Message
              </>
            )}
          </Button>

          {generatedSubject && generatedMessage && (
            <div className="space-y-4 p-6 bg-muted/50 rounded-lg border">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Subject</Label>
                <Input
                  value={generatedSubject}
                  onChange={(e) => setGeneratedSubject(e.target.value)}
                  className="h-11 font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Message</Label>
                <Textarea
                  value={generatedMessage}
                  onChange={(e) => setGeneratedMessage(e.target.value)}
                  rows={10}
                  className="font-sans resize-none"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={copyToClipboard} className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button variant="outline" onClick={() => saveTemplate.mutate()} className="flex-1" disabled={saveTemplate.isPending}>
                  {saveTemplate.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Save Template
                </Button>
                {onSend && (
                  <Button 
                    onClick={handleSend} 
                    className="flex-1"
                    disabled={sendMessage.isPending}
                  >
                    {sendMessage.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Email
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {savedTemplates && savedTemplates.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-medium">Your Saved Templates</Label>
              <div className="space-y-2">
                {savedTemplates.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="w-full justify-start text-left h-auto p-3 hover:bg-muted/50"
                    onClick={() => {
                      setGeneratedSubject(template.subject_line || '');
                      setGeneratedMessage(template.message_body);
                      setTone(template.tone);
                    }}
                  >
                    <div className="w-full">
                      <div className="font-semibold text-sm mb-1">{template.template_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {template.message_body.substring(0, 80)}...
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
