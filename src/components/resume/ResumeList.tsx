import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Pencil, Trash2, Download, Copy, Plus, Upload, Edit2, Share2, GitBranch, CheckCircle2, GitCompare, Archive, ArchiveRestore } from "lucide-react";
import { ResumeVersionDialog } from "@/components/resume/ResumeVersionDialog";
import { ResumeVersionComparison } from "@/components/resume/ResumeVersionComparison";
import { ResumeJobLinks } from "@/components/resume/ResumeJobLinks";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShareTemplateDialog } from "@/components/resume/ShareTemplateDialog";
import { ResumeShareDialog } from "@/components/resume/ResumeShareDialog";
interface Resume {
  id: string;
  resume_name: string;
  version_number: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  template_id: string;
  content?: any;
  customization_overrides?: any;
  version_description?: string | null;
  parent_resume_id?: string | null;
  is_default?: boolean;
  resume_templates?: {
    template_name: string;
    template_type: string;
    user_id: string | null;
    is_system_template: boolean;
  };
}
interface ResumeListProps {
  userId: string;
  onEditResume: (resumeId: string) => void;
  onCreateNew: () => void;
  showArchived?: boolean;
}
export const ResumeList = ({
  userId,
  onEditResume,
  onCreateNew,
  showArchived: externalShowArchived = false
}: ResumeListProps) => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteResumeId, setDeleteResumeId] = useState<string | null>(null);
  const [renameResumeId, setRenameResumeId] = useState<string | null>(null);
  const [newResumeName, setNewResumeName] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [templateToShare, setTemplateToShare] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [sourceResumeForVersion, setSourceResumeForVersion] = useState<Resume | null>(null);
  const [compareResumeId, setCompareResumeId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(externalShowArchived);
  const [archiveResumeId, setArchiveResumeId] = useState<string | null>(null);
  const [shareResumeData, setShareResumeData] = useState<{
    id: string;
    name: string;
  } | null>(null);
  useEffect(() => {
    setShowArchived(externalShowArchived);
  }, [externalShowArchived]);

  useEffect(() => {
    fetchResumes();
  }, [userId, showArchived]);
  const fetchResumes = async () => {
    try {
      let query = supabase.from("resumes").select(`
          *,
          resume_templates (
            template_name,
            template_type,
            user_id,
            is_system_template
          )
        `).eq("user_id", userId);
      
      // Filter by active/archived status
      if (showArchived) {
        query = query.eq("is_active", false);  // Show ONLY archived
      } else {
        query = query.eq("is_active", true);   // Show ONLY active
      }
      
      const { data, error } = await query.order("updated_at", { ascending: false });
      
      if (error) throw error;
      setResumes(data || []);
    } catch (error: any) {
      toast.error("Failed to load resumes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async (resumeId: string) => {
    try {
      const {
        error
      } = await supabase.from("resumes").delete().eq("id", resumeId);
      if (error) throw error;
      toast.success("Resume deleted successfully");
      fetchResumes();
    } catch (error: any) {
      toast.error("Failed to delete resume");
      console.error(error);
    } finally {
      setDeleteResumeId(null);
    }
  };
  const handleDuplicate = async (resume: Resume) => {
    try {
      const {
        data,
        error
      } = await supabase.from("resumes").insert({
        user_id: userId,
        template_id: resume.template_id,
        resume_name: `${resume.resume_name} (Copy)`,
        version_number: resume.version_number,
        content: resume.content || {},
        customization_overrides: resume.customization_overrides || {}
      }).select().single();
      if (error) throw error;
      toast.success("Resume duplicated successfully");
      fetchResumes();
    } catch (error: any) {
      toast.error("Failed to duplicate resume");
      console.error(error);
    }
  };
  const handleRename = async () => {
    if (!renameResumeId || !newResumeName.trim()) return;
    try {
      const {
        error
      } = await supabase.from("resumes").update({
        resume_name: newResumeName.trim()
      }).eq("id", renameResumeId);
      if (error) throw error;
      toast.success("Resume renamed successfully");
      fetchResumes();
      setRenameResumeId(null);
      setNewResumeName("");
    } catch (error: any) {
      toast.error("Failed to rename resume");
      console.error(error);
    }
  };
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or DOCX file");
      return;
    }
    try {
      toast.info("Importing resume... This may take a moment");

      // This is a placeholder for the actual import functionality
      // In a real implementation, you would parse the document and extract content
      // For now, we'll create a new resume entry
      const {
        data,
        error
      } = await supabase.from("resumes").insert({
        user_id: userId,
        resume_name: file.name.replace(/\.[^/.]+$/, ""),
        content: {
          imported: true,
          fileName: file.name
        },
        customization_overrides: {}
      }).select().single();
      if (error) throw error;
      toast.success("Resume imported successfully. You can now edit it.");
      setUploadDialogOpen(false);
      fetchResumes();
    } catch (error: any) {
      toast.error("Failed to import resume");
      console.error(error);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSetDefault = async (resumeId: string) => {
    try {
      const { error } = await supabase
        .from("resumes")
        .update({ is_default: true })
        .eq("id", resumeId);

      if (error) throw error;

      toast.success("Default resume updated");
      fetchResumes();
    } catch (error: any) {
      toast.error("Failed to set default resume");
      console.error(error);
    }
  };

  const handleCreateVersion = (resume: Resume) => {
    setSourceResumeForVersion(resume);
    setVersionDialogOpen(true);
  };

  const handleArchive = async (resumeId: string) => {
    try {
      const { error } = await supabase
        .from("resumes")
        .update({ is_active: false })
        .eq("id", resumeId);

      if (error) throw error;

      toast.success("Resume archived successfully");
      fetchResumes();
    } catch (error: any) {
      toast.error("Failed to archive resume");
      console.error(error);
    } finally {
      setArchiveResumeId(null);
    }
  };

  const handleUnarchive = async (resumeId: string) => {
    try {
      const { error } = await supabase
        .from("resumes")
        .update({ is_active: true })
        .eq("id", resumeId);

      if (error) throw error;

      toast.success("Resume unarchived successfully");
      fetchResumes();
    } catch (error: any) {
      toast.error("Failed to unarchive resume");
      console.error(error);
    }
  };
  if (loading) {
    return <div className="text-center py-8">Loading resumes...</div>;
  }

  if (compareResumeId) {
    return (
      <ResumeVersionComparison
        resumeId={compareResumeId}
        onClose={() => setCompareResumeId(null)}
      />
    );
  }
  if (resumes.length === 0) {
    return <div className="text-center py-12">
        <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Resumes Yet</h3>
        <p className="text-muted-foreground mb-6">
          Get started by creating your first professional resume
        </p>
        <Button onClick={onCreateNew} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Create Your First Resume
        </Button>
      </div>;
  }
  return <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">{showArchived ? "Archived Resumes" : "My Resumes"}</h2>
          <p className="text-muted-foreground">
            {showArchived ? "Manage your archived resume versions" : "Manage your resume versions"}
          </p>
        </div>
        <div className="flex gap-2">
          {externalShowArchived === undefined && (
            <Button 
              variant={showArchived ? "default" : "outline"} 
              onClick={() => setShowArchived(!showArchived)}
            >
              <Archive className="h-4 w-4 mr-2" />
              {showArchived ? "Show Active" : "Show Archived"}
            </Button>
          )}
          {!showArchived && (
            <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import Resume
            </Button>
          )}
        </div>
      </div>
      
      {!showArchived && (
        <div className="flex justify-center">
          <Button onClick={onCreateNew} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            New Resume
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resumes.map(resume => <Card key={resume.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {resume.resume_name}
                    {resume.is_default && (
                      <Badge variant="default" className="ml-2">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge variant="secondary">
                        {resume.content?.imported ? "Imported" : resume.resume_templates?.template_type || "Unknown"}
                      </Badge>
                    {resume.parent_resume_id && (
                        <Badge variant="outline" className="text-xs">
                          <GitBranch className="h-3 w-3 mr-1" />
                          Version {resume.version_number}
                        </Badge>
                      )}
                      {!resume.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          <Archive className="h-3 w-3 mr-1" />
                          Archived
                        </Badge>
                      )}
                    </div>
                      {resume.version_description && (
                        <span className="text-xs text-muted-foreground">
                          {resume.version_description}
                        </span>
                      )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Resume Preview - Miniature visual representation */}
              {resume.content && Object.keys(resume.content).length > 0 && (
                <div className="mb-4 bg-white dark:bg-slate-900 border rounded-lg overflow-hidden relative" style={{ height: '280px' }}>
                  <div className="absolute inset-0 scale-[0.35] origin-top-left" style={{ width: '285%', height: '285%' }}>
                    <div className="bg-white p-8 text-gray-900 h-full overflow-hidden" style={{ fontFamily: resume.customization_overrides?.fontFamily || 'Inter', fontSize: '14px' }}>
                      {/* Header */}
                      <div className="text-center mb-4 pb-3 border-b-2" style={{ borderColor: resume.customization_overrides?.primaryColor || '#2563eb' }}>
                        <h1 className="text-2xl font-bold mb-1" style={{ color: resume.customization_overrides?.primaryColor || '#2563eb' }}>
                          {resume.content.profile?.first_name || ''} {resume.content.profile?.last_name || ''}
                        </h1>
                        {resume.content.profile?.headline && (
                          <p className="text-base text-gray-600 mb-1">{resume.content.profile.headline}</p>
                        )}
                        <div className="flex justify-center gap-3 text-xs text-gray-600">
                          {resume.content.profile?.email && <span>{resume.content.profile.email}</span>}
                          {resume.content.profile?.phone && <span>{resume.content.profile.phone}</span>}
                        </div>
                      </div>

                      {/* Professional Summary */}
                      {(resume.content.summary || resume.content.profile?.bio) && (
                        <div className="mb-3">
                          <h2 className="text-base font-bold mb-1" style={{ color: resume.customization_overrides?.primaryColor || '#2563eb' }}>
                            Professional Summary
                          </h2>
                          <p className="text-gray-700 text-xs leading-tight line-clamp-2">
                            {resume.content.summary || resume.content.profile?.bio}
                          </p>
                        </div>
                      )}

                      {/* Experience */}
                      {(resume.content.employment?.length > 0 || resume.content.experience?.length > 0) && (
                        <div className="mb-3">
                          <h2 className="text-base font-bold mb-1" style={{ color: resume.customization_overrides?.primaryColor || '#2563eb' }}>
                            Experience
                          </h2>
                          {(resume.content.employment || resume.content.experience)?.slice(0, 2).map((job: any, idx: number) => (
                            <div key={idx} className="mb-2">
                              <h3 className="font-semibold text-gray-900 text-sm">{job.job_title || job.title}</h3>
                              <p className="text-xs text-gray-600">{job.company_name || job.company}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Education */}
                      {resume.content.education?.length > 0 && (
                        <div className="mb-3">
                          <h2 className="text-base font-bold mb-1" style={{ color: resume.customization_overrides?.primaryColor || '#2563eb' }}>
                            Education
                          </h2>
                          {resume.content.education.slice(0, 1).map((edu: any, idx: number) => (
                            <div key={idx}>
                              <h3 className="font-semibold text-gray-900 text-sm">{edu.degree}</h3>
                              <p className="text-xs text-gray-600">{edu.institution || edu.school}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Skills */}
                      {resume.content.skills?.length > 0 && (
                        <div>
                          <h2 className="text-base font-bold mb-1" style={{ color: resume.customization_overrides?.primaryColor || '#2563eb' }}>
                            Skills
                          </h2>
                          <div className="flex flex-wrap gap-1">
                            {resume.content.skills.slice(0, 6).map((skill: any, idx: number) => (
                              <span key={idx} className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded">
                                {skill.skill_name || skill.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground mb-4">
                Last updated: {new Date(resume.updated_at).toLocaleDateString()}
              </div>
              
              <ResumeJobLinks resumeId={resume.id} />
              
              <div className="flex flex-wrap gap-2 mt-4">
                {resume.is_active ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => onEditResume(resume.id)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setRenameResumeId(resume.id);
                        setNewResumeName(resume.resume_name);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Rename
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleCreateVersion(resume)}>
                      <GitBranch className="h-4 w-4 mr-1" />
                      New Version
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCompareResumeId(resume.id)}>
                      <GitCompare className="h-4 w-4 mr-1" />
                      Compare
                    </Button>
                    <ResumeShareDialog
                      resumeId={resume.id}
                      resumeName={resume.resume_name}
                    >
                      <Button variant="outline" size="sm">
                        <Share2 className="h-4 w-4 mr-1" />
                        Share
                      </Button>
                    </ResumeShareDialog>
                    {!resume.is_default && (
                      <Button variant="outline" size="sm" onClick={() => handleSetDefault(resume.id)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Set Default
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleDuplicate(resume)}>
                      <Copy className="h-4 w-4 mr-1" />
                      Duplicate
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setArchiveResumeId(resume.id)}>
                      <Archive className="h-4 w-4 mr-1" />
                      Archive
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleteResumeId(resume.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleUnarchive(resume.id)}>
                      <ArchiveRestore className="h-4 w-4 mr-1" />
                      Unarchive
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setRenameResumeId(resume.id);
                        setNewResumeName(resume.resume_name);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Rename
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleteResumeId(resume.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>)}
      </div>

      <AlertDialog open={deleteResumeId !== null} onOpenChange={() => setDeleteResumeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this resume? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteResumeId && handleDelete(deleteResumeId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={archiveResumeId !== null} onOpenChange={() => setArchiveResumeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Resume</AlertDialogTitle>
            <AlertDialogDescription>
              Archive this resume? You can restore it later from the archived resumes view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiveResumeId && handleArchive(archiveResumeId)}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={renameResumeId !== null} onOpenChange={() => setRenameResumeId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Resume</DialogTitle>
            <DialogDescription>
              Enter a new name for your resume
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resume-name">Resume Name</Label>
              <Input id="resume-name" value={newResumeName} onChange={e => setNewResumeName(e.target.value)} placeholder="Enter resume name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameResumeId(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Existing Resume</DialogTitle>
            <DialogDescription>
              Upload a PDF or DOCX file to create a new resume from an existing document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <input ref={fileInputRef} type="file" accept=".pdf,.docx" onChange={handleFileUpload} className="hidden" id="file-upload" />
              <label htmlFor="file-upload">
                <Button variant="outline" asChild>
                  <span className="cursor-pointer">
                    Choose File
                  </span>
                </Button>
              </label>
              <p className="text-sm text-muted-foreground mt-2">
                Supported formats: PDF, DOCX
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {templateToShare && <ShareTemplateDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} templateId={templateToShare.id} templateName={templateToShare.name} onShared={() => {
      fetchResumes();
      setShareDialogOpen(false);
      setTemplateToShare(null);
    }} />}

      {shareResumeData && (
        <ResumeShareDialog
          open={shareDialogOpen}
          onOpenChange={(open) => {
            setShareDialogOpen(open);
            if (!open) {
              setShareResumeData(null);
            }
          }}
          resumeId={shareResumeData.id}
          resumeName={shareResumeData.name}
        />
      )}

      {sourceResumeForVersion && (
        <ResumeVersionDialog
          open={versionDialogOpen}
          onOpenChange={setVersionDialogOpen}
          sourceResume={sourceResumeForVersion}
          userId={userId}
          onVersionCreated={() => {
            fetchResumes();
            setVersionDialogOpen(false);
            setSourceResumeForVersion(null);
          }}
        />
      )}
    </div>;
};