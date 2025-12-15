import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FileText, Star, Download, Trash2, Upload, ExternalLink, BarChart3, Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TrackCoverLetterDialog } from './TrackCoverLetterDialog';
import { ApplicationPackageGenerator } from './ApplicationPackageGenerator';

interface ApplicationMaterialsTabProps {
  jobId: string | undefined;
}

interface UploadedMaterial {
  id: string;
  file_name: string;
  version_name: string;
  file_url: string;
  material_type: 'resume' | 'cover_letter';
  is_default: boolean;
  created_at: string;
}

interface AppResume {
  id: string;
  resume_name: string;
  version_number: number;
  is_default: boolean;
}

export function ApplicationMaterialsTab({ jobId }: ApplicationMaterialsTabProps) {
  const navigate = useNavigate();
  const [uploadedResumes, setUploadedResumes] = useState<UploadedMaterial[]>([]);
  const [uploadedCoverLetters, setUploadedCoverLetters] = useState<UploadedMaterial[]>([]);
  const [appResumes, setAppResumes] = useState<AppResume[]>([]);
  const [linkedResumeId, setLinkedResumeId] = useState<string>('');
  const [linkedCoverLetterId, setLinkedCoverLetterId] = useState<string>('');
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>(['']);
  const [trackingCoverLetter, setTrackingCoverLetter] = useState<{ id: string } | null>(null);
  const [showPackageGenerator, setShowPackageGenerator] = useState(false);
  const [jobDetails, setJobDetails] = useState<{ title: string; company: string; industry?: string; job_type?: string } | null>(null);
  
  // Upload form states
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeVersionName, setResumeVersionName] = useState('');
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [coverLetterVersionName, setCoverLetterVersionName] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (jobId) {
      fetchAllMaterials();
      fetchLinkedMaterials();
      fetchJobDetails();
    }
  }, [jobId]);

  useEffect(() => {
    if (jobDetails && uploadedResumes.length > 0) {
      checkAndApplyAutomationRules();
    }
  }, [jobDetails, uploadedResumes, uploadedCoverLetters]);

  const fetchJobDetails = async () => {
    if (!jobId) return;
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('job_title, company_name, industry, job_type')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setJobDetails({ 
        title: data.job_title, 
        company: data.company_name,
        industry: data.industry || undefined,
        job_type: data.job_type || undefined
      });
    } catch (error) {
      console.error('Error fetching job details:', error);
    }
  };

  const checkAndApplyAutomationRules = async () => {
    if (!jobDetails || !jobId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if materials are already linked
      const { data: existingPackage } = await supabase
        .from('application_packages')
        .select('*')
        .eq('job_id', jobId)
        .maybeSingle();

      if (existingPackage) {
        // Already has materials, populate the form
        setLinkedResumeId(existingPackage.resume_id || '');
        setLinkedCoverLetterId(existingPackage.cover_letter_id || '');
        setPortfolioLinks(existingPackage.portfolio_urls || ['']);
        return;
      }

      // Fetch active automation rules
      const { data: rules, error: rulesError } = await supabase
        .from('application_automation_rules')
        .select('*')
        .eq('is_active', true);

      if (rulesError || !rules || rules.length === 0) return;

      // Find matching rule
      const matchingRule = rules.find((rule: any) => {
        const conditions = rule.conditions as any;
        const jobTitle = jobDetails.title?.toLowerCase() || '';
        const jobIndustry = jobDetails.industry?.toLowerCase() || '';
        const jobType = jobDetails.job_type?.toLowerCase() || '';
        const ruleJobTitle = conditions.job_title?.toLowerCase() || '';
        const ruleIndustry = conditions.industry?.toLowerCase() || '';
        const ruleJobType = conditions.jobType?.toLowerCase() || '';
        
        const titleMatch = !ruleJobTitle || jobTitle.includes(ruleJobTitle) || ruleJobTitle.includes(jobTitle);
        const industryMatch = !ruleIndustry || jobIndustry.includes(ruleIndustry) || ruleIndustry.includes(jobIndustry);
        const jobTypeMatch = !ruleJobType || jobType.includes(ruleJobType) || ruleJobType.includes(jobType);
        
        return titleMatch && industryMatch && jobTypeMatch;
      });

      if (!matchingRule) return;

      const actions = matchingRule.actions as any;

      // Auto-populate the form with rule-specified materials
      if (actions.resume_id) {
        setLinkedResumeId(actions.resume_id);
      }
      if (actions.cover_letter_id) {
        setLinkedCoverLetterId(actions.cover_letter_id);
      }
      if (actions.portfolio_projects && Array.isArray(actions.portfolio_projects)) {
        setPortfolioLinks(actions.portfolio_projects.length > 0 ? actions.portfolio_projects : ['']);
      }
    } catch (error) {
      console.error('Error checking automation rules:', error);
    }
  };

  const fetchAllMaterials = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch uploaded materials
      const { data: materials, error: materialsError } = await supabase
        .from('application_materials')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (materialsError) throw materialsError;

      setUploadedResumes((materials?.filter(m => m.material_type === 'resume') || []) as UploadedMaterial[]);
      setUploadedCoverLetters((materials?.filter(m => m.material_type === 'cover_letter') || []) as UploadedMaterial[]);

      // Fetch app-created resumes
      const { data: resumes, error: resumesError } = await supabase
        .from('resumes')
        .select('id, resume_name, version_number, is_default')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (resumesError) throw resumesError;
      setAppResumes(resumes || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const fetchLinkedMaterials = async () => {
    if (!jobId) return;
    try {
      // Check application_packages first (includes portfolio)
      const { data: packageData, error: packageError } = await supabase
        .from('application_packages')
        .select('resume_id, cover_letter_id, portfolio_urls')
        .eq('job_id', jobId)
        .maybeSingle();

      if (packageData) {
        setLinkedResumeId(packageData.resume_id || '');
        setLinkedCoverLetterId(packageData.cover_letter_id || '');
        setPortfolioLinks(packageData.portfolio_urls || ['']);
        return;
      }

      // Fallback to job_application_materials (legacy)
      const { data, error } = await supabase
        .from('job_application_materials')
        .select('resume_id, cover_letter_id')
        .eq('job_id', jobId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setLinkedResumeId(data.resume_id || '');
        setLinkedCoverLetterId(data.cover_letter_id || '');
      }
    } catch (error) {
      console.error('Error fetching linked materials:', error);
    }
  };

  const handleUploadResume = async () => {
    if (!resumeFile || !resumeVersionName.trim()) {
      toast.error('Please select a file and enter a version name');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = resumeFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('application-materials')
        .upload(fileName, resumeFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('application-materials')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('application_materials')
        .insert({
          user_id: user.id,
          file_name: resumeFile.name,
          version_name: resumeVersionName,
          file_url: publicUrl,
          material_type: 'resume'
        });

      if (insertError) throw insertError;

      toast.success('Resume uploaded successfully');
      setResumeFile(null);
      setResumeVersionName('');
      fetchAllMaterials();
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast.error('Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadCoverLetter = async () => {
    if (!coverLetterFile || !coverLetterVersionName.trim()) {
      toast.error('Please select a file and enter a version name');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = coverLetterFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('application-materials')
        .upload(fileName, coverLetterFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('application-materials')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('application_materials')
        .insert({
          user_id: user.id,
          file_name: coverLetterFile.name,
          version_name: coverLetterVersionName,
          file_url: publicUrl,
          material_type: 'cover_letter'
        });

      if (insertError) throw insertError;

      toast.success('Cover letter uploaded successfully');
      setCoverLetterFile(null);
      setCoverLetterVersionName('');
      fetchAllMaterials();
    } catch (error) {
      console.error('Error uploading cover letter:', error);
      toast.error('Failed to upload cover letter');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleDefault = async (materialId: string, materialType: 'resume' | 'cover_letter', currentDefault: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // If setting as default, unset all others of same type first
      if (!currentDefault) {
        await supabase
          .from('application_materials')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('material_type', materialType);
      }

      const { error } = await supabase
        .from('application_materials')
        .update({ is_default: !currentDefault })
        .eq('id', materialId);

      if (error) throw error;
      toast.success(currentDefault ? 'Default removed' : 'Set as default');
      fetchAllMaterials();
    } catch (error) {
      console.error('Error toggling default:', error);
      toast.error('Failed to update default status');
    }
  };

  const handleDelete = async (materialId: string, fileUrl: string) => {
    try {
      const filePath = fileUrl.split('/application-materials/')[1];
      
      await supabase.storage.from('application-materials').remove([filePath]);
      
      const { error } = await supabase
        .from('application_materials')
        .delete()
        .eq('id', materialId);

      if (error) throw error;
      toast.success('Material deleted');
      fetchAllMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('Failed to delete material');
    }
  };

  const handleLinkMaterials = async () => {
    console.log('handleLinkMaterials called', {
      jobId,
      linkedResumeId,
      linkedCoverLetterId,
      portfolioLinks
    });

    if (!jobId || (!linkedResumeId && !linkedCoverLetterId && portfolioLinks.filter(l => l && l.trim()).length === 0)) {
      console.log('Validation failed - no materials selected');
      toast.error('Please select at least one material to link');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('User authenticated, proceeding with link', user.id);

      const filteredPortfolioLinks = portfolioLinks.filter(link => link && link.trim() !== '');

      // Use application_packages for full package including portfolio
      const { data: existing } = await supabase
        .from('application_packages')
        .select('id')
        .eq('job_id', jobId)
        .maybeSingle();

      console.log('Existing package check:', existing);

      if (existing) {
        const { error } = await supabase
          .from('application_packages')
          .update({
            resume_id: linkedResumeId || null,
            cover_letter_id: linkedCoverLetterId || null,
            portfolio_urls: filteredPortfolioLinks,
            package_status: 'draft'
          })
          .eq('job_id', jobId);

        if (error) {
          console.error('Update error:', error);
          toast.error(`Database error: ${error.message}`);
          throw error;
        }
        console.log('Package updated successfully');
      } else {
        const { error } = await supabase
          .from('application_packages')
          .insert({
            job_id: jobId,
            user_id: user.id,
            resume_id: linkedResumeId || null,
            cover_letter_id: linkedCoverLetterId || null,
            portfolio_urls: filteredPortfolioLinks,
            package_status: 'draft'
          });

        if (error) {
          console.error('Insert error:', error);
          toast.error(`Database error: ${error.message}`);
          throw error;
        }
        console.log('Package inserted successfully');
      }

      toast.success('Materials linked successfully');
      fetchLinkedMaterials();
    } catch (error: any) {
      console.error('Error linking materials:', error);
      toast.error(error.message || 'Failed to link materials');
    }
  };

  const handleAddPortfolioLink = () => {
    setPortfolioLinks([...portfolioLinks, '']);
  };

  const handleRemovePortfolioLink = (index: number) => {
    setPortfolioLinks(portfolioLinks.filter((_, i) => i !== index));
  };

  const handlePortfolioLinkChange = (index: number, value: string) => {
    const newLinks = [...portfolioLinks];
    newLinks[index] = value;
    setPortfolioLinks(newLinks);
  };

  return (
    <div className="space-y-8 py-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Application Materials</h2>
          <p className="text-muted-foreground mt-1">
            Manage resumes, cover letters, and portfolio links for this job application
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/cover-letters?tab=performance')}
          className="gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          View Performance Analytics
        </Button>
      </div>

      {/* Generate Package Button */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Auto-Generate Application Package</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Let AI automatically select or create the best resume, generate a tailored cover letter, and gather relevant portfolio links for this position.
              </p>
              <Button 
                onClick={() => setShowPackageGenerator(true)}
                disabled={!jobDetails}
                size="lg"
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Generate Application Package
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumes Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Resumes</h2>
        
        {/* Upload Resume Form */}
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold">Upload Resume</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="resume-file">Choose File</Label>
              <Input
                id="resume-file"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <Label htmlFor="resume-version">Version Name</Label>
              <Input
                id="resume-version"
                placeholder="e.g., Software Engineer v2.3"
                value={resumeVersionName}
                onChange={(e) => setResumeVersionName(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleUploadResume} 
              disabled={uploading || !resumeFile || !resumeVersionName}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Resume
            </Button>
          </div>
        </Card>

        {/* Uploaded Resumes List */}
        {uploadedResumes.filter(resume => linkedResumeId === resume.id).map((resume) => (
          <Card key={resume.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{resume.version_name}</p>
                  <p className="text-sm text-muted-foreground truncate">{resume.file_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    setLinkedResumeId('');
                    // Save the unlink immediately
                    try {
                      const { data: existing } = await supabase
                        .from('application_packages')
                        .select('id')
                        .eq('job_id', jobId)
                        .maybeSingle();

                      if (existing) {
                        await supabase
                          .from('application_packages')
                          .update({ resume_id: null })
                          .eq('job_id', jobId);
                      }

                      // Also check job_application_materials
                      const { data: jamData } = await supabase
                        .from('job_application_materials')
                        .select('*')
                        .eq('job_id', jobId)
                        .maybeSingle();

                      if (jamData) {
                        if (jamData.cover_letter_id) {
                            await supabase
                              .from('job_application_materials')
                              .update({ resume_id: null })
                              .eq('job_id', jobId);
                          } else {
                            await supabase
                              .from('job_application_materials')
                              .delete()
                              .eq('job_id', jobId);
                          }
                        }

                        toast.success('Resume unlinked from this job');
                        fetchLinkedMaterials();
                      } catch (error) {
                        console.error('Error unlinking resume:', error);
                        toast.error('Failed to unlink resume');
                      }
                    }}
                  >
                    Unlink from Job
                  </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open(resume.file_url, '_blank')}
                >
                  <Download className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {/* App-created resumes info */}
        {appResumes.length > 0 && (
          <Card className="p-4 bg-muted/50">
            <p className="text-sm text-muted-foreground">
              💡 You have {appResumes.length} resume(s) created in the Resume Builder. You can link them below.
            </p>
          </Card>
        )}
      </div>

      <Separator />

      {/* Cover Letters Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Cover Letters</h2>
          <Button onClick={() => navigate(`/cover-letters?jobId=${jobId}`)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate with AI
          </Button>
        </div>
        
        {/* Upload Cover Letter Form */}
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold">Upload Cover Letter</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="cover-letter-file">Choose File</Label>
              <Input
                id="cover-letter-file"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setCoverLetterFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <Label htmlFor="cover-letter-version">Version Name</Label>
              <Input
                id="cover-letter-version"
                placeholder="e.g., Tech Company Template v1.0"
                value={coverLetterVersionName}
                onChange={(e) => setCoverLetterVersionName(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleUploadCoverLetter} 
              disabled={uploading || !coverLetterFile || !coverLetterVersionName}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Cover Letter
            </Button>
          </div>
        </Card>

        {/* Uploaded Cover Letters List */}
        {uploadedCoverLetters.filter(letter => linkedCoverLetterId === letter.id).map((letter) => (
          <Card key={letter.id} className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{letter.version_name}</p>
                    <p className="text-sm text-muted-foreground truncate">{letter.file_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      setLinkedCoverLetterId('');
                      // Save the unlink immediately
                      try {
                        const { data: existing } = await supabase
                          .from('application_packages')
                          .select('id')
                          .eq('job_id', jobId)
                          .maybeSingle();

                        if (existing) {
                          await supabase
                            .from('application_packages')
                            .update({ cover_letter_id: null })
                            .eq('job_id', jobId);
                        }

                        // Also check job_application_materials
                        const { data: jamData } = await supabase
                          .from('job_application_materials')
                          .select('*')
                          .eq('job_id', jobId)
                          .maybeSingle();

                        if (jamData) {
                          if (jamData.resume_id) {
                            await supabase
                              .from('job_application_materials')
                              .update({ cover_letter_id: null })
                              .eq('job_id', jobId);
                          } else {
                            await supabase
                              .from('job_application_materials')
                              .delete()
                              .eq('job_id', jobId);
                          }
                        }

                        toast.success('Cover letter unlinked from this job');
                        fetchLinkedMaterials();
                      } catch (error) {
                        console.error('Error unlinking cover letter:', error);
                        toast.error('Failed to unlink cover letter');
                      }
                    }}
                  >
                    Unlink from Job
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(letter.file_url, '_blank')}
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTrackingCoverLetter({ id: letter.id })}
                className="w-full gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Track Performance
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Link Materials to Job Section */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Link Materials to This Job</h2>
            <p className="text-sm text-muted-foreground mt-1">
              After linking, click "Track Performance" on your cover letter to record responses and outcomes
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Resume</Label>
            <div className="flex gap-2">
              <Select value={linkedResumeId} onValueChange={setLinkedResumeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select resume" />
                </SelectTrigger>
                <SelectContent>
                  {uploadedResumes.map((resume) => (
                    <SelectItem key={resume.id} value={resume.id}>
                      {resume.version_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {linkedResumeId && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={async () => {
                    setLinkedResumeId('');
                    // Update database
                    const { data: existing } = await supabase
                      .from('application_packages')
                      .select('id, cover_letter_id')
                      .eq('job_id', jobId)
                      .maybeSingle();
                    
                    if (existing) {
                      if (existing.cover_letter_id) {
                        await supabase
                          .from('application_packages')
                          .update({ resume_id: null })
                          .eq('job_id', jobId);
                      } else {
                        await supabase
                          .from('application_packages')
                          .delete()
                          .eq('job_id', jobId);
                      }
                    }
                    
                    const { data: jamData } = await supabase
                      .from('job_application_materials')
                      .select('*')
                      .eq('job_id', jobId)
                      .maybeSingle();
                    
                    if (jamData) {
                      if (jamData.cover_letter_id) {
                        await supabase
                          .from('job_application_materials')
                          .update({ resume_id: null })
                          .eq('job_id', jobId);
                      } else {
                        await supabase
                          .from('job_application_materials')
                          .delete()
                          .eq('job_id', jobId);
                      }
                    }
                    
                    toast.success('Resume unlinked from this job');
                    fetchLinkedMaterials();
                  }}
                  title="Unlink resume"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {appResumes.length > 0 && uploadedResumes.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                💡 To link app-created resumes, first export them using the Resume page, then upload them here.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Cover Letter</Label>
            <div className="flex gap-2">
              <Select value={linkedCoverLetterId} onValueChange={setLinkedCoverLetterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cover letter" />
                </SelectTrigger>
                <SelectContent>
                  {uploadedCoverLetters.map((letter) => (
                    <SelectItem key={letter.id} value={letter.id}>
                      {letter.version_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {linkedCoverLetterId && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={async () => {
                    setLinkedCoverLetterId('');
                    // Update database
                    const { data: existing } = await supabase
                      .from('application_packages')
                      .select('id, resume_id')
                      .eq('job_id', jobId)
                      .maybeSingle();
                    
                    if (existing) {
                      if (existing.resume_id) {
                        await supabase
                          .from('application_packages')
                          .update({ cover_letter_id: null })
                          .eq('job_id', jobId);
                      } else {
                        await supabase
                          .from('application_packages')
                          .delete()
                          .eq('job_id', jobId);
                      }
                    }
                    
                    const { data: jamData } = await supabase
                      .from('job_application_materials')
                      .select('*')
                      .eq('job_id', jobId)
                      .maybeSingle();
                    
                    if (jamData) {
                      if (jamData.resume_id) {
                        await supabase
                          .from('job_application_materials')
                          .update({ cover_letter_id: null })
                          .eq('job_id', jobId);
                      } else {
                        await supabase
                          .from('job_application_materials')
                          .delete()
                          .eq('job_id', jobId);
                      }
                    }
                    
                    toast.success('Cover letter unlinked from this job');
                    fetchLinkedMaterials();
                  }}
                  title="Unlink cover letter"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Portfolio Projects</Label>
            <div className="space-y-2">
              {portfolioLinks.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://github.com/username/project"
                    value={link}
                    onChange={(e) => handlePortfolioLinkChange(index, e.target.value)}
                  />
                  {portfolioLinks.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePortfolioLink(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddPortfolioLink}
                className="w-full"
              >
                + Add Portfolio Link
              </Button>
            </div>
          </div>

          <Button onClick={handleLinkMaterials} className="w-full">
            Link Materials to Job
          </Button>
        </div>

        {/* Empty State */}
        {uploadedResumes.length === 0 && uploadedCoverLetters.length === 0 && appResumes.length === 0 && (
          <Card className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">No materials uploaded yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your resume and cover letter to track which versions you use for each application
            </p>
            <Button variant="outline" asChild>
              <a href="/resumes">
                <ExternalLink className="h-4 w-4 mr-2" />
                Create Resume in App
              </a>
            </Button>
          </Card>
        )}
      </div>

      <TrackCoverLetterDialog
        open={!!trackingCoverLetter}
        onOpenChange={(open) => !open && setTrackingCoverLetter(null)}
        materialId={trackingCoverLetter?.id}
        jobId={jobId}
        onSuccess={fetchAllMaterials}
      />

      {jobDetails && jobId && (
        <ApplicationPackageGenerator
          open={showPackageGenerator}
          onOpenChange={setShowPackageGenerator}
          jobId={jobId}
          jobTitle={jobDetails.title}
          companyName={jobDetails.company}
          onPackageAdded={(resumeId, coverLetterId, portfolioLinks) => {
            setLinkedResumeId(resumeId);
            setLinkedCoverLetterId(coverLetterId);
            setPortfolioLinks(portfolioLinks.length > 0 ? portfolioLinks : ['']);
          }}
        />
      )}
    </div>
  );
}
