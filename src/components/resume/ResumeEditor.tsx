import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Palette, Sparkles, Loader2, RefreshCw, LayoutList, Check, AlertCircle, Eye, MessageSquare, Edit2, Plus, Download, BookmarkCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResumeSectionCustomizer, ResumeSection } from "@/components/resume/ResumeSectionCustomizer";
import { BasicTemplatePicker } from "@/components/resume/BasicTemplatePicker";
import { ResumeTemplatesShowcase } from "@/components/resume/ResumeTemplatesShowcase";
import SkillsOptimization from "@/components/resume/SkillsOptimization";
import { ExperienceTailoring } from "@/components/resume/ExperienceTailoring";
import { SavedTailoredVersions } from "@/components/resume/SavedTailoredVersions";
import { ResumeExport } from "@/components/resume/ResumeExport";
import { ResumeValidation } from "@/components/resume/ResumeValidation";
import SimpleResumeTemplate from "@/components/resume/SimpleResumeTemplate";
import { ResumeFeedbackPanel } from "@/components/resume/ResumeFeedbackPanel";
import { SkillGapAnalysisDialog } from "@/components/resume/SkillGapAnalysisDialog";

interface ResumeEditorProps {
  userId: string;
  resumeId: string | null;
  onSave: () => void;
}

export const ResumeEditor = ({ userId, resumeId, onSave }: ResumeEditorProps) => {
    const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const { theme: currentTheme } = useTheme();
  const [resumeName, setResumeName] = useState("");
  const [isRenamingResume, setIsRenamingResume] = useState(false);
  const [newResumeName, setNewResumeName] = useState("");
  const [content, setContent] = useState<any>({});
  // Only allow primary color and basic template style customization
  const [primaryColor, setPrimaryColor] = useState<string>("#2563eb");
  const [templateStyle, setTemplateStyle] = useState<string>("classic");
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
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [manualJobDescription, setManualJobDescription] = useState("");
  const [showTailoredVersionsDialog, setShowTailoredVersionsDialog] = useState(false);

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
      // Handle both string and object for customization_overrides
      let color = "#2563eb";
      let style = "classic";
      if (data.customization_overrides) {
        if (typeof data.customization_overrides === 'string') {
          try {
            const parsed = JSON.parse(data.customization_overrides);
            color = parsed.primaryColor || color;
            style = parsed.templateStyle || style;
          } catch {}
        } else if (
          typeof data.customization_overrides === 'object' &&
          !Array.isArray(data.customization_overrides)
        ) {
          color = (data.customization_overrides as any).primaryColor || color;
          style = (data.customization_overrides as any).templateStyle || style;
        }
      }
      setPrimaryColor(color);
      setTemplateStyle(style);
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
    const selectedJob = jobs.find(j => j.id === selectedJobId);
    const jobDescription = selectedJob?.job_description || manualJobDescription;
    
    if (!jobDescription) {
      toast.error("Please select a job posting or enter a job description");
      return;
    }

    if (!userProfile) {
      toast.error("User profile not loaded");
      return;
    }

    setAiGenerating(true);
    const loadingToast = toast.loading("Generating AI content...");
    
    try {
      // Step 1: Generate main resume content
      toast.loading("Generating resume content and variations...", { id: loadingToast });
      
      const { data, error } = await supabase.functions.invoke("generate-resume-content", {
        body: {
          jobDescription: jobDescription,
          userProfile,
          resumeType: "chronological",
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
        tailoredFor: selectedJob?.job_title || "Manual Job Description",
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
          customization_overrides: { primaryColor, templateStyle },
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
    <div className="space-y-4 sm:space-y-6 overflow-visible px-2 sm:px-0">
      <div className="relative z-40 w-full lg:max-w-[50%]">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <h2 className="text-xl sm:text-2xl font-bold break-words flex-1 min-w-0">{resumeName}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setNewResumeName(resumeName);
                setIsRenamingResume(true);
              }}
              className="touch-manipulation"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button onClick={() => setShowExportDialog(true)} variant="outline" size="sm" className="touch-manipulation">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button onClick={handleSave} disabled={loading} size="sm" className="touch-manipulation">
              <Save className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Save</span>
            </Button>
          </div>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-4 sm:space-y-6">


          {/* AI Generation */}
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

              {/* Job Description (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="job-description" className="text-sm">Job Description (Optional)</Label>
                <Textarea
                  id="job-description"
                  placeholder="Paste job description here if you didn't link a job..."
                  value={manualJobDescription}
                  onChange={(e) => setManualJobDescription(e.target.value)}
                  rows={6}
                  className="resize-none text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  This will be used for AI content generation if no job is selected above
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => handleGenerateAIContent(false)}
                  disabled={(!selectedJobId && !manualJobDescription) || aiGenerating}
                  className="flex-1 w-full sm:min-w-[200px] touch-manipulation"
                  size="lg"
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span className="hidden sm:inline">Generating All Content...</span>
                      <span className="sm:hidden">Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Generate All AI Content</span>
                      <span className="sm:hidden">Generate AI</span>
                    </>
                  )}
                </Button>
                {aiContent && (
                  <Button
                    onClick={() => handleGenerateAIContent(true)}
                    disabled={(!selectedJobId && !manualJobDescription) || aiGenerating}
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto touch-manipulation"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                )}
              </div>

              {aiContent && (
                <>
                  <Separator className="my-4" />

                  {aiVariations.length > 1 && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <Label className="text-sm">Variation:</Label>
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
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {aiVariations.map((_, idx) => (
                            <SelectItem key={idx} value={idx.toString()}>
                              Version {idx + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge variant="secondary" className="whitespace-nowrap">{aiVariations.length} variations</Badge>
                    </div>
                  )}
                  
                  <div className="rounded-lg border bg-card p-3 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <h3 className="font-semibold text-sm sm:text-base">Generated Content</h3>
                      <Badge className="whitespace-nowrap">Variation {selectedVariation + 1}</Badge>
                    </div>
                    
                    <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <Label className="text-sm">Professional Summary</Label>
                        <Button
                          size="sm"
                          onClick={() => applyAISuggestion("summary", aiContent.professionalSummary)}
                          className="bg-purple-600 hover:bg-purple-700 text-white touch-manipulation flex-shrink-0"
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

          {/* Template Style Picker (moved below AI content) */}
          <div className="mb-6">
            <BasicTemplatePicker selected={templateStyle} onSelect={setTemplateStyle} />
          </div>

          {/* Validation */}
          <ResumeValidation 
            content={content} 
            resumeName={resumeName}
            onShowSkillGap={() => setShowSkillGapDialog(true)}
            onShowTailoredVersions={() => setShowTailoredVersionsDialog(true)}
            hasJobSelected={!!(selectedJobId || manualJobDescription)}
          />

          {/* Section Customizer */}
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

          {/* Resume Information */}
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


            </CardContent>
          </Card>

          {/* Resume Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Resume Feedback
                {feedbackCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{feedbackCount}</Badge>
                )}
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
        </div>
        
        {/* Live Preview - Scrollable */}
        <div className="hidden lg:block relative">
          <div className="fixed top-20 bottom-4 w-[calc(50%-2rem)] max-w-[700px] z-30 overflow-y-auto overflow-x-hidden">
            <div style={{ transform: 'scale(0.7)', transformOrigin: 'top left', width: '794px' }}>
              <SimpleResumeTemplate
                data={{
                  personalInfo: {
                    name: `${content.profile?.first_name || ''} ${content.profile?.last_name || ''}`.trim(),
                    email: content.profile?.email || '',
                    phone: content.profile?.phone || '',
                    location: content.profile?.location || '',
                    headline: content.profile?.headline || '',
                    linkedin: content.profile?.linkedin || ''
                  },
                  summary: content.summary || '',
                  skills: Array.isArray(content.skills)
                    ? content.skills.map((s: any) => typeof s === 'string' ? s : s.skill_name || '')
                    : [],
                  experience: (content.employment || []).map((exp: any) => ({
                    jobTitle: exp.job_title || '',
                    company: exp.company_name || '',
                    dates: exp.start_date ? `${new Date(exp.start_date).toLocaleDateString()} - ${exp.is_current ? 'Present' : new Date(exp.end_date).toLocaleDateString()}` : '',
                    description: exp.job_description || '',
                    location: exp.location || ''
                  })),
                  education: (content.education || []).map((edu: any) => ({
                    degree: `${edu.degree_type || ''} in ${edu.field_of_study || ''}`,
                    institution: edu.institution_name || '',
                    year: edu.graduation_date ? new Date(edu.graduation_date).getFullYear() : 'Present',
                    gpa: edu.show_gpa && edu.gpa ? edu.gpa : null
                  })),
                  additional: content.additional || ''
                }}
                primaryColor={primaryColor}
                templateStyle={templateStyle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tailored Versions Dialog */}
      <Dialog open={showTailoredVersionsDialog} onOpenChange={setShowTailoredVersionsDialog}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Saved Tailored Versions</DialogTitle>
            <DialogDescription>
              View and apply your saved tailored experience versions
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <SavedTailoredVersions 
              userId={userId}
              resumeId={resumeId}
              onRefresh={(refreshFn) => setSavedVersionsRefreshFn(() => refreshFn)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export Resume</DialogTitle>
            <DialogDescription>
              Download your resume in various formats or share it with others
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {resumeId && (
              <ResumeExport
                resumeId={resumeId}
                resumeName={resumeName}
                resumeData={{
                  content,
                  customization_overrides: {
                    primaryColor,
                    templateStyle
                  },
                  userProfile
                }}
                sections={sections}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

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
