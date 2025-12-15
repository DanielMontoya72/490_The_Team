import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Users, Share2, Star } from "lucide-react";
import { MiniResumePreview } from "@/components/resume/MiniResumePreview";
import { ShareTemplateDialog } from "@/components/resume/ShareTemplateDialog";
interface Template {
  id: string;
  template_name: string;
  template_type: string;
  is_system_template: boolean;
  customization_settings: any;
  user_id: string | null;
  team_id: string | null;
  created_at: string;
  teams?: {
    name: string;
  };
}
interface ResumeTemplateSelectorProps {
  userId: string;
  onSelectTemplate: (templateId: string) => void;
}
export const ResumeTemplateSelector = ({
  userId,
  onSelectTemplate
}: ResumeTemplateSelectorProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [templateToShare, setTemplateToShare] = useState<Template | null>(null);

  // Prefer user's own templates over team or system to avoid duplicates with same name/type
  const dedupeTemplates = (items: Template[]): Template[] => {
    const normalize = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
    const keyOf = (t: Template) => `${normalize(t.template_name)}|${normalize(t.template_type)}`;
    const rank = (t: Template) => t.user_id === userId ? 3 : t.team_id ? 2 : t.is_system_template ? 1 : 0;
    const map = new Map<string, Template>();
    for (const t of items) {
      const key = keyOf(t);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, t);
        continue;
      }
      const rNew = rank(t);
      const rOld = rank(existing);
      if (rNew > rOld || (rNew === rOld && new Date(t.created_at) > new Date(existing.created_at))) {
        map.set(key, t);
      }
    }
    return Array.from(map.values());
  };
  useEffect(() => {
    fetchTemplates();
  }, []);
  const fetchTemplates = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("resume_templates").select(`
          *,
          teams(name)
        `).order("is_system_template", {
        ascending: true
      }).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      const deduped = dedupeTemplates((data || []) as Template[]);
      setTemplates(deduped);
    } catch (error: any) {
      toast.error("Failed to load templates");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  const handleCreateResume = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    // Just call the parent handler, which will create the resume with user data
    onSelectTemplate(selectedTemplate);
    setSelectedTemplate(null);
  };
  const getTemplateColor = (settings: any) => {
    return settings?.primaryColor || "#2563eb";
  };
  const handleShareClick = async (e: React.MouseEvent, template: Template) => {
    e.stopPropagation();
    try {
      let target = template;
      if (template.is_system_template || template.user_id !== userId) {
        // Reuse existing personal copy if already created
        const {
          data: existing
        } = await supabase.from("resume_templates").select("*").eq("user_id", userId).eq("template_name", template.template_name).eq("template_type", template.template_type).maybeSingle();
        if (existing) {
          target = existing as Template;
        } else {
          toast.info("Preparing template for sharing...");
          const {
            data,
            error
          } = await supabase.from("resume_templates").insert({
            user_id: userId,
            template_name: template.template_name,
            template_type: template.template_type,
            is_system_template: false,
            customization_settings: template.customization_settings
          }).select().single();
          if (error) throw error;
          target = data as Template;
        }
        await fetchTemplates(); // refresh and dedupe to hide duplicates
      }
      setTemplateToShare(target);
      setShareDialogOpen(true);
    } catch (err: any) {
      console.error("Share prepare error:", err);
      toast.error(err.message || "Failed to prepare template for sharing");
    }
  };
  if (loading) {
    return <div className="text-center py-8">Loading templates...</div>;
  }
  return <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Choose a Template</h2>
        <p className="text-muted-foreground">
          Select a template to create your professional resume
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => <Card key={template.id} className={`cursor-pointer transition-all hover:shadow-lg ${selectedTemplate === template.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelectedTemplate(template.id)}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" style={{
                color: getTemplateColor(template.customization_settings)
              }} />
                  <CardTitle className="text-lg">{template.template_name}</CardTitle>
                </div>
                {template.template_name === "Classic Chronological" && (
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                )}
              </div>
              <CardDescription>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary">
                    {template.template_type}
                  </Badge>
                  {template.is_system_template && <Badge variant="outline">System</Badge>}
                  {template.team_id && template.teams && <Badge variant="default" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {template.teams.name}
                    </Badge>}
                  {!template.is_system_template && !template.team_id && <Badge variant="outline">Personal</Badge>}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MiniResumePreview name={template.template_name} type={template.template_type} color={getTemplateColor(template.customization_settings)} />
              
              <div className="mt-4 pt-3 border-t space-y-2">
                {selectedTemplate === template.id && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateResume();
                    }}
                    size="lg"
                    className="w-full"
                  >
                    Create Resume with My Data
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={(e) => handleShareClick(e, template)}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share to Team
                </Button>
              </div>
            </CardContent>
          </Card>)}
      </div>

      {templateToShare && <ShareTemplateDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} templateId={templateToShare.id} templateName={templateToShare.template_name} onShared={fetchTemplates} />}
    </div>;
};