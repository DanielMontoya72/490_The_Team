import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Placeholder {
  key: string;
  label: string;
  type: 'text' | 'textarea';
}

interface FollowUpPlaceholderFormProps {
  subject: string;
  content: string;
  followUpType: string;
  onComplete: (filledSubject: string, filledContent: string) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function FollowUpPlaceholderForm({ 
  subject, 
  content,
  followUpType,
  onComplete, 
  onCancel,
  isSaving = false 
}: FollowUpPlaceholderFormProps) {
  const { toast } = useToast();
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [isPolishing, setIsPolishing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    // Extract all placeholders from subject and content
    const combined = `${subject}\n${content}`;
    const matches = combined.match(/\[([^\]]+)\]/g) || [];
    const uniquePlaceholders = [...new Set(matches)];
    
    const placeholderList: Placeholder[] = uniquePlaceholders.map(match => {
      const key = match;
      const label = match
        .replace(/[\[\]]/g, '')
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      // Use textarea for longer fields
      const type = label.toLowerCase().includes('topic') || 
                   label.toLowerCase().includes('detail') || 
                   label.toLowerCase().includes('discussion') ||
                   label.toLowerCase().includes('example') ||
                   label.toLowerCase().includes('point') ||
                   label.toLowerCase().includes('insight')
        ? 'textarea' 
        : 'text';
      
      return { key, label, type };
    });

    setPlaceholders(placeholderList);
    
    // Initialize values
    const initialValues: Record<string, string> = {};
    placeholderList.forEach(p => {
      initialValues[p.key] = '';
    });
    setValues(initialValues);
  }, [subject, content]);

  // Live preview with placeholders replaced
  const previewContent = useMemo(() => {
    let previewSubject = subject;
    let previewBody = content;

    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const replacement = value.trim() || key;
      previewSubject = previewSubject.replace(regex, replacement);
      previewBody = previewBody.replace(regex, replacement);
    });

    return { subject: previewSubject, content: previewBody };
  }, [subject, content, values]);

  const handleFinalize = async () => {
    // First do basic replacement
    let filledSubject = subject;
    let filledContent = content;

    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      filledSubject = filledSubject.replace(regex, value || key);
      filledContent = filledContent.replace(regex, value || key);
    });

    // Now call AI to polish and integrate
    setIsPolishing(true);
    try {
      const { data, error } = await supabase.functions.invoke('finalize-follow-up', {
        body: {
          subject: filledSubject,
          content: filledContent,
          followUpType,
          placeholderValues: values
        }
      });

      if (error) throw error;

      toast({
        title: "Email Polished",
        description: "Your message has been refined and is ready to save.",
      });

      onComplete(data.subject, data.content);
    } catch (error) {
      console.error('Error polishing email:', error);
      // Fallback to basic replacement if AI fails
      toast({
        title: "Using Basic Version",
        description: "AI polishing failed, using your filled-in version.",
        variant: "destructive",
      });
      onComplete(filledSubject, filledContent);
    } finally {
      setIsPolishing(false);
    }
  };

  const allFilled = placeholders.every(p => values[p.key]?.trim());

  if (placeholders.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This template is ready to save. No placeholders to fill.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => onComplete(subject, content)} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Follow-up
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-sm">Personalize Your Message</h4>
          <p className="text-xs text-muted-foreground">
            Fill in the details below. AI will polish the final message.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs"
        >
          {showPreview ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </Button>
      </div>

      {showPreview && (
        <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Live Preview</div>
          <div className="text-sm font-medium">{previewContent.subject}</div>
          <div className="text-xs text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
            {previewContent.content}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {placeholders.map((placeholder) => (
          <div key={placeholder.key} className="space-y-1.5">
            <Label htmlFor={placeholder.key} className="text-sm">
              {placeholder.label}
            </Label>
            {placeholder.type === 'textarea' ? (
              <Textarea
                id={placeholder.key}
                value={values[placeholder.key]}
                onChange={(e) => setValues(prev => ({ ...prev, [placeholder.key]: e.target.value }))}
                placeholder={`Enter ${placeholder.label.toLowerCase()}...`}
                className="resize-none text-sm"
                rows={2}
              />
            ) : (
              <Input
                id={placeholder.key}
                value={values[placeholder.key]}
                onChange={(e) => setValues(prev => ({ ...prev, [placeholder.key]: e.target.value }))}
                placeholder={`Enter ${placeholder.label.toLowerCase()}...`}
                className="text-sm"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-3 border-t">
        <Button 
          onClick={handleFinalize} 
          disabled={!allFilled || isSaving || isPolishing}
          className="flex-1"
        >
          {(isSaving || isPolishing) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPolishing ? (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Polishing with AI...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Polish & Save
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {!allFilled && (
        <p className="text-xs text-muted-foreground text-center">
          Fill in all fields to continue
        </p>
      )}
    </div>
  );
}
