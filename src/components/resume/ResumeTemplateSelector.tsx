import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Users, Share2, Star, Plus, Trash2, MoreVertical } from "lucide-react";
import { MiniResumePreview } from "@/components/resume/MiniResumePreview";
import { ShareTemplateDialog } from "@/components/resume/ShareTemplateDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateType, setNewTemplateType] = useState("chronological");
  const [newTemplatePrimaryColor, setNewTemplatePrimaryColor] = useState("#2563eb");
  const [newTemplateFontFamily, setNewTemplateFontFamily] = useState("Inter");
  const [newTemplateLayout, setNewTemplateLayout] = useState("single-column");
  const [templateFilter, setTemplateFilter] = useState<"all" | "original" | "custom">("all");

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

  const handleCreateCustomTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("resume_templates")
        .insert({
          user_id: userId,
          template_name: newTemplateName.trim(),
          template_type: newTemplateType,
          is_system_template: false,
          customization_settings: {
            primaryColor: newTemplatePrimaryColor,
            fontFamily: newTemplateFontFamily,
            fontSize: "base",
            layout: newTemplateLayout
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Custom template created successfully!");
      setCreateDialogOpen(false);
      setNewTemplateName("");
      setNewTemplateType("chronological");
      setNewTemplatePrimaryColor("#2563eb");
      setNewTemplateFontFamily("Inter");
      setNewTemplateLayout("single-column");
      await fetchTemplates();
    } catch (error: any) {
      console.error("Template creation error:", error);
      toast.error(error.message || "Failed to create template");
    }
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, template: Template) => {
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete "${template.template_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("resume_templates")
        .delete()
        .eq("id", template.id);

      if (error) throw error;

      toast.success("Template deleted successfully");
      await fetchTemplates();
      
      // Clear selection if deleted template was selected
      if (selectedTemplate === template.id) {
        setSelectedTemplate(null);
      }
    } catch (error: any) {
      toast.error("Failed to delete template");
      console.error(error);
    }
  };

  // Filter templates based on selected filter
  const filteredTemplates = templates.filter(template => {
    if (templateFilter === "all") return true;
    if (templateFilter === "original") return template.is_system_template;
    if (templateFilter === "custom") return !template.is_system_template && template.user_id === userId;
    return true;
  });

  if (loading) {
    return <div className="text-center py-8">Loading templates...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Choose a Template</h2>
          <p className="text-muted-foreground">
            Select a template to create your professional resume
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Create Custom Template
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={templateFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setTemplateFilter("all")}
        >
          All Templates
        </Button>
        <Button
          variant={templateFilter === "original" ? "default" : "outline"}
          size="sm"
          onClick={() => setTemplateFilter("original")}
        >
          Original
        </Button>
        <Button
          variant={templateFilter === "custom" ? "default" : "outline"}
          size="sm"
          onClick={() => setTemplateFilter("custom")}
        >
          Custom Made
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map(template => <Card key={template.id} className={`cursor-pointer transition-all hover:shadow-lg ${selectedTemplate === template.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelectedTemplate(template.id)}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" style={{
                color: getTemplateColor(template.customization_settings)
              }} />
                  <CardTitle className="text-lg">{template.template_name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {template.template_name === "Classic Chronological" && (
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleShareClick(e, template)}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share to Team
                      </DropdownMenuItem>
                      {!template.is_system_template && template.user_id === userId && (
                        <DropdownMenuItem 
                          onClick={(e) => handleDeleteTemplate(e, template)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Template
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
              
              {selectedTemplate === template.id && (
                <div className="mt-4 pt-3 border-t">
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
                </div>
              )}
            </CardContent>
          </Card>)}
      </div>

      {templateToShare && <ShareTemplateDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} templateId={templateToShare.id} templateName={templateToShare.template_name} onShared={fetchTemplates} />}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Custom Template</DialogTitle>
            <DialogDescription>
              Create your own resume template with custom styling and layout
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left side - Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., My Professional Template"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="template-type">Template Type</Label>
                <Select value={newTemplateType} onValueChange={setNewTemplateType}>
                  <SelectTrigger id="template-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chronological">Chronological</SelectItem>
                    <SelectItem value="functional">Functional</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="layout">Layout Structure</Label>
                <Select value={newTemplateLayout} onValueChange={setNewTemplateLayout}>
                  <SelectTrigger id="layout">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single-column">Single Column</SelectItem>
                    <SelectItem value="two-column">Two Column</SelectItem>
                    <SelectItem value="sidebar">Sidebar Layout</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="font-family">Font Family</Label>
                <Select value={newTemplateFontFamily} onValueChange={setNewTemplateFontFamily}>
                  <SelectTrigger id="font-family">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter (Modern)</SelectItem>
                    <SelectItem value="Georgia">Georgia (Serif)</SelectItem>
                    <SelectItem value="Arial">Arial (Sans-serif)</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman (Classic)</SelectItem>
                    <SelectItem value="Helvetica">Helvetica (Professional)</SelectItem>
                    <SelectItem value="Calibri">Calibri (Clean)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="primary-color">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary-color"
                    type="color"
                    value={newTemplatePrimaryColor}
                    onChange={(e) => setNewTemplatePrimaryColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={newTemplatePrimaryColor}
                    onChange={(e) => setNewTemplatePrimaryColor(e.target.value)}
                    placeholder="#2563eb"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            
            {/* Right side - Live Preview */}
            <div className="space-y-2">
              <Label>Live Preview</Label>
              <div className="border rounded-lg p-4 bg-gray-50">
                <div 
                  className="bg-white shadow-lg rounded-md overflow-hidden"
                  style={{ fontFamily: newTemplateFontFamily }}
                >
                  {/* Preview based on layout */}
                  {newTemplateLayout === "single-column" && (
                    <div className="p-6 space-y-4">
                      <div className="text-center border-b pb-3" style={{ borderColor: newTemplatePrimaryColor }}>
                        <h1 className="text-2xl font-bold" style={{ color: newTemplatePrimaryColor }}>John Doe</h1>
                        <p className="text-sm text-gray-600">Software Engineer</p>
                        <p className="text-xs text-gray-500">john@email.com • (123) 456-7890</p>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold mb-2" style={{ color: newTemplatePrimaryColor }}>Experience</h2>
                        <div className="space-y-2 text-sm">
                          <div>
                            <div className="flex justify-between font-medium">
                              <span>Senior Developer</span>
                              <span className="text-gray-500">2020-2024</span>
                            </div>
                            <p className="text-gray-600">Tech Company Inc.</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold mb-2" style={{ color: newTemplatePrimaryColor }}>Skills</h2>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 text-xs rounded" style={{ backgroundColor: newTemplatePrimaryColor + '20', color: newTemplatePrimaryColor }}>React</span>
                          <span className="px-2 py-1 text-xs rounded" style={{ backgroundColor: newTemplatePrimaryColor + '20', color: newTemplatePrimaryColor }}>Node.js</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {newTemplateLayout === "two-column" && (
                    <div className="grid grid-cols-3 min-h-[300px]">
                      <div className="col-span-1 p-4 space-y-3" style={{ backgroundColor: newTemplatePrimaryColor + '15' }}>
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full mx-auto mb-2" style={{ backgroundColor: newTemplatePrimaryColor }}></div>
                          <h1 className="text-lg font-bold">John Doe</h1>
                          <p className="text-xs text-gray-600">Software Engineer</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold mb-1" style={{ color: newTemplatePrimaryColor }}>Contact</h3>
                          <p className="text-xs text-gray-600">john@email.com</p>
                          <p className="text-xs text-gray-600">(123) 456-7890</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold mb-1" style={{ color: newTemplatePrimaryColor }}>Skills</h3>
                          <div className="space-y-1">
                            <div className="text-xs">React</div>
                            <div className="text-xs">Node.js</div>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 p-4 space-y-3">
                        <div>
                          <h2 className="text-base font-semibold mb-2 border-b pb-1" style={{ borderColor: newTemplatePrimaryColor, color: newTemplatePrimaryColor }}>Experience</h2>
                          <div className="text-sm">
                            <div className="flex justify-between font-medium">
                              <span>Senior Developer</span>
                              <span className="text-gray-500 text-xs">2020-2024</span>
                            </div>
                            <p className="text-gray-600 text-xs">Tech Company Inc.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {newTemplateLayout === "sidebar" && (
                    <div className="grid grid-cols-4 min-h-[300px]">
                      <div className="col-span-1 p-3" style={{ backgroundColor: newTemplatePrimaryColor, color: 'white' }}>
                        <h3 className="text-sm font-semibold mb-2">Contact</h3>
                        <p className="text-xs mb-3">john@email.com<br/>(123) 456-7890</p>
                        <h3 className="text-sm font-semibold mb-2">Skills</h3>
                        <div className="text-xs space-y-1">
                          <div>React</div>
                          <div>Node.js</div>
                        </div>
                      </div>
                      <div className="col-span-3 p-4">
                        <h1 className="text-2xl font-bold mb-1">John Doe</h1>
                        <p className="text-sm text-gray-600 mb-4">Software Engineer</p>
                        <h2 className="text-base font-semibold mb-2" style={{ color: newTemplatePrimaryColor }}>Experience</h2>
                        <div className="text-sm">
                          <div className="font-medium">Senior Developer</div>
                          <p className="text-gray-600 text-xs">Tech Company Inc. • 2020-2024</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {newTemplateLayout === "compact" && (
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: newTemplatePrimaryColor }}>
                        <div>
                          <h1 className="text-xl font-bold" style={{ color: newTemplatePrimaryColor }}>John Doe</h1>
                          <p className="text-xs text-gray-600">Software Engineer</p>
                        </div>
                        <div className="text-xs text-right text-gray-600">
                          <div>john@email.com</div>
                          <div>(123) 456-7890</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <h3 className="text-sm font-semibold mb-1" style={{ color: newTemplatePrimaryColor }}>Experience</h3>
                          <div className="text-xs">
                            <div className="font-medium">Senior Developer</div>
                            <div className="text-gray-600">Tech Co. • 2020-24</div>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold mb-1" style={{ color: newTemplatePrimaryColor }}>Skills</h3>
                          <div className="text-xs text-gray-600">React, Node.js, SQL</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {newTemplateLayout === "single-column" && "Traditional single-column layout"}
                  {newTemplateLayout === "two-column" && "Two-column layout with sidebar"}
                  {newTemplateLayout === "sidebar" && "Sidebar layout with colored panel"}
                  {newTemplateLayout === "compact" && "Space-efficient compact layout"}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomTemplate}>
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};