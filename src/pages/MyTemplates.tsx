import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Users, Plus } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { ShareTemplateDialog } from "@/components/resume/ShareTemplateDialog";
import { AppNav } from "@/components/layout/AppNav";

interface Template {
  id: string;
  template_name: string;
  template_type: string;
  is_default: boolean;
  is_system_template: boolean;
  customization_settings: any;
  team_id: string | null;
  created_at: string;
  teams?: {
    name: string;
  };
}

export default function MyTemplates() {
  const [user, setUser] = useState<User | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) fetchTemplates();
    });
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("resume_templates")
        .select(`
          *,
          teams(name)
        `)
        .eq("is_system_template", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast.error("Failed to load templates");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenShareDialog = (template: Template) => {
    setSelectedTemplate(template);
    setShareDialogOpen(true);
  };

  if (loading) {
    return (
      <>
        <AppNav />
        <div className="container mx-auto py-8">Loading templates...</div>
      </>
    );
  }

  return (
    <>
      <AppNav />
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Shared Templates</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage and share your custom resume templates
            </p>
          </div>
        </div>

        {templates.length === 0 ? (
          <Card>
            <CardHeader className="text-center py-8 sm:py-12">
              <FileText className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="text-lg sm:text-xl">No Custom Templates Yet</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Create custom templates from the Resumes page
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <FileText className="h-5 w-5" />
                      <CardTitle className="text-lg">{template.template_name}</CardTitle>
                    </div>
                  </div>
                  <CardDescription>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="secondary">{template.template_type}</Badge>
                      {template.team_id && template.teams && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {template.teams.name}
                        </Badge>
                      )}
                      {!template.team_id && (
                        <Badge variant="outline">Personal</Badge>
                      )}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenShareDialog(template)}
                      className="w-full"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      {template.team_id ? "Manage Sharing" : "Share with Team"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Created {new Date(template.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selectedTemplate && (
          <ShareTemplateDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            templateId={selectedTemplate.id}
            templateName={selectedTemplate.template_name}
            onShared={fetchTemplates}
          />
        )}
      </div>
    </>
  );
}
