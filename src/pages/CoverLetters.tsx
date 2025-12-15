import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppNav } from '@/components/layout/AppNav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CoverLetterTemplateLibrary } from '@/components/jobs/CoverLetterTemplateLibrary';
import { CoverLetterTemplatesShowcase } from '@/components/coverletter/CoverLetterTemplatesShowcase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileText, Plus, Download, Eye, Trash2, Edit3, Archive, FileDown, BarChart3, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { CoverLetterPerformance } from '@/components/jobs/CoverLetterPerformance';
import { TrackCoverLetterDialog } from '@/components/jobs/TrackCoverLetterDialog';
import { CoverLetterShareDialog } from '@/components/coverletter/CoverLetterShareDialog';
import { useTextSize } from '@/components/text-size-provider';
import jsPDF from 'jspdf';

interface CoverLetter {
  id: string;
  file_name: string;
  file_url: string;
  version_name: string;
  created_at: string;
  updated_at: string;
  is_default: boolean;
}

export default function CoverLetters() {
  const navigate = useNavigate();
  const { textSize } = useTextSize();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');
  const tabParam = searchParams.get('tab');
  
  const [session, setSession] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [archivedCoverLetters, setArchivedCoverLetters] = useState<CoverLetter[]>([]);
  const [loadingCoverLetters, setLoadingCoverLetters] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(tabParam || 'list');
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameId, setRenameId] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [trackingCoverLetter, setTrackingCoverLetter] = useState<{ id: string } | null>(null);
  const [sharingCoverLetter, setSharingCoverLetter] = useState<{ id: string; name: string } | null>(null);

  const getTextSizes = () => {
    switch (textSize) {
      case 'xs':
        return {
          title: 'text-2xl sm:text-3xl',
          subtitle: 'text-lg sm:text-xl',
          body: 'text-sm',
          cardTitle: 'text-base'
        };
      case 'sm':
        return {
          title: 'text-3xl sm:text-4xl',
          subtitle: 'text-xl sm:text-2xl',
          body: 'text-base',
          cardTitle: 'text-lg'
        };
      case 'lg':
        return {
          title: 'text-4xl sm:text-5xl lg:text-6xl',
          subtitle: 'text-2xl sm:text-3xl',
          body: 'text-lg sm:text-xl',
          cardTitle: 'text-xl'
        };
      case 'xl':
        return {
          title: 'text-5xl sm:text-6xl lg:text-7xl',
          subtitle: 'text-3xl sm:text-4xl',
          body: 'text-xl sm:text-2xl',
          cardTitle: 'text-2xl'
        };
      default:
        return {
          title: 'text-3xl sm:text-4xl lg:text-5xl',
          subtitle: 'text-xl sm:text-2xl',
          body: 'text-base sm:text-lg',
          cardTitle: 'text-lg'
        };
    }
  };

  const textSizes = getTextSizes();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate('/login');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (jobId) {
      fetchJob();
    }
  }, [jobId]);

  useEffect(() => {
    if (session) {
      fetchCoverLetters();
    }
  }, [session]);

  const fetchJob = async () => {
    if (!jobId) return;
    
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setJob(data);
    } catch (error) {
      console.error('Error fetching job:', error);
    }
  };

  const fetchCoverLetters = async () => {
    try {
      setLoadingCoverLetters(true);
      
      // Fetch active cover letters
      const { data: activeData, error: activeError } = await supabase
        .from('application_materials')
        .select('*')
        .eq('material_type', 'cover_letter')
        .eq('user_id', session.user.id)
        .or('is_archived.is.null,is_archived.eq.false')
        .order('created_at', { ascending: false });

      if (activeError) throw activeError;
      setCoverLetters(activeData || []);

      // Fetch archived cover letters
      const { data: archivedData, error: archivedError } = await supabase
        .from('application_materials')
        .select('*')
        .eq('material_type', 'cover_letter')
        .eq('user_id', session.user.id)
        .eq('is_archived', true)
        .order('created_at', { ascending: false });

      if (archivedError) throw archivedError;
      setArchivedCoverLetters(archivedData || []);
    } catch (error) {
      console.error('Error fetching cover letters:', error);
      toast.error('Failed to load cover letters');
    } finally {
      setLoadingCoverLetters(false);
    }
  };

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    // Navigate to editor page with template ID and optional job ID
    const params = new URLSearchParams({ templateId: template.id });
    if (jobId) {
      params.append('jobId', jobId);
    }
    navigate(`/cover-letter/edit?${params.toString()}`);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('application_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Cover letter deleted');
      fetchCoverLetters();
    } catch (error) {
      console.error('Error deleting cover letter:', error);
      toast.error('Failed to delete cover letter');
    }
  };

  const handleRename = async () => {
    if (!renameId || !newName.trim()) {
      toast.error('Please enter a valid name');
      return;
    }

    try {
      const { error } = await supabase
        .from('application_materials')
        .update({ version_name: newName.trim() })
        .eq('id', renameId);

      if (error) throw error;
      
      setIsRenameDialogOpen(false);
      toast.success('Cover letter renamed successfully');
      fetchCoverLetters();
    } catch (error) {
      console.error('Error renaming cover letter:', error);
      toast.error('Failed to rename cover letter');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const { error } = await supabase
        .from('application_materials')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Cover letter archived');
      fetchCoverLetters();
    } catch (error) {
      console.error('Error archiving cover letter:', error);
      toast.error('Failed to archive cover letter');
    }
  };

  const handleUnarchive = async (id: string) => {
    try {
      const { error } = await supabase
        .from('application_materials')
        .update({ is_archived: false })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Cover letter restored');
      fetchCoverLetters();
    } catch (error) {
      console.error('Error restoring cover letter:', error);
      toast.error('Failed to restore cover letter');
    }
  };

  const handleDownload = (coverLetter: CoverLetter) => {
    window.open(coverLetter.file_name, '_blank');
    toast.success('Opening cover letter');
  };

  const handleExportDOCX = async (coverLetter: CoverLetter) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to export');
        return;
      }

      // Get user profile for applicant name
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();

      const applicantName = profile ? `${profile.first_name} ${profile.last_name}` : 'Applicant';

      toast.loading('Generating DOCX...');

      const { data, error } = await supabase.functions.invoke('export-cover-letter-docx', {
        body: {
          content: coverLetter.file_url,
          jobTitle: 'Position',
          companyName: 'Company',
          applicantName: applicantName,
          includeLetterhead: false,
          formatStyle: 'professional'
        }
      });

      if (error) throw error;

      // Decode base64 and create blob
      const binaryString = atob(data.docx);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      
      // Download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${coverLetter.version_name}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.dismiss();
      toast.success('Cover letter exported as DOCX');
    } catch (error) {
      console.error('Error exporting to DOCX:', error);
      toast.dismiss();
      toast.error('Failed to export cover letter');
    }
  };

  const handleExportPDF = async (coverLetter: CoverLetter) => {
    try {
      toast.loading('Generating PDF...');
      
      // Create PDF using jsPDF
      const doc = new jsPDF();
      
      // Set font
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      
      // Split text into lines that fit the page width
      const pageWidth = doc.internal.pageSize.getWidth();
      const margins = { left: 25, right: 25, top: 25 };
      const maxLineWidth = pageWidth - margins.left - margins.right;
      
      const lines = doc.splitTextToSize(coverLetter.file_url, maxLineWidth);
      
      // Add text to PDF
      let yPosition = margins.top;
      const lineHeight = 7;
      const pageHeight = doc.internal.pageSize.getHeight();
      
      lines.forEach((line: string) => {
        if (yPosition + lineHeight > pageHeight - 25) {
          doc.addPage();
          yPosition = margins.top;
        }
        doc.text(line, margins.left, yPosition);
        yPosition += lineHeight;
      });
      
      // Save the PDF
      doc.save(`${coverLetter.version_name}.pdf`);
      
      toast.dismiss();
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.dismiss();
      toast.error('Failed to export to PDF');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="container max-w-[1600px] mx-auto px-4 py-8">
        <div className="mb-6">
          {job && (
            <div className="mb-4">
              <h1 className={`${textSizes.title} font-bold`}>Cover Letters for {job.job_title}</h1>
              <p className="text-muted-foreground">{job.company_name}</p>
            </div>
          )}
          {!job && (
            <h1 className={`${textSizes.title} font-bold mb-2`}>Cover Letters</h1>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full h-14 grid grid-cols-4 gap-2 bg-transparent p-0 border-b-2 border-primary/20">
            <TabsTrigger value="list" className={`h-full ${textSizes.body} font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none`}>
              <span className="hidden sm:inline">My Cover Letters</span>
              <span className="sm:hidden">My Letters</span>
            </TabsTrigger>
            <TabsTrigger value="archived" className={`h-full ${textSizes.body} font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none`}>
              Archived
            </TabsTrigger>
            <TabsTrigger value="templates" className={`h-full ${textSizes.body} font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none`}>
              Templates
            </TabsTrigger>
            <TabsTrigger value="performance" className={`h-full ${textSizes.body} font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none gap-2`}>
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Performance</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className={textSizes.cardTitle}>Your Cover Letters</CardTitle>
                    <CardDescription>Manage all your saved cover letters</CardDescription>
                  </div>
                  <Button onClick={() => setActiveTab('templates')}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Cover Letter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingCoverLetters ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading cover letters...
                  </div>
                ) : coverLetters.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No cover letters yet</p>
                    <Button onClick={() => setActiveTab('templates')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Cover Letter
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {coverLetters.map((letter) => (
                      <Card key={letter.id} className="overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base truncate">
                                {letter.version_name}
                              </CardTitle>
                              <CardDescription className="text-xs mt-1">
                                {new Date(letter.created_at).toLocaleDateString()}
                              </CardDescription>
                            </div>
                            {letter.is_default && (
                              <Badge variant="secondary" className="ml-2 shrink-0">Default</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-4">
                          {/* Live Preview Section */}
                          <div className="bg-white border rounded-md p-3 max-h-32 overflow-hidden relative">
                            <div className="text-xs text-gray-700 line-clamp-5 whitespace-pre-wrap font-serif">
                              {letter.file_url}
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                          </div>
                          
                          <p className="text-xs text-muted-foreground">
                            Last updated: {new Date(letter.updated_at).toLocaleDateString()}
                          </p>
                          
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => navigate(`/cover-letter/edit?letterId=${letter.id}`)}
                                className="flex-1"
                              >
                                <Edit3 className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRenameId(letter.id);
                                  setNewName(letter.version_name);
                                  setIsRenameDialogOpen(true);
                                }}
                                className="flex-1"
                              >
                                <Edit3 className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Rename</span>
                              </Button>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTrackingCoverLetter({ id: letter.id })}
                              className="w-full"
                            >
                              <BarChart3 className="h-3 w-3 mr-1" />
                              Track Performance
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSharingCoverLetter({ id: letter.id, name: letter.version_name })}
                              className="w-full"
                            >
                              <Share2 className="h-3 w-3 mr-1" />
                              Share
                            </Button>
                            <div className="flex gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                  >
                                    <FileDown className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">Export</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => handleExportDOCX(letter)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Export as DOCX
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleExportPDF(letter)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Export as PDF
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleArchive(letter.id)}
                              >
                                <Archive className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(letter.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="archived" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className={textSizes.cardTitle}>Archived Cover Letters</CardTitle>
                    <CardDescription>View and manage archived cover letters</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingCoverLetters ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading archived cover letters...
                  </div>
                ) : archivedCoverLetters.length === 0 ? (
                  <div className="text-center py-12">
                    <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No archived cover letters</p>
                  </div>
                ) : (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {archivedCoverLetters.map((letter) => (
                      <Card key={letter.id} className="overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all duration-200 opacity-75 hover:opacity-90">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base truncate">
                                {letter.version_name}
                              </CardTitle>
                              <CardDescription className="text-xs mt-1">
                                {new Date(letter.created_at).toLocaleDateString()}
                              </CardDescription>
                            </div>
                            <Badge variant="secondary" className="ml-2 shrink-0">Archived</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-4">
                          {/* Live Preview Section */}
                          <div className="bg-white border rounded-md p-3 max-h-32 overflow-hidden relative">
                            <div className="text-xs text-gray-700 line-clamp-5 whitespace-pre-wrap font-serif">
                              {letter.file_url}
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                          </div>
                          
                          <p className="text-xs text-muted-foreground">
                            Last updated: {new Date(letter.updated_at).toLocaleDateString()}
                          </p>
                          
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleUnarchive(letter.id)}
                              className="w-full"
                            >
                              <Archive className="h-3 w-3 mr-1" />
                              Restore
                            </Button>
                            <div className="flex gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                  >
                                    <FileDown className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">Export</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => handleExportDOCX(letter)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Export as DOCX
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleExportPDF(letter)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Export as PDF
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(letter.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            {/* Create Blank Cover Letter Card */}
            <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary">
                      <FileText className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className={textSizes.cardTitle}>Start from Scratch</CardTitle>
                      <CardDescription>
                        Create a blank cover letter and write your own content
                      </CardDescription>
                    </div>
                  </div>
                  <Button 
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (jobId) params.append('jobId', jobId);
                      navigate(`/cover-letter/edit?${params.toString()}`);
                    }}
                    size="lg"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Blank
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Template Style Guide */}
            <CoverLetterTemplatesShowcase />

            <CoverLetterTemplateLibrary 
              onSelectTemplate={handleSelectTemplate}
            />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <CoverLetterPerformance />
          </TabsContent>
        </Tabs>

        {/* Rename Dialog */}
        <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Cover Letter</DialogTitle>
              <DialogDescription>
                Enter a new name for your cover letter
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRename}>
                Rename
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <TrackCoverLetterDialog
          open={!!trackingCoverLetter}
          onOpenChange={(open) => !open && setTrackingCoverLetter(null)}
          materialId={trackingCoverLetter?.id}
          jobId={jobId}
          onSuccess={fetchCoverLetters}
        />

        {sharingCoverLetter && (
          <CoverLetterShareDialog
            coverLetterId={sharingCoverLetter.id}
            coverLetterName={sharingCoverLetter.name}
            open={!!sharingCoverLetter}
            onOpenChange={(open) => !open && setSharingCoverLetter(null)}
          />
        )}
      </div>
    </div>
  );
}
