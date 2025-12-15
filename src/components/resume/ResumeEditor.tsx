import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Palette, Sparkles, Loader2, RefreshCw, LayoutList, Check, AlertCircle, Eye, MessageSquare, Edit2, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResumeSectionCustomizer, ResumeSection } from "@/components/resume/ResumeSectionCustomizer";
import SkillsOptimization from "@/components/resume/SkillsOptimization";
import { ExperienceTailoring } from "@/components/resume/ExperienceTailoring";
import { SavedTailoredVersions } from "@/components/resume/SavedTailoredVersions";
import { ResumeExport } from "@/components/resume/ResumeExport";
import { ResumeValidation } from "@/components/resume/ResumeValidation";
import { ResumePreviewPanel } from "@/components/resume/ResumePreviewPanel";
import { ResumeFeedbackPanel } from "@/components/resume/ResumeFeedbackPanel";
import { SkillGapAnalysisDialog } from "@/components/resume/SkillGapAnalysisDialog";

interface ResumeEditorProps {
  userId: string;
  resumeId: string | null;
  onSave: () => void;
}

export const ResumeEditor = ({ userId, resumeId, onSave }: ResumeEditorProps) => {
  const { theme: currentTheme } = useTheme();
  const [resumeName, setResumeName] = useState("");
  const [isRenamingResume, setIsRenamingResume] = useState(false);
  const [newResumeName, setNewResumeName] = useState("");
  const [template, setTemplate] = useState<any>(null);
  const [content, setContent] = useState<any>({});
  const [customization, setCustomization] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiContent, setAiContent] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [sections, setSections] = useState<ResumeSection[]>([]);
  const [aiVariations, setAiVariations] = useState<any[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<number>(0);
  const [savedVersionsRefreshFn, setSavedVersionsRefreshFn] = useState<(() => void) | null>(null);
  const [shareId, setShareId] = useState<string>("");
  const [feedbackCount, setFeedbackCount] = useState<number>(0);
  const [autoRunAI, setAutoRunAI] = useState(false);
  const [showSkillGapDialog, setShowSkillGapDialog] = useState(false);

  useEffect(() => {
    if (resumeId) {
      fetchResume();
      fetchShareInfo();
      fetchLinkedJob();
    }
    fetchJobs();
    fetchUserProfile();
  }, [resumeId]);

  const fetchLinkedJob = async () => {
    if (!resumeId) return;
    
    try {
      const { data, error } = await supabase
        .from("job_application_materials")
        .select(`
          job_id,
          jobs!inner (
            id,
            job_description
          )
        `)
        .eq("resume_id", resumeId)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      // Auto-select the linked job if found
      if (data?.job_id) {
        setSelectedJobId(data.job_id);
      }
    } catch (error) {
      console.error("Error fetching linked job:", error);
    }
  };

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, job_title, company_name, job_description")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      console.error("Failed to load jobs:", error);
    }
  };

  const fetchShareInfo = async () => {
    if (!resumeId) return;
    
    try {
      const { data: shareData, error: shareError } = await (supabase as any)
        .from("resume_shares")
        .select("id")
        .eq("resume_id", resumeId)
        .eq("is_active", true)
        .maybeSingle();

      if (shareError && shareError.code !== 'PGRST116') throw shareError;
      
      if (shareData) {
        setShareId(shareData.id);
      }
      
      // Fetch feedback count for this resume (all feedback)
      const { count, error: countError } = await (supabase as any)
        .from("resume_feedback")
        .select("*", { count: 'exact', head: true })
        .eq("resume_id", resumeId);

      if (!countError && count) {
        setFeedbackCount(count);
      }
    } catch (error) {
      console.error("Error fetching share info:", error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const [profileRes, employmentRes, skillsRes, educationRes, certificationsRes, projectsRes] = await Promise.all([
        supabase.from("user_profiles").select("*").eq("user_id", userId).single(),
        supabase.from("employment_history").select("*").eq("user_id", userId),
        supabase.from("skills").select("*").eq("user_id", userId),
        supabase.from("education").select("*").eq("user_id", userId),
        supabase.from("certifications").select("*").eq("user_id", userId),
        supabase.from("projects").select("*").eq("user_id", userId),
      ]);

      const profileData = {
        ...profileRes.data,
        employment_history: employmentRes.data || [],
        skills: skillsRes.data || [],
        education: educationRes.data || [],
        certifications: certificationsRes.data || [],
        projects: projectsRes.data || [],
      };

      setUserProfile(profileData);
      
      // Update section completion status based on actual data
      updateSectionCompletionStatus(profileData);
    } catch (error: any) {
      console.error("Failed to load user profile:", error);
    }
  };

  const updateSectionCompletionStatus = (profile: any) => {
    setSections((prevSections) => {
      if (prevSections.length === 0) return prevSections;
      
      return prevSections.map((section) => {
        let isComplete = false;
        
        switch (section.id) {
          case "summary":
            isComplete = !!(profile?.bio || profile?.headline);
            break;
          case "experience":
            isComplete = profile?.employment_history?.length > 0;
            break;
          case "education":
            isComplete = profile?.education?.length > 0;
            break;
          case "skills":
            isComplete = profile?.skills?.length > 0;
            break;
          case "projects":
            isComplete = profile?.projects?.length > 0;
            break;
          case "certifications":
            isComplete = profile?.certifications?.length > 0;
            break;
          default:
            isComplete = section.isComplete || false;
        }
        
        return { ...section, isComplete };
      });
    });
  };

  const fetchResume = async () => {
    if (!resumeId) return;

    try {
      const { data, error } = await supabase
        .from("resumes")
        .select(`
          *,
          resume_templates (*)
        `)
        .eq("id", resumeId)
        .single();

      if (error) throw error;

      setResumeName(data.resume_name);
      const resumeContent = data.content || {};
      setContent(resumeContent);
      setCustomization(data.customization_overrides || {});
      setTemplate(data.resume_templates);
      // Type assertion for aiGenerated field
      setAiContent((resumeContent as any)?.aiGenerated || null);
      // Load AI variations if they exist
      if ((resumeContent as any)?.aiVariations) {
        setAiVariations((resumeContent as any).aiVariations);
        setSelectedVariation((resumeContent as any)?.selectedVariation || 0);
      }
      // Load sections if they exist in content, otherwise use default sections
      if ((resumeContent as any)?.sections && (resumeContent as any).sections.length > 0) {
        setSections((resumeContent as any).sections);
      } else {
        // Initialize with default sections from ResumeSectionCustomizer
        const defaultSections = [
          { id: "summary", name: "Professional Summary", enabled: true, order: 0, isComplete: false },
          { id: "experience", name: "Work Experience", enabled: true, order: 1, isComplete: false, requiredForJobTypes: ["all"] },
          { id: "education", name: "Education", enabled: true, order: 2, isComplete: false, requiredForJobTypes: ["all"] },
          { id: "skills", name: "Skills", enabled: true, order: 3, isComplete: false, requiredForJobTypes: ["technical", "creative"] },
          { id: "projects", name: "Projects", enabled: true, order: 4, isComplete: false, requiredForJobTypes: ["technical"] },
          { id: "certifications", name: "Certifications", enabled: true, order: 5, isComplete: false, requiredForJobTypes: ["technical", "professional"] },
        ];
        setSections(defaultSections);
      }
    } catch (error: any) {
      toast.error("Failed to load resume");
      console.error(error);
    }
  };

  const handleGenerateAIContent = async (regenerate: boolean = false) => {
    if (!selectedJobId) {
      toast.error("Please select a job posting");
      return;
    }

    if (!userProfile) {
      toast.error("User profile not loaded");
      return;
    }

    const selectedJob = jobs.find(j => j.id === selectedJobId);
    if (!selectedJob?.job_description) {
      toast.error("Selected job has no description");
      return;
    }

    setAiGenerating(true);
    const loadingToast = toast.loading("Generating AI content...");
    
    try {
      // Step 1: Generate main resume content
      toast.loading("Generating resume content and variations...", { id: loadingToast });
      
      const { data, error } = await supabase.functions.invoke("generate-resume-content", {
        body: {
          jobDescription: selectedJob.job_description,
          userProfile,
          resumeType: template?.template_type || "chronological",
          variationCount: 3,
        },
      });

      if (error) throw error;

      // Handle variations from API
      const newVariations = data.variations || [];
      if (newVariations.length === 0) {
        throw new Error("No variations generated");
      }
      
      // Store all variations
      if (regenerate) {
        setAiVariations([...aiVariations, ...newVariations]);
        setSelectedVariation(aiVariations.length);
      } else {
        setAiVariations(newVariations);
        setSelectedVariation(0);
      }
      
      const firstVariation = regenerate ? newVariations[0] : newVariations[0];
      setAiContent(firstVariation);
      const allVariations = regenerate ? [...aiVariations, ...newVariations] : newVariations;
      const currentIndex = regenerate ? aiVariations.length : 0;
      
      setContent({
        ...content,
        summary: firstVariation.professionalSummary,
        aiGenerated: firstVariation,
        aiVariations: allVariations,
        selectedVariation: currentIndex,
        tailoredFor: selectedJob.job_title,
      });
      
      toast.success(
        regenerate 
          ? `${newVariations.length} new variations generated!` 
          : `Resume content generated! Now optimizing skills and tailoring experience...`, 
        { id: loadingToast }
      );
      
      // Step 2: Trigger auto-optimization for skills and experience tailoring
      // This will run automatically via the autoRunAI prop
      setAutoRunAI(true);
      setTimeout(() => {
        setAutoRunAI(false);
        toast.success("All AI optimizations complete!", { duration: 3000 });
        // Show skill gap analysis after AI generation completes
        setShowSkillGapDialog(true);
      }, 2000); // Give time for components to process
      
    } catch (error: any) {
      toast.dismiss(loadingToast);
      if (error.message?.includes('Rate limit')) {
        toast.error("Rate limit exceeded. Please try again later.");
      } else if (error.message?.includes('credits')) {
        toast.error("AI credits exhausted. Please add credits to continue.");
      } else {
        toast.error(error.message || "Failed to generate AI content");
      }
      console.error(error);
    } finally {
      setAiGenerating(false);
    }
  };

  const applyAISuggestion = (field: string, value: string) => {
    setContent({ ...content, [field]: value });
    toast.success("Applied AI suggestion");
  };

  const addSkillToResume = (skill: string) => {
    console.log('Adding skill:', skill);
    console.log('Current content:', content);
    const currentSkills = Array.isArray(content.skills) ? content.skills : [];
    console.log('Current skills:', currentSkills);
    
    if (!currentSkills.includes(skill)) {
      const updatedSkills = [...currentSkills, skill];
      const updatedContent = { ...content, skills: updatedSkills };
      console.log('Updated content:', updatedContent);
      setContent(updatedContent);
      toast.success(`Added "${skill}" to your resume skills`);
    } else {
      toast.info(`"${skill}" is already in your resume`);
    }
  };

  const addAllRecommendedSkills = () => {
    console.log('Adding all recommended skills');
    console.log('AI Content:', aiContent);
    
    if (!aiContent?.recommendedSkills) {
      toast.error("No recommended skills available");
      return;
    }
    
    const currentSkills = Array.isArray(content.skills) ? content.skills : [];
    const newSkills = aiContent.recommendedSkills.filter((skill: string) => !currentSkills.includes(skill));
    
    console.log('Current skills:', currentSkills);
    console.log('New skills to add:', newSkills);
    
    if (newSkills.length > 0) {
      const updatedSkills = [...currentSkills, ...newSkills];
      const updatedContent = { ...content, skills: updatedSkills };
      console.log('Updated content:', updatedContent);
      setContent(updatedContent);
      toast.success(`Added ${newSkills.length} new skill(s) to your resume`);
    } else {
      toast.info("All recommended skills are already in your resume");
    }
  };

  const handleRenameResume = async () => {
    if (!resumeId || !newResumeName.trim()) return;
    
    try {
      const { error } = await supabase
        .from("resumes")
        .update({ resume_name: newResumeName.trim() })
        .eq("id", resumeId);

      if (error) throw error;

      setResumeName(newResumeName.trim());
      setIsRenamingResume(false);
      toast.success("Resume renamed successfully");
    } catch (error: any) {
      toast.error("Failed to rename resume");
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!resumeId) {
      toast.error("No resume selected");
      return;
    }

    setLoading(true);
    try {
      // Ensure sections are included in the content being saved
      const contentToSave = {
        ...content,
        sections: sections,
      };

      const { error } = await supabase
        .from("resumes")
        .update({
          resume_name: resumeName,
          content: contentToSave,
          customization_overrides: customization,
        })
        .eq("id", resumeId);

      if (error) throw error;

      toast.success("Resume saved successfully");
      onSave();
    } catch (error: any) {
      toast.error("Failed to save resume");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!resumeId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Select a resume to edit or create a new one from templates
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold truncate">{resumeName}</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setNewResumeName(resumeName);
                setIsRenamingResume(true);
              }}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-muted-foreground">Customize your resume content and styling</p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Dialog open={isRenamingResume} onOpenChange={setIsRenamingResume}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Resume</DialogTitle>
            <DialogDescription>
              Enter a new name for your resume
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-resume-name">Resume Name</Label>
              <Input 
                id="new-resume-name" 
                value={newResumeName} 
                onChange={(e) => setNewResumeName(e.target.value)}
                placeholder="Enter resume name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameResume();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenamingResume(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameResume} disabled={!newResumeName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="w-full max-w-full flex flex-col gap-1 md:flex-row md:flex-wrap md:gap-2 md:max-w-none h-auto p-1">
          <TabsTrigger value="preview" className="w-full justify-start md:w-auto md:justify-center">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="ai" className="w-full justify-start md:w-auto md:justify-center">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Generate
          </TabsTrigger>
          <TabsTrigger value="sections" className="w-full justify-start md:w-auto md:justify-center">
            <LayoutList className="h-4 w-4 mr-2" />
            Sections
          </TabsTrigger>
          <TabsTrigger value="content" className="w-full justify-start md:w-auto md:justify-center">
            Content
          </TabsTrigger>
          <TabsTrigger value="export" className="w-full justify-start md:w-auto md:justify-center">
            Export
          </TabsTrigger>
          <TabsTrigger value="feedback" className="w-full justify-start md:w-auto md:justify-center">
            <MessageSquare className="h-4 w-4 mr-2" />
            Feedback
            {feedbackCount > 0 && (
              <Badge variant="secondary" className="ml-2">{feedbackCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-4">
          <ResumeValidation content={content} resumeName={resumeName} />
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI-Powered Resume Content
              </CardTitle>
              <CardDescription>
                Generate tailored resume content, optimize skills, and tailor experience based on job postings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="jobSelect">Select Job Posting</Label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a job to tailor your resume for" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.job_title} at {job.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  Select a job and click Generate - all AI optimizations will run automatically
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleGenerateAIContent(false)}
                  disabled={!selectedJobId || aiGenerating}
                  className="flex-1"
                  size="lg"
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating All Content...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate All AI Content
                    </>
                  )}
                </Button>
                {aiContent && (
                  <Button
                    onClick={() => handleGenerateAIContent(true)}
                    disabled={!selectedJobId || aiGenerating}
                    variant="outline"
                    size="lg"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                )}
                {selectedJobId && (
                  <Button
                    onClick={() => setShowSkillGapDialog(true)}
                    variant="secondary"
                    size="lg"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Skill Gaps
                  </Button>
                )}
              </div>

              {aiContent && (
                <>
                  <Separator className="my-4" />

                  {aiVariations.length > 1 && (
                    <div className="flex items-center gap-2">
                      <Label>Variation:</Label>
                      <Select 
                        value={selectedVariation.toString()} 
                        onValueChange={(value) => {
                          const idx = parseInt(value);
                          setSelectedVariation(idx);
                          const selectedVar = aiVariations[idx];
                          setAiContent(selectedVar);
                          setContent({
                            ...content,
                            aiGenerated: selectedVar,
                            selectedVariation: idx,
                          });
                        }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {aiVariations.map((_, idx) => (
                            <SelectItem key={idx} value={idx.toString()}>
                              Version {idx + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge variant="secondary">{aiVariations.length} variations</Badge>
                    </div>
                  )}
                  
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Generated Content</h3>
                      <Badge>Variation {selectedVariation + 1}</Badge>
                    </div>
                    
                    <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Professional Summary</Label>
                        <Button
                          size="sm"
                          onClick={() => applyAISuggestion("summary", aiContent.professionalSummary)}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          Apply
                        </Button>
                      </div>
                      <div className="p-4 bg-muted rounded-md text-sm leading-relaxed">
                        {aiContent.professionalSummary}
                      </div>
                    </div>

                    {aiContent.atsKeywords?.length > 0 && (
                      <div>
                        <Label className="mb-2 block">ATS Keywords Matched</Label>
                        <div className="flex flex-wrap gap-2">
                          {aiContent.atsKeywords.map((keyword: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-sm px-3 py-1">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiContent.suggestions?.length > 0 && (
                      <div>
                        <Label className="mb-2 block">Suggestions</Label>
                        <ul className="space-y-3">
                          {aiContent.suggestions.map((suggestion: string, idx: number) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-3">
                              <span className="text-primary mt-1">•</span>
                              <span className="leading-relaxed">{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {Object.keys(aiContent.experienceBullets || {}).length > 0 && (
                      <div>
                        <Label className="mb-2 block">Tailored Experience Bullets</Label>
                        <div className="space-y-4">
                          {Object.entries(aiContent.experienceBullets).map(([jobKey, bullets]: [string, any]) => (
                            <div key={jobKey} className="p-3 bg-muted rounded-md">
                              <p className="font-medium text-sm mb-2">{jobKey}</p>
                              <ul className="space-y-2">
                                {bullets.map((bullet: string, idx: number) => (
                                  <li key={idx} className="text-sm text-muted-foreground leading-relaxed">
                                    • {bullet}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t bg-muted/30 rounded p-3 text-xs text-muted-foreground">
                      <p className="font-medium mb-2 leading-relaxed">✓ Based on your profile data</p>
                      <p className="leading-relaxed">All content is generated from your actual employment history, skills, education, and certifications. Review and apply suggestions that best match the job requirements.</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <SkillsOptimization
            jobDescription={jobs.find(j => j.id === selectedJobId)?.job_description || ''}
            userSkills={userProfile?.skills || []}
            resumeId={resumeId}
            autoOptimize={autoRunAI}
            onAddSkills={(skills) => {
              const currentSkills = Array.isArray(content.skills) ? content.skills : [];
              
              // If we're receiving the same number or more skills, it's likely a reorder operation
              // Otherwise, it's adding new skills
              if (skills.length >= currentSkills.length && skills.every(s => currentSkills.includes(s))) {
                // This is a reorder - replace the entire array
                setContent({ ...content, skills: skills });
              } else {
                // This is adding new skills - filter out duplicates
                const newSkills = skills.filter(s => !currentSkills.includes(s));
                if (newSkills.length > 0) {
                  setContent({ ...content, skills: [...currentSkills, ...newSkills] });
                }
              }
            }}
          />

          <ExperienceTailoring
            userId={userId}
            jobDescription={jobs.find(j => j.id === selectedJobId)?.job_description || ''}
            jobId={selectedJobId}
            autoTailor={autoRunAI}
            onVersionSaved={() => {
              // Refresh saved versions when a new version is saved
              if (savedVersionsRefreshFn) {
                savedVersionsRefreshFn();
              }
            }}
          />
          
          <SavedTailoredVersions 
            userId={userId}
            resumeId={resumeId}
            onRefresh={(refreshFn) => setSavedVersionsRefreshFn(() => refreshFn)}
          />
        </TabsContent>

        <TabsContent value="sections" className="space-y-4">
          <ResumeSectionCustomizer
            sections={sections}
            onSectionsChange={async (newSections) => {
              setSections(newSections);
              const updatedContent = { ...content, sections: newSections };
              setContent(updatedContent);
              
              // Auto-save section changes
              try {
                const { error } = await supabase
                  .from("resumes")
                  .update({
                    content: updatedContent,
                  })
                  .eq("id", resumeId);

                if (error) throw error;
                toast.success("Section changes saved");
              } catch (error) {
                console.error("Failed to save section changes:", error);
                toast.error("Failed to save section changes");
              }
            }}
            jobType={selectedJobId ? jobs.find(j => j.id === selectedJobId)?.job_title : undefined}
            userId={userId}
          />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Section Preview</CardTitle>
              <CardDescription className="text-xs">
                This shows which sections will appear on your resume in the current order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sections
                  .filter(s => s.enabled)
                  .sort((a, b) => a.order - b.order)
                  .map((section, index) => (
                    <div
                      key={section.id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{section.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {section.formatting?.fontSize || "medium"} font · {section.formatting?.spacing || "normal"} spacing
                        </p>
                      </div>
                      {section.isComplete ? (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" /> Ready
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" /> Add data
                        </Badge>
                      )}
                    </div>
                  ))}
              </div>
              {sections.filter(s => s.enabled).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No sections enabled. Enable at least one section above.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resume Information</CardTitle>
              <CardDescription>
                Customize your resume name and professional summary
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="resumeName" className="text-sm font-semibold">Resume Name</Label>
                <Input
                  id="resumeName"
                  value={resumeName}
                  onChange={(e) => setResumeName(e.target.value)}
                  placeholder="e.g., Software Engineer Resume 2024"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="summary" className="text-sm font-semibold block mb-2">Professional Summary</Label>
                <Textarea
                  id="summary"
                  value={content.summary || ""}
                  onChange={(e) => setContent({ ...content, summary: e.target.value })}
                  placeholder="Write a brief professional summary..."
                  rows={6}
                  className="resize-none leading-relaxed"
                />
                <p className="text-xs text-muted-foreground pt-1">
                  {content.summary?.length || 0} characters
                </p>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 space-y-3 mt-2">
                <p className="text-sm font-medium">Template Information</p>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Template: <span className="font-medium text-foreground">{template?.template_name}</span> ({template?.template_type})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your profile data from the Profile section will be automatically included in the resume.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          {resumeId && (
            <ResumeExport
              resumeId={resumeId}
              resumeName={resumeName}
              resumeData={{
                content,
                customization_overrides: customization,
                userProfile
              }}
              sections={sections}
            />
          )}
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Resume Feedback
              </CardTitle>
              <CardDescription>
                View and manage feedback on your resume. Share your resume to receive feedback from others.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resumeId ? (
                <ResumeFeedbackPanel 
                  resumeId={resumeId}
                  shareId={shareId || ''}
                  isOwner={true}
                  allowComments={false}
                />
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No resume selected
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
        </div>
        
        {/* Live Preview - Always Visible */}
        <div className="space-y-4 sticky top-4 h-fit">
          <ResumePreviewPanel content={content} customization={customization} template={template} sections={sections} />
        </div>
      </div>

      {/* Skill Gap Analysis Dialog */}
      {selectedJobId && (
        <SkillGapAnalysisDialog
          open={showSkillGapDialog}
          onOpenChange={setShowSkillGapDialog}
          jobId={selectedJobId}
          jobTitle={jobs.find(j => j.id === selectedJobId)?.job_title || "this position"}
        />
      )}
    </div>
  );
};
