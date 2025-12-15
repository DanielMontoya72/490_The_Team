import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { ArrowLeft, Edit3, Trash2, FileText, FileDown, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTextSize } from '@/components/text-size-provider';
import jsPDF from 'jspdf';
import { markChecklistItemComplete } from '@/lib/checklist-utils';
import { CoverLetterShareDialog } from '@/components/coverletter/CoverLetterShareDialog';
import { CoverLetterFeedbackPanel } from '@/components/coverletter/CoverLetterFeedbackPanel';
import { MessageSquare } from 'lucide-react';

export default function CoverLetterEditorPage() {
  const navigate = useNavigate();
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



  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppNav />
        <div className="container mx-auto px-4 py-8 space-y-6">
          <div className="text-center py-12 text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="container max-w-[1600px] mx-auto px-4 py-8 space-y-6">
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/cover-letters')}
            className="-ml-3"
          >
            Back to Cover Letters
          </Button>
          
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="space-y-2">
              <h1 className={`${textSizes.title} font-bold`}>
                {letterId ? 'Edit Cover Letter' : 'Create Cover Letter'}
              </h1>
              <div className="space-y-1">
                {materialName && (
                  <p className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    {materialName}
                  </p>
                )}
                {template && !materialName && (
                  <p className="text-muted-foreground">
                    Using template: {template.template_name}
                  </p>
                )}
                {!template && !materialName && !letterId && (
                  <p className="text-muted-foreground">
                    Creating a blank cover letter
                  </p>
                )}
                {job && (
                  <p className="text-muted-foreground">
                    For: {job.job_title} at {job.company_name}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {activeShare && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFeedback(!showFeedback)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {showFeedback ? 'Hide' : 'View'} Feedback
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsShareDialogOpen(true)}
                disabled={!materialId}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExportDialogOpen(true)}
                disabled={!editorContent}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewName(materialName);
                  setIsRenameDialogOpen(true);
                }}
                disabled={!materialId}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Rename
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={!materialId}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Rename Dialog */}
        <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
          <DialogContent>
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
          <DialogContent>
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
          <DialogContent className="max-w-2xl">
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
          <div className={showFeedback && activeShare ? "xl:col-span-2" : "xl:col-span-3"}>
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
          
          {showFeedback && activeShare && materialId && (
            <div className="xl:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Feedback
                  </CardTitle>
                  <CardDescription>
                    Comments from reviewers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CoverLetterFeedbackPanel
                    coverLetterId={materialId}
                    shareId={activeShare.id}
                    isOwner={true}
                    allowComments={activeShare.allow_comments}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
