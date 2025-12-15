import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, FileText, Mail, Github, Globe, Download, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

interface ApplicationPackageGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
  companyName: string;
  onPackageAdded?: (resumeId: string, coverLetterId: string, portfolioLinks: string[]) => void;
}

interface GeneratedPackage {
  resume: { id: string; name: string; file_url: string } | null;
  coverLetter: { id: string; name: string; file_url: string } | null;
  portfolio: string[];
  status: 'generating' | 'ready' | 'error';
}

export function ApplicationPackageGenerator({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  companyName,
  onPackageAdded
}: ApplicationPackageGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [generatedPackage, setGeneratedPackage] = useState<GeneratedPackage | null>(null);
  const [job, setJob] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [automationRules, setAutomationRules] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      fetchJobDetails();
      fetchUserProfile();
      fetchAutomationRules();
    }
  }, [open, jobId]);

  const fetchJobDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs' as any)
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setJob(data);
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error('Failed to load job details');
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_profiles' as any)
        .select(`
          *,
          employment_history(*),
          education(*),
          skills(*),
          certifications(*),
          projects(*)
        `)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchAutomationRules = async () => {
    try {
      const { data, error } = await supabase
        .from('application_automation_rules' as any)
        .select('*')
        .eq('rule_type', 'package_generation')
        .eq('is_active', true);

      if (error) throw error;
      setAutomationRules(data || []);
    } catch (error) {
      console.error('Error fetching automation rules:', error);
    }
  };

  const generatePackage = async () => {
    setLoading(true);
    setGeneratedPackage({
      resume: null,
      coverLetter: null,
      portfolio: [],
      status: 'generating'
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Match automation rules to this job - strict matching on ALL conditions
      const matchingRule = (automationRules as any[]).find((rule: any) => {
        const conditions = rule.conditions as any;
        const jobIndustry = job?.industry?.toLowerCase().trim() || '';
        const jobType = job?.job_type?.toLowerCase().trim() || '';
        const ruleIndustry = conditions.industry?.toLowerCase().trim() || '';
        const ruleJobType = conditions.jobType?.toLowerCase().trim() || '';
        
        // ALL specified conditions must match exactly
        const industryMatch = !ruleIndustry || jobIndustry === ruleIndustry;
        const jobTypeMatch = !ruleJobType || jobType === ruleJobType;
        
        return industryMatch && jobTypeMatch;
      });

      // Step 1: Find or generate the right resume
      const resume = await selectOrGenerateResume(user.id, matchingRule);
      
      // Step 2: Generate cover letter
      const coverLetter = await generateCoverLetter(user.id, matchingRule);
      
      // Step 3: Assemble portfolio links
      const portfolio = await assemblePortfolio(user.id, matchingRule);

      // Step 4: Save the package (only if we have at least a resume or cover letter)
      if (resume || coverLetter) {
        await saveApplicationPackage(user.id, resume, coverLetter, portfolio);
      }

      setGeneratedPackage({
        resume,
        coverLetter,
        portfolio,
        status: 'ready'
      });

      if (matchingRule) {
        toast.success(`Application package assembled using rule: ${matchingRule.rule_name}`);
      } else {
        toast.success('No automation rules matched, but we assembled a recommended package from your materials!');
      }
    } catch (error: any) {
      console.error('Error generating package:', error);
      setGeneratedPackage(prev => prev ? { ...prev, status: 'error' } : null);
      toast.error(error.message || 'Failed to generate application package');
    } finally {
      setLoading(false);
    }
  };

  const selectOrGenerateResume = async (userId: string, matchingRule?: any) => {
    // If there's a matching rule with a resume_id, use it
    if (matchingRule?.actions?.resume_id) {
      const { data: ruleMaterial, error: ruleError } = await supabase
        .from('application_materials' as any)
        .select('*')
        .eq('id', matchingRule.actions.resume_id)
        .eq('material_type', 'resume')
        .single();

      if (!ruleError && ruleMaterial) {
        return {
          id: (ruleMaterial as any).id,
          name: (ruleMaterial as any).file_name,
          file_url: (ruleMaterial as any).file_url
        };
      }
    }

    // Otherwise check for existing default resume
    const { data: existingMaterial, error: existingError } = await supabase
      .from('application_materials' as any)
      .select('*')
      .eq('user_id', userId)
      .eq('material_type', 'resume')
      .eq('is_default', true)
      .single();

    if (!existingError && existingMaterial) {
      return {
        id: (existingMaterial as any).id,
        name: (existingMaterial as any).file_name,
        file_url: (existingMaterial as any).file_url
      };
    }

    // If no default, get any resume from the user
    const { data: anyResume, error: anyError } = await supabase
      .from('application_materials' as any)
      .select('*')
      .eq('user_id', userId)
      .eq('material_type', 'resume')
      .limit(1)
      .single();

    if (!anyError && anyResume) {
      return {
        id: (anyResume as any).id,
        name: (anyResume as any).file_name,
        file_url: (anyResume as any).file_url
      };
    }

    // No resume available
    return null;
  };

  const generateCoverLetter = async (userId: string, matchingRule?: any) => {
    // If there's a matching rule with a cover_letter_id, use it
    if (matchingRule?.actions?.cover_letter_id) {
      const { data: coverLetterMaterial, error: coverLetterError } = await supabase
        .from('application_materials' as any)
        .select('*')
        .eq('id', matchingRule.actions.cover_letter_id)
        .eq('material_type', 'cover_letter')
        .single();

      if (!coverLetterError && coverLetterMaterial) {
        return {
          id: (coverLetterMaterial as any).id,
          name: (coverLetterMaterial as any).file_name,
          file_url: (coverLetterMaterial as any).file_url
        };
      }
    }

    // Check for default cover letter
    const { data: defaultCL, error: defaultError } = await supabase
      .from('application_materials' as any)
      .select('*')
      .eq('user_id', userId)
      .eq('material_type', 'cover_letter')
      .eq('is_default', true)
      .single();

    if (!defaultError && defaultCL) {
      return {
        id: (defaultCL as any).id,
        name: (defaultCL as any).file_name,
        file_url: (defaultCL as any).file_url
      };
    }

    // Get any cover letter
    const { data: anyCL, error: anyError } = await supabase
      .from('application_materials' as any)
      .select('*')
      .eq('user_id', userId)
      .eq('material_type', 'cover_letter')
      .limit(1)
      .single();

    if (!anyError && anyCL) {
      return {
        id: (anyCL as any).id,
        name: (anyCL as any).file_name,
        file_url: (anyCL as any).file_url
      };
    }

    return null;
  };

  const assemblePortfolio = async (userId: string, matchingRule?: any) => {
    const portfolioLinks: string[] = [];

    if (matchingRule?.actions?.portfolio_projects) {
      return matchingRule.actions.portfolio_projects as string[];
    }

    // Auto-select relevant projects based on job description
    if (userProfile?.projects) {
      const relevantProjects = userProfile.projects
        .filter((project: any) => {
          // Match project technologies or industry with job
          const jobIndustry = job?.industry?.toLowerCase() || '';
          const jobDescription = job?.job_description?.toLowerCase() || '';
          const projectIndustry = project.industry?.toLowerCase() || '';
          const projectTechnologies = (project.technologies || []).join(' ').toLowerCase();

          return jobIndustry.includes(projectIndustry) || 
                 jobDescription.includes(projectTechnologies) ||
                 projectIndustry.includes(jobIndustry);
        })
        .slice(0, 3); // Top 3 relevant projects

      relevantProjects.forEach((project: any) => {
        if (project.project_url) portfolioLinks.push(project.project_url);
        if (project.repository_link) portfolioLinks.push(project.repository_link);
      });
    }

    return portfolioLinks;
  };

  const saveApplicationPackage = async (
    userId: string,
    resume: any,
    coverLetter: any,
    portfolio: string[]
  ) => {
    const { error } = await supabase
      .from('application_packages' as any)
      .insert({
        job_id: jobId,
        user_id: userId,
        resume_id: resume?.id || null,
        cover_letter_id: coverLetter?.id || null,
        portfolio_urls: portfolio,
        package_status: 'ready'
      });

    if (error) throw error;
  };

  const addPackage = () => {
    if (!generatedPackage) return;
    
    const resumeId = generatedPackage.resume?.id || '';
    const coverLetterId = generatedPackage.coverLetter?.id || '';
    const portfolioLinks = generatedPackage.portfolio || [];
    
    if (onPackageAdded) {
      onPackageAdded(resumeId, coverLetterId, portfolioLinks);
    }
    
    toast.success('Package added to materials!');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Application Package for {jobTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!generatedPackage ? (
            <Card>
              <CardHeader>
                <CardTitle>Generate Your Application Package</CardTitle>
                <CardDescription>
                  We'll automatically select or create the best resume, generate a tailored cover letter,
                  and assemble your relevant portfolio items for this position at {companyName}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Resume Selection</p>
                      <p className="text-sm text-muted-foreground">
                        Choose the most relevant resume version or generate a tailored one
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Cover Letter Generation</p>
                      <p className="text-sm text-muted-foreground">
                        Create a personalized cover letter using job details and your profile
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Globe className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Portfolio Assembly</p>
                      <p className="text-sm text-muted-foreground">
                        Select relevant projects, GitHub repos, and portfolio links
                      </p>
                    </div>
                  </div>
                </div>

                <Button onClick={generatePackage} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Package...
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4 mr-2" />
                      Generate Application Package
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {generatedPackage.status === 'generating' && (
                <Card className="border-primary/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-lg">Generating your application package...</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {generatedPackage.status === 'ready' && (
                <>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="font-semibold">Package Ready!</p>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Resume
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {generatedPackage.resume ? (
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{generatedPackage.resume.name}</p>
                            <p className="text-sm text-muted-foreground">PDF Document</p>
                          </div>
                          <Badge variant="secondary">Selected</Badge>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No resume available</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Cover Letter
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {generatedPackage.coverLetter ? (
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{generatedPackage.coverLetter.name}</p>
                            <p className="text-sm text-muted-foreground">PDF Document</p>
                          </div>
                          <Badge variant="secondary">Selected</Badge>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No cover letter available</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Portfolio Links
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {generatedPackage.portfolio.length > 0 ? (
                        <div className="space-y-2">
                          {generatedPackage.portfolio.map((link, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                              <Github className="h-4 w-4 text-muted-foreground" />
                              <a 
                                href={link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline truncate flex-1"
                              >
                                {link}
                              </a>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No portfolio links available</p>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {generatedPackage.status === 'error' && (
                <Card className="border-destructive">
                  <CardContent className="pt-6">
                    <p className="text-center text-destructive">
                      Failed to generate package. Please try again.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {generatedPackage?.status === 'ready' && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={addPackage}>
              <Package className="h-4 w-4 mr-2" />
              Add Package
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
