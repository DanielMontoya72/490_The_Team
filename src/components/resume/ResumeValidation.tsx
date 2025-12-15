import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, AlertTriangle, Mail, Phone, MapPin, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ValidationIssue {
  type: "error" | "warning" | "info";
  category: string;
  message: string;
  field?: string;
}

interface ResumeValidationProps {
  content: any;
  resumeName: string;
}

export const ResumeValidation = ({ content, resumeName }: ResumeValidationProps) => {
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [score, setScore] = useState(0);
  const [aiValidating, setAiValidating] = useState(false);
  const [aiIssues, setAiIssues] = useState<ValidationIssue[]>([]);

  useEffect(() => {
    validateResume();
  }, [content]);

  const validateResume = () => {
    const newIssues: ValidationIssue[] = [];

    // Contact Information Validation
    const profile = content.profile || {};
    if (!profile.email || !isValidEmail(profile.email)) {
      newIssues.push({
        type: "error",
        category: "Contact",
        message: "Valid email address is required",
        field: "email"
      });
    }
    if (!profile.phone || !isValidPhone(profile.phone)) {
      newIssues.push({
        type: "warning",
        category: "Contact",
        message: "Valid phone number recommended",
        field: "phone"
      });
    }
    if (!profile.location) {
      newIssues.push({
        type: "info",
        category: "Contact",
        message: "Location helps employers find local candidates",
        field: "location"
      });
    }

    // Missing Information Warnings
    if (!content.summary && !profile.bio && !profile.headline) {
      newIssues.push({
        type: "warning",
        category: "Content",
        message: "Professional summary is missing - this helps recruiters understand your value quickly"
      });
    }

    const employment = content.employment || [];
    if (employment.length === 0) {
      newIssues.push({
        type: "error",
        category: "Content",
        message: "No work experience listed - add your employment history"
      });
    }

    const education = content.education || [];
    if (education.length === 0) {
      newIssues.push({
        type: "warning",
        category: "Content",
        message: "No education listed - add your educational background"
      });
    }

    const skills = content.skills || [];
    if (skills.length === 0) {
      newIssues.push({
        type: "warning",
        category: "Content",
        message: "No skills listed - add relevant skills for your target role"
      });
    } else if (skills.length < 5) {
      newIssues.push({
        type: "info",
        category: "Content",
        message: "Consider adding more skills (aim for 8-12 key skills)"
      });
    }

    // Length Optimization
    const estimatedLength = estimateResumeLength(content);
    if (estimatedLength < 0.8) {
      newIssues.push({
        type: "info",
        category: "Length",
        message: "Resume appears short - consider adding more detail to reach 1 page"
      });
    } else if (estimatedLength > 2.2) {
      newIssues.push({
        type: "warning",
        category: "Length",
        message: "Resume may be too long - aim for 1-2 pages maximum"
      });
    }

    // Format Consistency Checking
    if (employment.length > 0) {
      const datesConsistent = employment.every((job: any) => job.start_date);
      if (!datesConsistent) {
        newIssues.push({
          type: "warning",
          category: "Format",
          message: "Some work experiences are missing dates"
        });
      }

      const descriptionsConsistent = employment.every((job: any) => job.job_description);
      if (!descriptionsConsistent) {
        newIssues.push({
          type: "info",
          category: "Format",
          message: "Some work experiences lack descriptions"
        });
      }
    }

    setIssues(newIssues);
    calculateScore(newIssues);
  };

  const handleAIValidation = async () => {
    setAiValidating(true);
    try {
      const textContent = extractTextContent(content);
      
      const { data, error } = await supabase.functions.invoke("validate-resume-content", {
        body: {
          content: textContent,
          resumeName
        }
      });

      if (error) throw error;

      const aiValidationIssues: ValidationIssue[] = [];

      // Spell and grammar issues
      if (data.spellErrors && data.spellErrors.length > 0) {
        aiValidationIssues.push({
          type: "error",
          category: "Spelling",
          message: `Found ${data.spellErrors.length} spelling/grammar issue(s): ${data.spellErrors.slice(0, 3).join(", ")}${data.spellErrors.length > 3 ? "..." : ""}`
        });
      }

      // Professional tone issues
      if (data.toneIssues && data.toneIssues.length > 0) {
        data.toneIssues.forEach((issue: string) => {
          aiValidationIssues.push({
            type: "warning",
            category: "Professional Tone",
            message: issue
          });
        });
      }

      // Suggestions
      if (data.suggestions && data.suggestions.length > 0) {
        data.suggestions.forEach((suggestion: string) => {
          aiValidationIssues.push({
            type: "info",
            category: "Improvement",
            message: suggestion
          });
        });
      }

      setAiIssues(aiValidationIssues);
      toast.success("AI validation complete!");
    } catch (error: any) {
      if (error.message?.includes('429')) {
        toast.error("Rate limit exceeded. Please try again later.");
      } else if (error.message?.includes('402')) {
        toast.error("AI credits exhausted. Please add credits to continue.");
      } else {
        toast.error("Failed to validate with AI");
      }
      console.error(error);
    } finally {
      setAiValidating(false);
    }
  };

  const calculateScore = (validationIssues: ValidationIssue[]) => {
    let baseScore = 100;
    validationIssues.forEach(issue => {
      if (issue.type === "error") baseScore -= 15;
      else if (issue.type === "warning") baseScore -= 8;
      else if (issue.type === "info") baseScore -= 3;
    });
    setScore(Math.max(0, baseScore));
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPhone = (phone: string) => {
    return /^[\d\s\-\+\(\)]{10,}$/.test(phone);
  };

  const estimateResumeLength = (resumeContent: any) => {
    let estimatedPages = 0;
    
    // Rough estimation based on content sections
    const employment = resumeContent.employment || [];
    const education = resumeContent.education || [];
    const skills = resumeContent.skills || [];
    const projects = resumeContent.projects || [];
    const certifications = resumeContent.certifications || [];
    
    // Base page for header/contact
    estimatedPages += 0.1;
    
    // Summary
    if (resumeContent.summary) estimatedPages += 0.15;
    
    // Employment (approx 0.2 pages per job)
    estimatedPages += employment.length * 0.2;
    
    // Education (approx 0.1 pages per degree)
    estimatedPages += education.length * 0.1;
    
    // Skills (approx 0.15 pages total)
    if (skills.length > 0) estimatedPages += 0.15;
    
    // Projects (approx 0.15 pages per project)
    estimatedPages += projects.length * 0.15;
    
    // Certifications (approx 0.08 pages per cert)
    estimatedPages += certifications.length * 0.08;
    
    return estimatedPages;
  };

  const extractTextContent = (resumeContent: any) => {
    let text = "";
    
    if (resumeContent.summary) text += resumeContent.summary + " ";
    if (resumeContent.profile?.bio) text += resumeContent.profile.bio + " ";
    if (resumeContent.profile?.headline) text += resumeContent.profile.headline + " ";
    
    (resumeContent.employment || []).forEach((job: any) => {
      text += `${job.job_title} ${job.company_name} ${job.job_description || ""} `;
    });
    
    (resumeContent.education || []).forEach((edu: any) => {
      text += `${edu.degree_type} ${edu.field_of_study} ${edu.institution_name} `;
    });
    
    return text.trim();
  };

  const allIssues = [...issues, ...aiIssues];
  const errors = allIssues.filter(i => i.type === "error");
  const warnings = allIssues.filter(i => i.type === "warning");
  const infos = allIssues.filter(i => i.type === "info");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Resume Quality Score
          </CardTitle>
          <Button
            onClick={handleAIValidation}
            disabled={aiValidating}
            size="sm"
            variant="outline"
          >
            {aiValidating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                AI Validation
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Score</span>
            <span className="text-2xl font-bold">{score}/100</span>
          </div>
          <Progress value={score} className="h-2" />
        </div>

        <div className="flex gap-2 flex-wrap">
          {errors.length > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.length} Error{errors.length !== 1 && 's'}
            </Badge>
          )}
          {warnings.length > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {warnings.length} Warning{warnings.length !== 1 && 's'}
            </Badge>
          )}
          {infos.length > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {infos.length} Suggestion{infos.length !== 1 && 's'}
            </Badge>
          )}
          {allIssues.length === 0 && (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              No Issues Found
            </Badge>
          )}
        </div>

        {allIssues.length > 0 && (
          <div className="space-y-2 mt-4">
            <h4 className="text-sm font-semibold">Issues & Suggestions:</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {allIssues.map((issue, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    issue.type === "error"
                      ? "bg-destructive/10 border-destructive"
                      : issue.type === "warning"
                      ? "bg-secondary border-secondary"
                      : "bg-muted border-border"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {issue.type === "error" ? (
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                    ) : issue.type === "warning" ? (
                      <AlertTriangle className="h-5 w-5 text-foreground mt-0.5 flex-shrink-0" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-base">{issue.category}</p>
                      <p className="text-muted-foreground text-sm">{issue.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground pt-2 border-t">
          <p className="font-medium mb-1">Quick Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Keep resume to 1-2 pages maximum</li>
            <li>Use action verbs and quantify achievements</li>
            <li>Ensure all contact information is current</li>
            <li>Tailor content to the specific job you're applying for</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
