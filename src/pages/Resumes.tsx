import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/layout/AppNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResumeTemplateSelector } from "@/components/resume/ResumeTemplateSelector";
import { ResumeTemplatesShowcase } from "@/components/resume/ResumeTemplatesShowcase";
import { ResumeList } from "@/components/resume/ResumeList";
import { ResumeEditor } from "@/components/resume/ResumeEditor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileText, Users, ArrowLeft, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ShareTemplateDialog } from "@/components/resume/ShareTemplateDialog";
import { useTextSize } from "@/components/text-size-provider";

interface Template {
  id: string;
  template_name: string;
  template_type: string;
  is_default: boolean;
  is_system_template: boolean;
  customization_settings: any;
  team_id: string | null;
  user_id: string | null;
  created_at: string;
  teams?: {
    name: string;
  };
  user_role?: 'owner' | 'admin' | 'member' | 'viewer' | 'mentor' | 'candidate';
}

const Resumes = () => {
  const navigate = useNavigate();
  const { textSize } = useTextSize();

  // Define responsive text sizes based on textSize setting
  const getTextSizes = () => {
    switch (textSize) {
      case 'xs':
        return {
          title: 'text-2xl sm:text-3xl',
          subtitle: 'text-lg sm:text-xl',
          body: 'text-sm',
          small: 'text-xs',
          cardTitle: 'text-base',
          icon: 'h-4 w-4'
        };
      case 'sm':
        return {
          title: 'text-3xl sm:text-4xl',
          subtitle: 'text-xl sm:text-2xl',
          body: 'text-base',
          small: 'text-sm',
          cardTitle: 'text-lg',
          icon: 'h-4 w-4'
        };
      case 'md':
        return {
          title: 'text-3xl sm:text-4xl lg:text-5xl',
          subtitle: 'text-xl sm:text-2xl',
          body: 'text-base sm:text-lg',
          small: 'text-sm',
          cardTitle: 'text-lg',
          icon: 'h-5 w-5'
        };
      case 'lg':
        return {
          title: 'text-4xl sm:text-5xl lg:text-6xl',
          subtitle: 'text-2xl sm:text-3xl',
          body: 'text-lg sm:text-xl',
          small: 'text-base',
          cardTitle: 'text-xl',
          icon: 'h-6 w-6'
        };
      case 'xl':
        return {
          title: 'text-5xl sm:text-6xl lg:text-7xl',
          subtitle: 'text-3xl sm:text-4xl',
          body: 'text-xl sm:text-2xl',
          small: 'text-lg',
          cardTitle: 'text-2xl',
          icon: 'h-8 w-8'
        };
      default:
        return {
          title: 'text-3xl sm:text-4xl lg:text-5xl',
          subtitle: 'text-xl sm:text-2xl',
          body: 'text-base sm:text-lg',
          small: 'text-sm',
          cardTitle: 'text-lg',
          icon: 'h-5 w-5'
        };
    }
  };

  const textSizes = getTextSizes();
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [sharedTemplates, setSharedTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editingResumeId, setEditingResumeId] = useState<string | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          navigate("/login");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchSharedTemplates = async () => {
    if (!session?.user?.id) return;
    
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from("resume_templates")
        .select(`
          *,
          teams(name)
        `)
        .eq("is_system_template", false)
        .not("team_id", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user roles for team templates
      const templatesWithRoles = await Promise.all(
        (data || []).map(async (template) => {
          if (template.team_id) {
            const { data: memberData } = await supabase
              .from("team_members")
              .select("role")
              .eq("team_id", template.team_id)
              .eq("user_id", session.user.id)
              .maybeSingle();
            
            return { ...template, user_role: memberData?.role };
          }
          return template;
        })
      );

      setSharedTemplates(templatesWithRoles);
    } catch (error: any) {
      toast.error("Failed to load templates");
      console.error(error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleRemoveSharing = async (templateId: string, templateName: string) => {
    try {
      const { error } = await supabase
        .from("resume_templates")
        .update({ team_id: null })
        .eq("id", templateId)
        .eq("user_id", session.user.id);

      if (error) throw error;

      toast.success(`"${templateName}" is no longer shared with team`);
      await fetchSharedTemplates();
    } catch (error: any) {
      console.error("Failed to remove sharing:", error);
      toast.error("Failed to remove sharing");
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from("resume_templates")
        .delete()
        .eq("id", templateId)
        .eq("user_id", session.user.id);

      if (error) throw error;

      toast.success("Template deleted successfully");
      await fetchSharedTemplates();
      setTemplateToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete template:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleOpenShareDialog = (template: Template) => {
    setSelectedTemplate(template);
    setShareDialogOpen(true);
  };

  const handleEditResume = (resumeId: string) => {
    setEditingResumeId(resumeId);
  };

  const handleSaveResume = () => {
    setEditingResumeId(null);
    toast.success("Resume saved successfully!");
  };

  const handleBackToList = () => {
    setEditingResumeId(null);
    setActiveTab("list");
  };

  const handleCreateResume = async (templateId: string) => {
    try {
      // Fetch user profile data
      const [profileRes, employmentRes, skillsRes, educationRes, certificationsRes, projectsRes] = await Promise.all([
        supabase.from("user_profiles").select("*").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("employment_history").select("*").eq("user_id", session.user.id).order("start_date", { ascending: false }),
        supabase.from("skills").select("*").eq("user_id", session.user.id).order("display_order"),
        supabase.from("education").select("*").eq("user_id", session.user.id).order("graduation_date", { ascending: false }),
        supabase.from("certifications").select("*").eq("user_id", session.user.id).order("date_earned", { ascending: false }),
        supabase.from("projects").select("*").eq("user_id", session.user.id).order("start_date", { ascending: false }),
      ]);

      // Build content from user data
      const content = {
        profile: profileRes.data || {},
        employment: employmentRes.data || [],
        education: educationRes.data || [],
        skills: skillsRes.data || [],
        certifications: certificationsRes.data || [],
        projects: projectsRes.data || [],
      };

      // Get template info for the resume name
      const { data: templateData } = await supabase
        .from("resume_templates")
        .select("template_name")
        .eq("id", templateId)
        .single();

      const resumeName = `${templateData?.template_name || "Resume"} - ${new Date().toLocaleDateString()}`;

      // Create the resume
      const { data: newResume, error } = await supabase
        .from("resumes")
        .insert({
          user_id: session.user.id,
          template_id: templateId,
          resume_name: resumeName,
          content,
          customization_overrides: {},
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Resume created with your data!");
      
      // Navigate directly to the editor
      if (newResume?.id) {
        setEditingResumeId(newResume.id);
      } else {
        setActiveTab("list");
      }
    } catch (error: any) {
      console.error("Failed to create resume:", error);
      toast.error("Failed to create resume");
    }
  };

  useEffect(() => {
    if (activeTab === "shared" && session?.user?.id) {
      fetchSharedTemplates();
    }
  }, [activeTab, session?.user?.id]);

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <AppNav />
      
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:py-12 lg:py-12 max-w-[95%]">
        {editingResumeId ? (
          // Show Resume Editor
          <div className="space-y-4 sm:space-y-6">
            <Button
              variant="ghost"
              onClick={handleBackToList}
              className="mb-2 sm:mb-2 w-full sm:w-auto"
            >
              <ArrowLeft className={`${textSizes.icon} mr-2`} />
              <span className={textSizes.body}>Back to My Resumes</span>
            </Button>
            <div className="bg-card rounded-lg border shadow-sm p-1 sm:p-1 md:p-1">
              <ResumeEditor
                userId={session.user.id}
                resumeId={editingResumeId}
                onSave={handleSaveResume}
              />
            </div>
          </div>
        ) : (
          // Show Tabs
          <>
            <div className="text-center mb-4 sm:mb-6 md:mb-8 animate-fade-in px-2">
              <h1 className={`${textSizes.title} font-bold mb-2 leading-tight`}>
                Resume Builder
              </h1>
              <p className={`text-muted-foreground ${textSizes.body} leading-relaxed`}>
                Create and manage professional resumes tailored for different positions
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full h-14 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-transparent p-0 border-b-2 border-primary/20">
                <TabsTrigger value="list" className={`h-full ${textSizes.body} font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none`}>
                  <span className="hidden sm:inline">My Resumes</span>
                  <span className="sm:hidden">Active</span>
                </TabsTrigger>
                <TabsTrigger value="archived" className={`h-full ${textSizes.body} font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none`}>
                  <Archive className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Archived</span>
                  <span className="sm:hidden">Archived</span>
                </TabsTrigger>
                <TabsTrigger value="templates" className={`h-full ${textSizes.body} font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none`}>
                  Templates
                </TabsTrigger>
                <TabsTrigger value="shared" className={`h-full ${textSizes.body} font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none`}>
                  <span className="hidden sm:inline">Shared Templates</span>
                  <span className="sm:hidden">Shared</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="animate-fade-in">
                <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 md:p-6 lg:p-8">
                  <ResumeList 
                    userId={session.user.id} 
                    onEditResume={handleEditResume}
                    onCreateNew={() => setActiveTab("templates")}
                    showArchived={false}
                  />
                </div>
              </TabsContent>

              <TabsContent value="archived" className="animate-fade-in">
                <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 md:p-6 lg:p-8">
                  <ResumeList 
                    userId={session.user.id} 
                    onEditResume={handleEditResume}
                    onCreateNew={() => setActiveTab("templates")}
                    showArchived={true}
                  />
                </div>
              </TabsContent>

          <TabsContent value="templates" className="animate-fade-in space-y-6">
            {/* Template Style Guide */}
            <ResumeTemplatesShowcase />

            <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 md:p-6 lg:p-8">
              <ResumeTemplateSelector 
                userId={session.user.id}
                onSelectTemplate={handleCreateResume}
              />
            </div>
          </TabsContent>

          <TabsContent value="shared" className="animate-fade-in">
            <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 md:p-6 lg:p-8">
              {loadingTemplates ? (
                <div className={`text-center py-8 ${textSizes.body}`}>Loading templates...</div>
              ) : sharedTemplates.length === 0 ? (
                <div className="text-center py-8 sm:py-12 px-4">
                  <FileText className={`h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-4`} />
                  <h3 className={`${textSizes.subtitle} font-semibold mb-2 leading-tight`}>No Shared Templates Yet</h3>
                  <p className={`text-muted-foreground ${textSizes.body} leading-relaxed max-w-md mx-auto`}>
                    Share templates with your team from the Templates tab
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {sharedTemplates.map((template) => (
                    <Card key={template.id} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/20">
                      <CardHeader className="pb-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <FileText className={`${textSizes.icon} text-primary`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className={`${textSizes.cardTitle} leading-tight break-words mb-1`}>
                                {template.template_name}
                              </CardTitle>
                              <CardDescription className="flex flex-wrap gap-1.5 mt-2">
                                <Badge variant="secondary" className={`${textSizes.small} font-medium`}>
                                  {template.template_type}
                                </Badge>
                                {template.teams && (
                                  <Badge variant="default" className={`flex items-center gap-1 ${textSizes.small}`}>
                                    <Users className="h-3 w-3" />
                                    <span className="truncate max-w-[100px]">{template.teams.name}</span>
                                  </Badge>
                                )}
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        <div className="flex flex-col gap-2">
                          {/* Edit with My Data button - available for all users */}
                          <Button
                            size="sm"
                            onClick={() => handleCreateResume(template.id)}
                            className="w-full h-auto py-3 px-3 leading-normal"
                          >
                            <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="text-sm">Use Template</span>
                          </Button>

                          {/* Manage Sharing - only for own templates or team admin/owner */}
                          {(template.user_id === session.user.id || 
                            template.user_role === 'owner' || 
                            template.user_role === 'admin') && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenShareDialog(template)}
                                className="w-full h-auto py-3 px-3 leading-normal"
                              >
                                <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span className="text-sm">Manage Sharing</span>
                              </Button>
                              
                              {/* Delete Shared Template - removes team association only */}
                              {template.user_id === session.user.id && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemoveSharing(template.id, template.template_name)}
                                    className="w-full h-auto py-3 px-3 text-destructive hover:bg-destructive/10 leading-normal"
                                  >
                                    <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                                    <span className="text-sm">Remove Sharing</span>
                                  </Button>
                                  
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setTemplateToDelete({ id: template.id, name: template.template_name })}
                                    className="w-full h-auto py-3 px-3 text-destructive hover:bg-destructive/10 leading-normal"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2 flex-shrink-0" />
                                    <span className="text-sm">Delete Template</span>
                                  </Button>
                                </>
                              )}
                            </>
                          )}

                          {/* Remove Sharing - available for members but not viewers */}
                          {template.user_id !== session.user.id && 
                           template.user_role === 'member' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveSharing(template.id, template.template_name)}
                              className="w-full h-auto py-3 px-3 leading-normal"
                            >
                              <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="text-sm">Remove Sharing</span>
                            </Button>
                          )}

                          {/* Role badge for team templates */}
                          {template.team_id && template.user_role && (
                            <p className={`${textSizes.small} text-muted-foreground text-center leading-relaxed`}>
                              Your role: <span className="font-medium capitalize">{template.user_role}</span>
                            </p>
                          )}

                          <p className={`${textSizes.small} text-muted-foreground text-center leading-relaxed`}>
                            Created {new Date(template.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        </>
        )}

        {selectedTemplate && (
          <ShareTemplateDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            templateId={selectedTemplate.id}
            templateName={selectedTemplate.template_name}
            onShared={fetchSharedTemplates}
          />
        )}

        {templateToDelete && (
          <AlertDialog open={templateToDelete !== null} onOpenChange={() => setTemplateToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Template</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{templateToDelete.name}"? This action cannot be undone and will permanently remove the template and all its data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => handleDeleteTemplate(templateToDelete.id)}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Delete Template
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </main>
    </div>
  );
};

export default Resumes;
