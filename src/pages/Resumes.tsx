import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/layout/AppNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResumeList } from "@/components/resume/ResumeList";
import { ResumeEditor } from "@/components/resume/ResumeEditor";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileText, Users, ArrowLeft, Archive, Trash2, Mail, FolderOpen, FlaskConical, Layout, Book, Rocket, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { useTextSize } from "@/components/text-size-provider";
import { cn } from "@/lib/utils";
import { ShareTemplateDialog } from "@/components/resume/ShareTemplateDialog";


interface Template {
  id: string;
  template_name: string;
  template_type?: string;
  is_default?: boolean;
  is_system_template?: boolean;
  customization_settings?: any;
  team_id?: string | null;
  created_at?: string;
  user_role?: string;
  user_id?: string;
  teams?: {
    name: string;
  };
}

// Document Management sidebar navigation
const docManagementNavigation = [
  { to: "/doc-management", icon: Layout, label: "Doc Management" },
  { to: "/resumes", icon: FileText, label: "Resumes" },
  { to: "/cover-letters", icon: Mail, label: "Cover Letters" },
  { to: "/ab-testing", icon: FlaskConical, label: "A/B Testing" },
];



const Resumes = () => {
    // Fetch shared templates for the "Shared Templates" tab
    const fetchSharedTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const { data, error } = await supabase
          .from("resume_templates")
          .select("* , teams:team_id(*)")
          .or(`user_id.eq.${session?.user?.id},team_id.is.not.null`)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setSharedTemplates(data || []);
      } catch (err) {
        setSharedTemplates([]);
        toast.error("Failed to load shared templates");
      } finally {
        setLoadingTemplates(false);
      }
    };
  const navigate = useNavigate();
  const location = useLocation();
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

  // Handle new resume creation from template picker dialog
  const handleCreateNewResume = async ({ template, jobId }: { template: any, jobId: string }) => {
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

      // Compose resume name
      const resumeName = `${template?.name || "Resume"} - ${new Date().toLocaleDateString()}`;

      // Create the resume
      const { data: newResume, error } = await supabase
        .from("resumes")
        .insert({
          user_id: session.user.id,
          resume_name: resumeName,
          content,
          customization_overrides: { templateStyle: template?.style || "classic", primaryColor: "#2563eb" },
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Resume created!");
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

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Skip Links for Screen Readers */}
      <div className="sr-only focus-within:not-sr-only">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:p-4 focus:underline focus:outline-none focus:ring-2 focus:ring-primary-foreground"
          tabIndex={0}
        >
          Skip to main content
        </a>
        <a
          href="#document-nav"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-20 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:p-4 focus:underline focus:outline-none focus:ring-2 focus:ring-primary-foreground"
          tabIndex={0}
        >
          Skip to document navigation
        </a>
        <a
          href="#resume-tabs"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-40 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:p-4 focus:underline focus:outline-none focus:ring-2 focus:ring-primary-foreground"
          tabIndex={0}
        >
          Skip to resume tabs
        </a>
      </div>
      
      <AppNav />
      
      <div className="relative pt-16 min-h-screen">
        {/* Sidebar Navigation */}
        <aside id="document-nav" className="hidden lg:block w-60 bg-card border-2 border-primary fixed left-0 top-16 h-[calc(100vh-4rem)] overflow-y-auto z-30 rounded-r-lg">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <FolderOpen className="h-5 w-5 text-primary flex-shrink-0" />
              <h3 className="font-bold text-base text-foreground">Document Hub</h3>
            </div>
            <div className="space-y-1">
              {docManagementNavigation.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={index}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors group",
                      isActive(item.to)
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-muted text-foreground hover:text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Dropdown */}
        <aside className="lg:hidden fixed left-0 top-16 right-0 bg-card/80 backdrop-blur-md border-2 border-primary z-40 rounded-b-lg mx-2">
          <details className="group">
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" />
                <h3 className="font-bold text-base text-foreground">Document Hub</h3>
              </div>
              <svg className="h-5 w-5 transition-transform group-open:rotate-180 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-4 pb-4 space-y-1 border-t bg-background/80 backdrop-blur-md">
              {docManagementNavigation.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={index}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors group",
                      isActive(item.to)
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-muted/50 text-foreground hover:text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </details>
        </aside>

        {/* Main Content Area */}
        <main id="main-content" className="flex-1 lg:ml-60 overflow-x-hidden" tabIndex={-1}>
          <div className="px-2 sm:px-4 md:px-6 py-8 md:py-10 max-w-full">
        {editingResumeId ? (
          // Show Resume Editor
          <div>
            <Button
              variant="ghost"
              onClick={handleBackToList}
              className="mb-4 w-full sm:w-auto"
            >
              <ArrowLeft className={`${textSizes.icon} mr-2`} />
              <span className={textSizes.body}>Back to My Resumes</span>
            </Button>
            <ResumeEditor
              userId={session.user.id}
              resumeId={editingResumeId}
              onSave={handleSaveResume}
            />
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

            <Tabs id="resume-tabs" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full h-auto flex flex-wrap gap-2 bg-transparent p-0 border-b-2 border-primary/20">
                <TabsTrigger value="list" className={`h-full ${textSizes.body} font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none`}>
                  <span className="hidden sm:inline">My Resumes</span>
                  <span className="sm:hidden">Active</span>
                </TabsTrigger>
                <TabsTrigger value="archived" className={`h-full ${textSizes.body} font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none`}>
                  <Archive className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Archived</span>
                  <span className="sm:hidden">Archived</span>
                </TabsTrigger>
                {/* Templates tab removed */}
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
                      onCreateNew={handleCreateNewResume}
                      showArchived={false}
                    />
                  </div>
                </TabsContent>


                <TabsContent value="archived" className="animate-fade-in">
                  <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 md:p-6 lg:p-8">
                    <ResumeList 
                      userId={session.user.id} 
                      onEditResume={handleEditResume}
                      onCreateNew={handleCreateNewResume}
                      showArchived={true}
                    />
                  </div>
                </TabsContent>

              {/* Templates tab content removed */}



          <TabsContent value="shared" className="animate-fade-in">
            <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 md:p-6 lg:p-8">
              {loadingTemplates ? (
                <div className={`text-center py-8 ${textSizes.body}`}>Loading templates...</div>
              ) : sharedTemplates.length === 0 ? (
                <div className="text-center py-8 sm:py-12 px-4">
                  <FileText className={`h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-4`} />
                  <h3 className={`${textSizes.subtitle} font-semibold mb-2 leading-tight`}>No Shared Templates Yet</h3>
                  <p className={`text-muted-foreground ${textSizes.body} leading-relaxed max-w-md mx-auto`}>
                    {/* Share templates with your team from the Templates tab (removed) */}
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default Resumes;
