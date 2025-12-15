import { AppNav } from "@/components/layout/AppNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Mail, FolderOpen, Download, FileCheck, Award, ExternalLink, Calendar, Share2, Eye, Edit, Link, Star, Trash2, Archive, ArchiveRestore, FlaskConical } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Document Management specific sidebar navigation
const docManagementNavigation = [
  { to: "/doc-management", icon: FolderOpen, label: "Doc Management" },
  { to: "/resumes", icon: FileText, label: "Resume Builder" },
  { to: "/cover-letters", icon: Mail, label: "Cover Letter Builder" },
  { to: "/ab-testing", icon: FlaskConical, label: "A/B Testing" },
];

// Expandable sections for document types
const docManagementSections = [];

export default function DocManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [linkingDoc, setLinkingDoc] = useState<any>(null);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [deletingDoc, setDeletingDoc] = useState<any>(null);

  // Set up real-time subscriptions
  useEffect(() => {
    const setupSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const resumeChannel = supabase
        .channel('resume-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'resumes',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['resumes'] });
          }
        )
        .subscribe();

      const coverLetterChannel = supabase
        .channel('cover-letter-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'application_materials',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['application_materials_cover_letters'] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(resumeChannel);
        supabase.removeChannel(coverLetterChannel);
      };
    };

    const cleanup = setupSubscriptions();
    
    return () => {
      cleanup.then((cleanupFn) => {
        if (cleanupFn) cleanupFn();
      });
    };
  }, [queryClient]);

  const { data: resumes } = useQuery({
    queryKey: ['resumes'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: coverLetters } = useQuery({
    queryKey: ['application_materials_cover_letters'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('application_materials')
        .select('*')
        .eq('material_type', 'cover_letter')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching cover letters:', error);
        throw error;
      }
      
      console.log('Cover letters fetched:', data);
      return data || [];
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: archivedDocuments } = useQuery({
    queryKey: ['archived_documents'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('application_materials')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching archived documents:', error);
        throw error;
      }
      
      return data || [];
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs-for-export'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const handlePreview = (doc: any) => {
    setPreviewDoc(doc);
  };

  const handleEdit = (doc: any) => {
    if (doc.type === 'resume') {
      navigate('/resumes');
    } else {
      navigate(`/cover-letter/edit?letterId=${doc.id}`);
    }
  };

  const handleLinkToJobs = async (doc: any) => {
    // Fetch currently linked jobs
    const table = doc.type === 'resume' ? 'job_application_materials' : 'job_application_materials';
    const idField = doc.type === 'resume' ? 'resume_id' : 'cover_letter_id';
    
    try {
      const { data, error } = await supabase
        .from(table)
        .select('job_id')
        .eq(idField, doc.id);

      if (error) throw error;
      
      setSelectedJobs(data?.map(item => item.job_id) || []);
      setLinkingDoc(doc);
    } catch (error) {
      console.error('Error fetching linked jobs:', error);
      setSelectedJobs([]);
      setLinkingDoc(doc);
    }
  };

  const handleSaveJobLinks = async () => {
    if (!linkingDoc) return;

    const idField = linkingDoc.type === 'resume' ? 'resume_id' : 'cover_letter_id';

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get all jobs that currently have this document linked
      const { data: currentLinks, error: currentError } = await supabase
        .from('job_application_materials')
        .select('job_id')
        .eq(idField, linkingDoc.id);

      if (currentError) throw currentError;

      const currentlyLinkedJobIds = currentLinks?.map(link => link.job_id) || [];
      const jobsToUnlink = currentlyLinkedJobIds.filter(id => !selectedJobs.includes(id));
      const jobsToLink = selectedJobs.filter(id => !currentlyLinkedJobIds.includes(id));

      // Unlink jobs that were deselected (only unlink the document, don't delete it)
      for (const jobId of jobsToUnlink) {
        console.log(`Unlinking document ${linkingDoc.id} from job ${jobId}`);
        
        // Update application_packages table
        const { data: pkgData } = await supabase
          .from('application_packages')
          .select('id, resume_id, cover_letter_id')
          .eq('job_id', jobId)
          .maybeSingle();

        if (pkgData) {
          const otherField = linkingDoc.type === 'resume' ? 'cover_letter_id' : 'resume_id';
          if (pkgData[otherField]) {
            // Keep the package, just remove this material
            await supabase
              .from('application_packages')
              .update({ [idField]: null })
              .eq('job_id', jobId);
          } else {
            // No other materials, delete the package
            await supabase
              .from('application_packages')
              .delete()
              .eq('job_id', jobId);
          }
        }
        
        // Get the existing entry for this job in job_application_materials
        const { data: existing, error: fetchError } = await supabase
          .from('job_application_materials')
          .select('*')
          .eq('job_id', jobId)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching job link:', fetchError);
          continue;
        }

        console.log('Existing job link:', existing);

        if (existing) {
          // Check if this entry has other materials
          const otherField = linkingDoc.type === 'resume' ? 'cover_letter_id' : 'resume_id';
          console.log(`Checking if job has other material (${otherField}):`, existing[otherField]);
          
          if (existing[otherField]) {
            // Just remove this document's reference, keep the other material
            console.log(`Setting ${idField} to null for job ${jobId}`);
            const { error: updateError } = await supabase
              .from('job_application_materials')
              .update({ [idField]: null })
              .eq('job_id', jobId);
            
            if (updateError) {
              console.error('Error updating job link:', updateError);
            } else {
              console.log(`Successfully unlinked ${idField} from job ${jobId}`);
            }
          } else {
            // No other materials linked to this job, delete the job link entry
            console.log(`Deleting job_application_materials entry for job ${jobId}`);
            const { error: deleteError } = await supabase
              .from('job_application_materials')
              .delete()
              .eq('job_id', jobId);
            
            if (deleteError) {
              console.error('Error deleting job link:', deleteError);
            } else {
              console.log(`Successfully deleted job link for job ${jobId}`);
            }
          }
        }
      }

      // Link new jobs
      for (const jobId of jobsToLink) {
        // Update application_packages table first
        const { data: pkgData } = await supabase
          .from('application_packages')
          .select('*')
          .eq('job_id', jobId)
          .maybeSingle();

        if (pkgData) {
          // Update existing package
          await supabase
            .from('application_packages')
            .update({ [idField]: linkingDoc.id })
            .eq('job_id', jobId);
        } else {
          // Create new package
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('application_packages')
              .insert({
                job_id: jobId,
                user_id: user.id,
                [idField]: linkingDoc.id,
                package_status: 'draft'
              });
          }
        }

        // Get existing entry for this job
        const { data: existing, error: fetchError } = await supabase
          .from('job_application_materials')
          .select('*')
          .eq('job_id', jobId)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching job link:', fetchError);
          continue;
        }

        if (existing) {
          // Update existing entry with this document
          await supabase
            .from('job_application_materials')
            .update({ [idField]: linkingDoc.id })
            .eq('job_id', jobId);
        } else {
          // Create new entry for this job
          await supabase
            .from('job_application_materials')
            .insert({
              job_id: jobId,
              [idField]: linkingDoc.id,
            });
        }
      }

      toast({
        title: "Links Updated",
        description: `Document linked to ${selectedJobs.length} job(s)`,
      });

      setLinkingDoc(null);
      setSelectedJobs([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const handleSetDefaultCoverLetter = async (letterId: string) => {
    try {
      // First, unset all defaults
      const { error: unsetError } = await supabase
        .from('application_materials')
        .update({ is_default: false })
        .eq('material_type', 'cover_letter');

      if (unsetError) throw unsetError;

      // Then set the new default
      const { error: setError } = await supabase
        .from('application_materials')
        .update({ is_default: true })
        .eq('id', letterId);

      if (setError) throw setError;

      toast({
        title: "Default Cover Letter Set",
        description: "This cover letter is now your default",
      });

      queryClient.invalidateQueries({ queryKey: ['application_materials_cover_letters'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async () => {
    if (!deletingDoc) return;

    try {
      const table = deletingDoc.type === 'resume' ? 'resumes' : 'application_materials';
      
      // Delete the document
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', deletingDoc.id);

      if (error) throw error;

      // If it has a file URL in storage, delete it
      if (deletingDoc.file_url) {
        try {
          const urlPath = new URL(deletingDoc.file_url).pathname;
          const filePath = urlPath.split('/').slice(-2).join('/');
          await supabase.storage
            .from('application-materials')
            .remove([filePath]);
        } catch (storageError) {
          console.error('Error deleting file from storage:', storageError);
          // Continue even if storage deletion fails
        }
      }

      toast({
        title: "Document Deleted",
        description: `${deletingDoc.type === 'resume' ? 'Resume' : 'Cover letter'} has been permanently deleted`,
      });

      // Refresh the appropriate query
      if (deletingDoc.type === 'resume') {
        queryClient.invalidateQueries({ queryKey: ['resumes'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['application_materials_cover_letters'] });
      }
      queryClient.invalidateQueries({ queryKey: ['archived_documents'] });

      setDeletingDoc(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleArchiveDocument = async (doc: any) => {
    try {
      const table = doc.type === 'resume' ? 'resumes' : 'application_materials';
      
      // Archive the document
      const { error } = await supabase
        .from(table)
        .update({ is_archived: true })
        .eq('id', doc.id);

      if (error) throw error;

      toast({
        title: "Document Archived",
        description: `${doc.type === 'resume' ? 'Resume' : 'Cover letter'} has been archived`,
      });

      // Refresh queries
      if (doc.type === 'resume') {
        queryClient.invalidateQueries({ queryKey: ['resumes'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['application_materials_cover_letters'] });
      }
      queryClient.invalidateQueries({ queryKey: ['archived_documents'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUnarchiveDocument = async (doc: any) => {
    try {
      const table = doc.type === 'resume' ? 'resumes' : 'application_materials';
      
      // Unarchive the document
      const { error } = await supabase
        .from(table)
        .update({ is_archived: false })
        .eq('id', doc.id);

      if (error) throw error;

      toast({
        title: "Document Restored",
        description: `${doc.type === 'resume' ? 'Resume' : 'Cover letter'} has been restored from archive`,
      });

      // Refresh queries
      if (doc.type === 'resume') {
        queryClient.invalidateQueries({ queryKey: ['resumes'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['application_materials_cover_letters'] });
      }
      queryClient.invalidateQueries({ queryKey: ['archived_documents'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportReport = async () => {
    setExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Gather all data for comprehensive report
      const [jobsData, resumesData, coverLettersData, interviewsData, analyticsData] = await Promise.all([
        supabase.from('jobs').select('*').eq('user_id', user.id),
        supabase.from('resumes').select('*').eq('user_id', user.id),
        supabase.from('application_materials').select('*').eq('user_id', user.id).eq('material_type', 'cover_letter'),
        supabase.from('interviews').select('*').eq('user_id', user.id),
        supabase.from('job_match_analyses').select('*').eq('user_id', user.id),
      ]);

      const reportData = {
        generatedAt: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
        },
        summary: {
          totalJobs: jobsData.data?.length || 0,
          totalResumes: resumesData.data?.length || 0,
          totalCoverLetters: coverLettersData.data?.length || 0,
          totalInterviews: interviewsData.data?.length || 0,
          totalAnalyses: analyticsData.data?.length || 0,
        },
        jobs: jobsData.data || [],
        resumes: resumesData.data || [],
        coverLetters: coverLettersData.data || [],
        interviews: interviewsData.data || [],
        analytics: analyticsData.data || [],
      };

      // Create and download JSON report
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `job-search-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Report Exported",
        description: "Your comprehensive job search report has been downloaded.",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const allDocuments = [
    ...(resumes?.map(r => ({ ...r, type: 'resume' })) || []),
    ...(coverLetters?.map(c => ({ ...c, type: 'cover_letter' })) || []),
  ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold">Document Management</h1>
            </div>
            <Button onClick={handleExportReport} disabled={exporting} size="lg">
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export Job Search Report'}
            </Button>
          </div>
          <p className="text-muted-foreground text-lg">
            Organize and manage all your job search documents with version control
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Documents</p>
                  <p className="text-3xl font-bold">{allDocuments.length}</p>
                </div>
                <FileText className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resumes</p>
                  <p className="text-3xl font-bold">{resumes?.length || 0}</p>
                </div>
                <FileCheck className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cover Letters</p>
                  <p className="text-3xl font-bold">{coverLetters?.length || 0}</p>
                </div>
                <Mail className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Documents</TabsTrigger>
            <TabsTrigger value="resumes">Resumes</TabsTrigger>
            <TabsTrigger value="cover-letters">Cover Letters</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  All Documents ({allDocuments.length})
                </CardTitle>
                <CardDescription>
                  View and manage all your job search documents with version control
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allDocuments.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No documents yet. Create your first resume or cover letter to get started!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {allDocuments.map((doc: any) => (
                      <div key={doc.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {doc.type === 'resume' ? (
                                <FileText className="h-4 w-4 text-blue-500" />
                              ) : (
                                <Mail className="h-4 w-4 text-purple-500" />
                              )}
                              <h3 className="font-semibold">{doc.type === 'resume' ? (doc.title || doc.resume_name || 'Untitled') : (doc.version_name || 'Untitled')}</h3>
                              <Badge variant="outline">
                                {doc.type === 'resume' ? 'Resume' : 'Cover Letter'}
                              </Badge>
                              {doc.version && (
                                <Badge variant="secondary">v{doc.version}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Updated {format(new Date(doc.updated_at), 'MMM d, yyyy')}
                              </span>
                              {doc.linked_job_id && (
                                <Badge variant="outline" className="text-xs">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Linked to Job
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handlePreview(doc)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                            <Button size="sm" variant="default" onClick={() => handleEdit(doc)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleLinkToJobs(doc)}>
                              <Link className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleArchiveDocument(doc)}>
                              <Archive className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeletingDoc(doc)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resumes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Resume Library ({resumes?.length || 0})
                </CardTitle>
                <CardDescription>
                  Manage your resume collection with version control
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!resumes || resumes.length === 0 ? (
                  <div className="text-center py-8">
                    <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">No resumes yet</p>
                    <Button asChild>
                      <a href="/resumes">Create Your First Resume</a>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {resumes.map((resume: any) => (
                      <div key={resume.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-4 w-4 text-blue-500" />
                              <h3 className="font-semibold">{resume.title || resume.resume_name || 'Untitled Resume'}</h3>
                              {resume.version && (
                                <Badge variant="secondary">v{resume.version}</Badge>
                              )}
                              {resume.is_default && (
                                <Badge variant="default">Default</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Updated {format(new Date(resume.updated_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handlePreview(resume)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                            <Button size="sm" variant="default" onClick={() => navigate('/resumes')}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleLinkToJobs({ ...resume, type: 'resume' })}>
                              <Link className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleArchiveDocument({ ...resume, type: 'resume' })}>
                              <Archive className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeletingDoc({ ...resume, type: 'resume' })}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cover-letters" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Cover Letter Library ({coverLetters?.length || 0})
                </CardTitle>
                <CardDescription>
                  Manage your cover letter collection with version control
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!coverLetters || coverLetters.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">No cover letters yet</p>
                    <Button asChild>
                      <a href="/cover-letters">Create Your First Cover Letter</a>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {coverLetters.map((letter: any) => (
                      <div key={letter.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Mail className="h-4 w-4 text-purple-500" />
                              <h3 className="font-semibold">{letter.version_name || 'Untitled Cover Letter'}</h3>
                              {letter.is_default && (
                                <Badge variant="default">Default</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Updated {format(new Date(letter.updated_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant={letter.is_default ? "default" : "outline"}
                              onClick={() => handleSetDefaultCoverLetter(letter.id)}
                            >
                              <Star className={`h-4 w-4 mr-1 ${letter.is_default ? 'fill-current' : ''}`} />
                              {letter.is_default ? 'Default' : 'Set Default'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handlePreview(letter)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                            <Button size="sm" variant="default" onClick={() => navigate(`/cover-letter/edit?letterId=${letter.id}`)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleLinkToJobs({ ...letter, type: 'cover_letter' })}>
                              <Link className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleArchiveDocument({ ...letter, type: 'cover_letter' })}>
                              <Archive className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeletingDoc({ ...letter, type: 'cover_letter' })}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="archived" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  Archived Documents ({archivedDocuments?.length || 0})
                </CardTitle>
                <CardDescription>
                  Documents you've archived are stored here
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!archivedDocuments || archivedDocuments.length === 0 ? (
                  <div className="text-center py-8">
                    <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">No archived documents</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {archivedDocuments.map((doc: any) => (
                      <div key={doc.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors opacity-75">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {doc.material_type === 'resume' ? (
                                <FileText className="h-4 w-4 text-blue-500" />
                              ) : (
                                <Mail className="h-4 w-4 text-purple-500" />
                              )}
                              <h3 className="font-semibold">{doc.version_name || doc.file_name || 'Untitled'}</h3>
                              <Badge variant="outline">
                                {doc.material_type === 'resume' ? 'Resume' : 'Cover Letter'}
                              </Badge>
                              <Badge variant="secondary">Archived</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Updated {format(new Date(doc.updated_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handlePreview({ ...doc, type: doc.material_type })}>
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                            <Button size="sm" variant="default" onClick={() => handleUnarchiveDocument({ ...doc, type: doc.material_type })}>
                              <ArchiveRestore className="h-4 w-4 mr-1" />
                              Restore
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeletingDoc({ ...doc, type: doc.material_type })}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Preview Dialog */}
        <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {previewDoc?.type === 'resume' ? (
                  <FileText className="h-5 w-5 text-blue-500" />
                ) : (
                  <Mail className="h-5 w-5 text-purple-500" />
                )}
                {previewDoc?.type === 'resume' 
                  ? (previewDoc?.title || previewDoc?.resume_name || 'Resume Preview')
                  : (previewDoc?.version_name || 'Cover Letter Preview')
                }
              </DialogTitle>
              <DialogDescription>
                Preview of your {previewDoc?.type === 'resume' ? 'resume' : 'cover letter'}
              </DialogDescription>
            </DialogHeader>
            <div className="border rounded-lg p-6 bg-white text-black min-h-[400px]">
              {previewDoc?.type === 'resume' ? (
                <div className="space-y-4">
                  <div className="text-center border-b pb-4">
                    <h1 className="text-2xl font-bold">{previewDoc?.content?.profile?.name || 'Your Name'}</h1>
                    <p className="text-sm text-gray-600">{previewDoc?.content?.profile?.email || 'email@example.com'} | {previewDoc?.content?.profile?.phone || '(123) 456-7890'}</p>
                    <p className="text-sm text-gray-600">{previewDoc?.content?.profile?.location || 'City, State'}</p>
                  </div>
                  {previewDoc?.content?.summary && (
                    <div>
                      <h2 className="text-lg font-semibold border-b mb-2">Professional Summary</h2>
                      <p className="text-sm whitespace-pre-wrap">{previewDoc.content.summary}</p>
                    </div>
                  )}
                  {previewDoc?.content?.employment?.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold border-b mb-2">Experience</h2>
                      {previewDoc.content.employment.map((job: any, idx: number) => (
                        <div key={idx} className="mb-3">
                          <div className="flex justify-between">
                            <span className="font-medium">{job.position}</span>
                            <span className="text-sm text-gray-600">{job.start_date} - {job.end_date || 'Present'}</span>
                          </div>
                          <p className="text-sm text-gray-700">{job.company}</p>
                          <p className="text-sm whitespace-pre-wrap">{job.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {previewDoc?.content?.education?.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold border-b mb-2">Education</h2>
                      {previewDoc.content.education.map((edu: any, idx: number) => (
                        <div key={idx} className="mb-2">
                          <div className="flex justify-between">
                            <span className="font-medium">{edu.degree}</span>
                            <span className="text-sm text-gray-600">{edu.graduation_date}</span>
                          </div>
                          <p className="text-sm text-gray-700">{edu.institution}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {previewDoc?.content?.skills?.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold border-b mb-2">Skills</h2>
                      <div className="flex flex-wrap gap-2">
                        {previewDoc.content.skills.map((skill: any, idx: number) => (
                          <Badge key={idx} variant="secondary">{skill.name || skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm font-serif leading-relaxed">
                  {previewDoc?.file_url || previewDoc?.content || 'No content available'}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Link to Jobs Dialog */}
        <Dialog open={!!linkingDoc} onOpenChange={(open) => !open && setLinkingDoc(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Link to Jobs
              </DialogTitle>
              <DialogDescription>
                Select which jobs this {linkingDoc?.type === 'resume' ? 'resume' : 'cover letter'} is associated with
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Currently Linked Jobs */}
              {selectedJobs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Currently Linked Jobs ({selectedJobs.length})</h3>
                  <div className="space-y-2 mb-4">
                    {jobs?.filter((job: any) => selectedJobs.includes(job.id)).map((job: any) => (
                      <div key={job.id} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{job.job_title}</p>
                          <p className="text-xs text-muted-foreground">{job.company_name}</p>
                          <Badge variant="outline" className="text-xs mt-1">{job.status}</Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleJobSelection(job.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          Unlink
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Jobs to Link */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Available Jobs to Link</h3>
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {!jobs || jobs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No jobs found. Create a job application first.
                    </p>
                  ) : (
                    jobs
                      .filter((job: any) => !selectedJobs.includes(job.id))
                      .map((job: any) => (
                        <div key={job.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                          <Checkbox
                            checked={false}
                            onCheckedChange={() => toggleJobSelection(job.id)}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{job.job_title}</p>
                            <p className="text-xs text-muted-foreground">{job.company_name}</p>
                            <Badge variant="outline" className="text-xs mt-1">{job.status}</Badge>
                          </div>
                        </div>
                      ))
                  )}
                  {jobs && jobs.length > 0 && jobs.filter((job: any) => !selectedJobs.includes(job.id)).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      This document is already linked to all available jobs.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setLinkingDoc(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveJobLinks}>
                  Save Links ({selectedJobs.length})
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingDoc} onOpenChange={(open) => !open && setDeletingDoc(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this {deletingDoc?.type === 'resume' ? 'resume' : 'cover letter'} 
                ({deletingDoc?.type === 'resume' 
                  ? (deletingDoc?.title || deletingDoc?.resume_name || 'Untitled')
                  : (deletingDoc?.version_name || 'Untitled')
                }). This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteDocument} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

