import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Mail, ExternalLink, Package, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface LinkedMaterialsSectionProps {
  jobId: string;
  onManageMaterials?: () => void;
}

export function LinkedMaterialsSection({ jobId, onManageMaterials }: LinkedMaterialsSectionProps) {
  const queryClient = useQueryClient();
  
  const { data: applicationPackage, isLoading } = useQuery({
    queryKey: ['application-package', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('application_packages')
        .select(`
          *,
          resume:application_materials!application_packages_resume_id_fkey(id, file_name, version_name),
          cover_letter:application_materials!application_packages_cover_letter_id_fkey(id, file_name, version_name)
        `)
        .eq('job_id', jobId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Also check for app-created resumes linked via job_application_materials
  const { data: linkedResume } = useQuery({
    queryKey: ['linked-resume-for-job', jobId],
    queryFn: async () => {
      // First get the job_application_materials entry
      const { data: jamData, error: jamError } = await supabase
        .from('job_application_materials')
        .select('resume_id')
        .eq('job_id', jobId)
        .maybeSingle();

      if (jamError && jamError.code !== 'PGRST116') throw jamError;
      if (!jamData?.resume_id) return null;

      // Try to get from resumes table (app-created resumes)
      const { data: resumeData, error: resumeError } = await supabase
        .from('resumes')
        .select('id, resume_name')
        .eq('id', jamData.resume_id)
        .maybeSingle();

      if (resumeError && resumeError.code !== 'PGRST116') return null;
      return resumeData;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasResume = applicationPackage?.resume || linkedResume;
  const hasCoverLetter = applicationPackage?.cover_letter;
  const hasPortfolio = applicationPackage?.portfolio_urls && applicationPackage.portfolio_urls.length > 0;
  const hasMaterials = hasResume || hasCoverLetter || hasPortfolio;

  const handleUnlinkResume = async () => {
    try {
      // Check if there's an application package
      if (applicationPackage?.id) {
        await supabase
          .from('application_packages')
          .update({ resume_id: null })
          .eq('id', applicationPackage.id);
      }
      
      // Also check job_application_materials
      const { data: jamData } = await supabase
        .from('job_application_materials')
        .select('*')
        .eq('job_id', jobId)
        .maybeSingle();

      if (jamData) {
        if (jamData.cover_letter_id) {
          // Has cover letter, just null the resume
          await supabase
            .from('job_application_materials')
            .update({ resume_id: null })
            .eq('job_id', jobId);
        } else {
          // No other materials, delete entry
          await supabase
            .from('job_application_materials')
            .delete()
            .eq('job_id', jobId);
        }
      }

      toast.success('Resume unlinked from this job');
      queryClient.invalidateQueries({ queryKey: ['application-package', jobId] });
      queryClient.invalidateQueries({ queryKey: ['linked-resume-for-job', jobId] });
    } catch (error) {
      console.error('Error unlinking resume:', error);
      toast.error('Failed to unlink resume');
    }
  };

  const handleUnlinkCoverLetter = async () => {
    try {
      if (applicationPackage?.id) {
        await supabase
          .from('application_packages')
          .update({ cover_letter_id: null })
          .eq('id', applicationPackage.id);
      }

      // Also check job_application_materials
      const { data: jamData } = await supabase
        .from('job_application_materials')
        .select('*')
        .eq('job_id', jobId)
        .maybeSingle();

      if (jamData) {
        if (jamData.resume_id) {
          // Has resume, just null the cover letter
          await supabase
            .from('job_application_materials')
            .update({ cover_letter_id: null })
            .eq('job_id', jobId);
        } else {
          // No other materials, delete entry
          await supabase
            .from('job_application_materials')
            .delete()
            .eq('job_id', jobId);
        }
      }

      toast.success('Cover letter unlinked from this job');
      queryClient.invalidateQueries({ queryKey: ['application-package', jobId] });
    } catch (error) {
      console.error('Error unlinking cover letter:', error);
      toast.error('Failed to unlink cover letter');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle>Application Materials</CardTitle>
          </div>
          {onManageMaterials && (
            <Button variant="outline" size="sm" onClick={onManageMaterials}>
              Manage
            </Button>
          )}
        </div>
        <CardDescription>
          Materials linked to this application
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasMaterials ? (
          <div className="text-center py-6 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No materials linked yet</p>
            {onManageMaterials && (
              <Button variant="outline" size="sm" className="mt-3" onClick={onManageMaterials}>
                Add Materials
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Resume */}
            {(applicationPackage?.resume || linkedResume) && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <FileText className="h-5 w-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {applicationPackage?.resume?.file_name || linkedResume?.resume_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {applicationPackage?.resume?.version_name || 'Resume'}
                  </p>
                </div>
                <Badge variant="secondary">Resume</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleUnlinkResume}
                  title="Unlink resume"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Cover Letter */}
            {applicationPackage?.cover_letter && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <Mail className="h-5 w-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {applicationPackage.cover_letter.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {applicationPackage.cover_letter.version_name}
                  </p>
                </div>
                <Badge variant="secondary">Cover Letter</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleUnlinkCoverLetter}
                  title="Unlink cover letter"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Portfolio Links */}
            {hasPortfolio && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Portfolio Links:</p>
                {applicationPackage.portfolio_urls.map((url: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline truncate flex-1"
                    >
                      {url}
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Package Status */}
            {applicationPackage && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">Package Status:</span>
                <Badge variant={applicationPackage.package_status === 'sent' ? 'default' : 'outline'}>
                  {applicationPackage.package_status || 'draft'}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
