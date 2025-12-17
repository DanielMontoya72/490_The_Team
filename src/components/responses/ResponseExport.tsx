import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Download, FileText, File, Loader2 } from "lucide-react";

export function ResponseExport() {
  const [format, setFormat] = useState<'pdf' | 'markdown' | 'json'>('pdf');
  const [includeTypes, setIncludeTypes] = useState({
    behavioral: true,
    technical: true,
    situational: true,
  });
  const [includeFavoritesOnly, setIncludeFavoritesOnly] = useState(false);
  const [includeVersionHistory, setIncludeVersionHistory] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data: responses } = useQuery({
    queryKey: ['response-library'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('interview_response_library')
        .select('*')
        .eq('user_id', user.id)
        .order('question_type', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const filteredResponses = responses?.filter(r => {
    if (!includeTypes[r.question_type as keyof typeof includeTypes]) return false;
    if (includeFavoritesOnly && !r.is_favorite) return false;
    return true;
  });

  const generateMarkdown = () => {
    if (!filteredResponses) return '';

    let md = '# Interview Response Library\n\n';
    md += `*Exported on ${new Date().toLocaleDateString()}*\n\n`;
    md += '---\n\n';

    const groupedByType: Record<string, typeof filteredResponses> = {};
    filteredResponses.forEach(r => {
      if (!groupedByType[r.question_type]) groupedByType[r.question_type] = [];
      groupedByType[r.question_type].push(r);
    });

    Object.entries(groupedByType).forEach(([type, items]) => {
      md += `## ${type.charAt(0).toUpperCase() + type.slice(1)} Questions\n\n`;
      
      items.forEach((item, idx) => {
        md += `### ${idx + 1}. ${item.question}\n\n`;
        
        if (item.current_response) {
          md += `**Response:**\n\n${item.current_response}\n\n`;
        }
        
        if (item.skills?.length > 0) {
          md += `**Skills:** ${item.skills.join(', ')}\n\n`;
        }
        
        if (item.companies_used_for?.length > 0) {
          md += `**Used for:** ${item.companies_used_for.join(', ')}\n\n`;
        }
        
        if (item.success_count > 0) {
          md += `✅ *Led to ${item.success_count} successful outcome(s)*\n\n`;
        }
        
        md += '---\n\n';
      });
    });

    return md;
  };

  const handleExport = async () => {
    if (!filteredResponses || filteredResponses.length === 0) {
      toast.error('No responses to export');
      return;
    }

    setIsExporting(true);

    try {
      if (format === 'json') {
        const json = JSON.stringify(filteredResponses, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `interview-responses-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'markdown') {
        const md = generateMarkdown();
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `interview-responses-${new Date().toISOString().split('T')[0]}.md`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        // Use browser print for PDF
        const md = generateMarkdown();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html lang="en">
              <head>
                <title>Interview Response Library</title>
                <style>
                  body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; }
                  h1 { color: #1a1a1a; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                  h2 { color: #333; margin-top: 30px; }
                  h3 { color: #555; }
                  p { margin: 10px 0; }
                  hr { border: none; border-top: 1px solid #eee; margin: 20px 0; }
                  @media print { body { padding: 20px; } }
                </style>
              </head>
              <body>
                ${md.replace(/\n/g, '<br>').replace(/#{3} /g, '<h3>').replace(/#{2} /g, '<h2>').replace(/# /g, '<h1>')}
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
      }

      toast.success(`Exported ${filteredResponses.length} responses`);
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Response Library
          </CardTitle>
          <CardDescription>
            Export your interview responses as a prep guide
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base">Export Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as any)} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Label
                htmlFor="pdf"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
              >
                <RadioGroupItem value="pdf" id="pdf" className="sr-only" />
                <FileText className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">PDF</span>
              </Label>
              <Label
                htmlFor="markdown"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
              >
                <RadioGroupItem value="markdown" id="markdown" className="sr-only" />
                <File className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Markdown</span>
              </Label>
              <Label
                htmlFor="json"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
              >
                <RadioGroupItem value="json" id="json" className="sr-only" />
                <File className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">JSON</span>
              </Label>
            </RadioGroup>
          </div>

          {/* Question Types */}
          <div className="space-y-3">
            <Label className="text-base">Include Question Types</Label>
            <div className="space-y-2">
              {(['behavioral', 'technical', 'situational'] as const).map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={type}
                    checked={includeTypes[type]}
                    onCheckedChange={(checked) => 
                      setIncludeTypes(prev => ({ ...prev, [type]: !!checked }))
                    }
                  />
                  <Label htmlFor={type} className="capitalize">{type}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-3">
            <Label className="text-base">Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="favorites"
                  checked={includeFavoritesOnly}
                  onCheckedChange={(checked) => setIncludeFavoritesOnly(!!checked)}
                />
                <Label htmlFor="favorites">Favorites only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="history"
                  checked={includeVersionHistory}
                  onCheckedChange={(checked) => setIncludeVersionHistory(!!checked)}
                />
                <Label htmlFor="history">Include version history</Label>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              {filteredResponses?.length || 0} responses will be exported
            </p>
          </div>

          <Button 
            onClick={handleExport} 
            className="w-full"
            disabled={isExporting || !filteredResponses?.length}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export as {format.toUpperCase()}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
