import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppNav } from '@/components/layout/AppNav';
import { CoverLetterEditor } from '@/components/jobs/CoverLetterEditor';
import { CoverLetterExport } from '@/components/jobs/CoverLetterExport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowLeft, Edit3, Trash2, FileText, FileDown, Share2, FolderOpen, FlaskConical, Layout, Book, Rocket, HelpCircle, BarChart3, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useTextSize } from '@/components/text-size-provider';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import { markChecklistItemComplete } from '@/lib/checklist-utils';
import { CoverLetterShareDialog } from '@/components/coverletter/CoverLetterShareDialog';
import { CoverLetterFeedbackPanel } from '@/components/coverletter/CoverLetterFeedbackPanel';

// Document Management sidebar navigation
const docManagementNavigation = [
  { to: "/doc-management", icon: Layout, label: "Doc Management" },
  { to: "/resumes", icon: FileText, label: "Resumes" },
  { to: "/cover-letters", icon: BarChart3, label: "Cover Letters" },
  { to: "/ab-testing", icon: FlaskConical, label: "A/B Testing" },
];

export default function CoverLetterEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { textSize } = useTextSize();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('templateId');
  const jobId = searchParams.get('jobId');
  const letterId = searchParams.get('letterId');
  const aiGenerate = searchParams.get('aiGenerate') === 'true';
  
  const [template, setTemplate] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [editorContent, setEditorContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [materialName, setMaterialName] = useState('');
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeShare, setActiveShare] = useState<any>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const getTextSizes = () => {
    switch (textSize) {
      case 'small':
        return { title: 'text-2xl sm:text-3xl', cardTitle: 'text-base' };
      case 'medium':
        return { title: 'text-3xl sm:text-4xl lg:text-5xl', cardTitle: 'text-lg' };
      case 'large':
        return { title: 'text-4xl sm:text-5xl lg:text-6xl', cardTitle: 'text-xl' };
      default:
        return { title: 'text-3xl sm:text-4xl lg:text-5xl', cardTitle: 'text-lg' };
    }
  };

  const textSizes = getTextSizes();

  useEffect(() => {
    fetchTemplateAndJob();
  }, [templateId, jobId, letterId]);

  useEffect(() => {
    if (materialId) {
      fetchActiveShare();
    }
  }, [materialId]);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();

      setUserProfile(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchActiveShare = async () => {
    try {
      const { data, error } = await supabase
        .from('cover_letter_shares')
        .select('*')
        .eq('cover_letter_id', materialId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setActiveShare(data);
    } catch (error) {
      console.error('Error fetching active share:', error);
    }
  };

  const fetchTemplateAndJob = async () => {
    try {
      setLoading(true);

      // If letterId is provided, load existing cover letter
      if (letterId) {
        const { data: letterData, error: letterError } = await supabase
          .from('application_materials')
          .select('*')
          .eq('id', letterId)
          .single();

        if (letterError) throw letterError;
        
        setMaterialId(letterData.id);
        setMaterialName(letterData.version_name);
        setEditorContent(letterData.file_url);
      } else if (templateId) {
        // Load template if provided
        const { data: templateData, error: templateError } = await supabase
          .from('cover_letter_templates')
          .select('*')
          .eq('id', templateId)
          .single();

        if (templateError) throw templateError;
        setTemplate(templateData);

        // For templates, start with empty content so users write their own
        // Template structure is available for AI generation, but not shown as placeholder
        setEditorContent('');
      } else {
        // No template or letter - create blank cover letter with placeholder
        setEditorContent('Start writing your cover letter here...');
      }

      if (jobId) {
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (jobError) throw jobError;
        setJob(jobData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load cover letter');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to save');
        return;
      }

      const versionName = materialName || (template 
        ? `${template.template_name} - ${new Date().toLocaleDateString()}`
        : `Cover Letter - ${new Date().toLocaleDateString()}`);

      if (materialId) {
        // Update existing
        const { error } = await supabase
          .from('application_materials')
          .update({
            file_url: content,
            version_name: versionName,
            updated_at: new Date().toISOString()
          })
          .eq('id', materialId);

        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('application_materials')
          .insert({
            user_id: user.id,
            material_type: 'cover_letter',
            version_name: versionName,
            file_name: 'cover-letter.txt',
            file_url: content,
            is_default: false
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setMaterialId(data.id);
          setMaterialName(versionName);
        }
      }
      
      // Auto-complete the "cover letter" checklist item if saving for a job
      if (jobId) {
        await markChecklistItemComplete(jobId, 'cover_letter');
      }
      
      toast.success('Cover letter saved successfully');
    } catch (error) {
      console.error('Error saving cover letter:', error);
      toast.error('Failed to save cover letter');
    }
  };

  const handleRename = async () => {
    if (!materialId || !newName.trim()) {
      toast.error('Please enter a valid name');
      return;
    }

    try {
      const { error } = await supabase
        .from('application_materials')
        .update({ version_name: newName.trim() })
        .eq('id', materialId);

      if (error) throw error;
      
      setMaterialName(newName.trim());
      setIsRenameDialogOpen(false);
      toast.success('Cover letter renamed successfully');
    } catch (error) {
      console.error('Error renaming cover letter:', error);
      toast.error('Failed to rename cover letter');
    }
  };

  const handleDelete = async () => {
    if (!materialId) {
      toast.error('Please save the cover letter first');
      return;
    }

    try {
      const { error } = await supabase
        .from('application_materials')
        .delete()
        .eq('id', materialId);

      if (error) throw error;
      
      setIsDeleteDialogOpen(false);
      toast.success('Cover letter deleted successfully');
      navigate('/cover-letters');
    } catch (error) {
      console.error('Error deleting cover letter:', error);
      toast.error('Failed to delete cover letter');
    }
  };



  const isActive = (path: string) => location.pathname === path;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <AppNav />
        <div className="relative pt-16 min-h-screen">
          <main className="flex-1 w-full lg:ml-60">
            <div className="px-4 md:px-6 py-6 md:py-8 w-full">
              <div className="text-center py-12 text-lg">Loading...</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-h-screen bg-gradient-to-br from-background to-muted overflow-hidden">
      <AppNav />
      
      <div className="relative pt-16 h-[calc(100vh-4rem)] overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:block w-60 bg-card border-r fixed left-0 top-16 h-[calc(100vh-4rem)] overflow-y-auto z-30">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <FolderOpen className="h-5 w-5 text-primary flex-shrink-0" />
              <h3 className="font-bold text-base text-white">Document Hub</h3>
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
                        : "hover:bg-muted text-white hover:text-primary"
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
        <aside className="lg:hidden fixed left-0 top-16 right-0 bg-card/80 backdrop-blur-md border-b z-40">
          <details className="group">
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" />
                <h3 className="font-bold text-base text-white">Document Hub</h3>
              </div>
              <svg className="h-5 w-5 transition-transform group-open:rotate-180 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        : "hover:bg-muted/50 text-white hover:text-primary"
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
        <main className="flex-1 w-full lg:ml-60 lg:w-[calc(100vw-15rem)] h-full overflow-hidden">
          <div className="px-1 sm:px-2 lg:px-3 xl:px-4 py-1 sm:py-2 lg:py-3 w-full max-w-full h-full flex flex-col space-y-1 sm:space-y-2 lg:space-y-3 overflow-hidden">
        <div className="space-y-1 sm:space-y-2 flex-shrink-0">
          <Button
            variant="ghost"
            onClick={() => navigate('/cover-letters')}
            className="-ml-2 sm:-ml-3 touch-manipulation"
            size="sm"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Back to Cover Letters</span>
            <span className="sm:hidden text-xs">Back</span>
          </Button>
          
          <div className="flex flex-col gap-1 sm:gap-2">
            <div className="space-y-0.5 sm:space-y-1">
              <h1 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold break-words">
                {letterId ? 'Edit Cover Letter' : 'Create Cover Letter'}
              </h1>
              <div className="space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs lg:text-sm">
                {materialName && (
                  <p className="text-muted-foreground font-medium flex items-center gap-1 sm:gap-1.5">
                    <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3 lg:h-4 lg:w-4" />
                    <span className="truncate">{materialName}</span>
                  </p>
                )}
                {template && !materialName && (
                  <p className="text-muted-foreground truncate">
                    Using template: {template.template_name}
                  </p>
                )}
                {!template && !materialName && !letterId && (
                  <p className="text-muted-foreground">
                    Creating a blank cover letter
                  </p>
                )}
                {job && (
                  <p className="text-muted-foreground truncate">
                    For: {job.job_title} at {job.company_name}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex gap-0.5 sm:gap-1 lg:gap-2 flex-wrap">
              {activeShare && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFeedback(!showFeedback)}
                  className="touch-manipulation text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1"
                >
                  <MessageSquare className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                  <span className="hidden sm:inline">{showFeedback ? 'Hide' : 'View'} Feedback</span>
                  <span className="sm:hidden">Feedback</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsShareDialogOpen(true)}
                disabled={!materialId}
                className="touch-manipulation text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1"
              >
                <Share2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">Share</span>
                <span className="sm:hidden">Share</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExportDialogOpen(true)}
                disabled={!editorContent}
                className="touch-manipulation text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1"
              >
                <FileDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">Export</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewName(materialName);
                  setIsRenameDialogOpen(true);
                }}
                disabled={!materialId}
                className="touch-manipulation text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1"
              >
                <Edit3 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">Rename</span>
                <span className="sm:hidden">Rename</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={!materialId}
                className="text-destructive hover:text-destructive touch-manipulation text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1"
              >
                <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">Delete</span>
                <span className="sm:hidden">Delete</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Rename Dialog */}
        <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Rename Cover Letter</DialogTitle>
              <DialogDescription>
                Enter a new name for your cover letter
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-3">
                <Label htmlFor="name">Cover Letter Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Software Engineer at TechCorp"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRename();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRename}>
                Rename
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Cover Letter</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this cover letter? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Export Dialog */}
        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Export Cover Letter</DialogTitle>
              <DialogDescription>
                Choose your export format and customize the output
              </DialogDescription>
            </DialogHeader>
            <CoverLetterExport
              content={editorContent}
              jobTitle={job?.job_title || 'Position'}
              companyName={job?.company_name || 'Company'}
              applicantName={userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Applicant'}
              onContentUpdate={(newContent) => setEditorContent(newContent)}
            />
          </DialogContent>
        </Dialog>

        {materialId && (
          <CoverLetterShareDialog
            coverLetterId={materialId}
            coverLetterName={materialName}
            open={isShareDialogOpen}
            onOpenChange={setIsShareDialogOpen}
          />
        )}

        <div className="flex-1 min-h-0 w-full">
          {!showFeedback || !activeShare ? (
            <div className="w-full h-full">
              <CoverLetterEditor
                initialContent={editorContent}
                onSave={handleSave}
                onContentChange={(newContent) => setEditorContent(newContent)}
                jobTitle={job?.job_title}
                jobId={jobId || undefined}
                templateType={template?.template_type || 'formal'}
                autoGenerate={aiGenerate}
                globalTextSize={textSize}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 2xl:grid-cols-3 gap-1 sm:gap-2 lg:gap-3 w-full max-w-full h-full overflow-hidden">
              <div className="2xl:col-span-2 min-w-0 max-w-full overflow-hidden">
                <CoverLetterEditor
                  initialContent={editorContent}
                  onSave={handleSave}
                  onContentChange={(newContent) => setEditorContent(newContent)}
                  jobTitle={job?.job_title}
                  jobId={jobId || undefined}
                  templateType={template?.template_type || 'formal'}
                  autoGenerate={aiGenerate}
                  globalTextSize={textSize}
                />
              </div>
          
              <div className="2xl:col-span-1 min-w-0 max-w-full overflow-hidden">
                <Card className="sticky top-20 sm:top-24 h-fit max-h-[calc(100vh-8rem)] overflow-hidden">
                  <CardHeader className="pb-2 flex-shrink-0">
                    <CardTitle className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                      <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                      Feedback
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Comments from reviewers
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-3 lg:p-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
                    <CoverLetterFeedbackPanel
                      coverLetterId={materialId}
                      shareId={activeShare.id}
                      isOwner={true}
                      allowComments={activeShare.allow_comments}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
          </div>
        </main>
      </div>
    </div>
  );
}
