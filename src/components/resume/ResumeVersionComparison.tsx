import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Resume {
  id: string;
  resume_name: string;
  version_number: number;
  version_description: string | null;
  content: any;
  is_default: boolean;
  created_at: string;
  customization_overrides: any;
}

interface ResumeVersionComparisonProps {
  resumeId: string;
  onClose: () => void;
  onMerge?: (sourceId: string, targetId: string) => void;
}

export function ResumeVersionComparison({ resumeId, onClose, onMerge }: ResumeVersionComparisonProps) {
  const [currentResume, setCurrentResume] = useState<Resume | null>(null);
  const [relatedVersions, setRelatedVersions] = useState<Resume[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVersions();
  }, [resumeId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      
      // Fetch current resume
      const { data: current, error: currentError } = await supabase
        .from("resumes")
        .select("*")
        .eq("id", resumeId)
        .single();

      if (currentError) throw currentError;
      
      // Debug: Log the full resume content
      console.log('Current resume full data:', current);
      console.log('Current resume content:', current.content);
      
      setCurrentResume(current);

      // Fetch related versions (same parent or this is parent)
      let versionQuery = supabase
        .from("resumes")
        .select("*")
        .neq("id", resumeId)
        .order("created_at", { ascending: false });

      // Build the OR condition based on whether there's a parent
      if (current.parent_resume_id) {
        versionQuery = versionQuery.or(`parent_resume_id.eq.${resumeId},parent_resume_id.eq.${current.parent_resume_id},id.eq.${current.parent_resume_id}`);
      } else {
        // If no parent, just look for resumes that have this one as parent
        versionQuery = versionQuery.eq("parent_resume_id", resumeId);
      }

      const { data: versions, error: versionsError } = await versionQuery;

      if (versionsError) throw versionsError;
      setRelatedVersions(versions || []);

      if (versions && versions.length > 0) {
        setSelectedVersion(versions[0]);
      }
    } catch (error: any) {
      console.error("Error fetching versions:", error);
      toast.error("Failed to load resume versions");
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async (direction: 'left-to-right' | 'right-to-left') => {
    if (!selectedVersion) return;
    
    const sourceResume = direction === 'left-to-right' ? currentResume : selectedVersion;
    const targetResume = direction === 'left-to-right' ? selectedVersion : currentResume;
    
    try {
      // Merge content intelligently
      const mergedContent = {
        personalInfo: {
          ...targetResume.content?.personalInfo,
          ...sourceResume.content?.personalInfo,
        },
        profile: {
          ...targetResume.content?.profile,
          ...sourceResume.content?.profile,
        },
        summary: sourceResume.content?.summary || targetResume.content?.summary,
        employment: [
          ...(targetResume.content?.employment || targetResume.content?.experience || []),
          ...(sourceResume.content?.employment || sourceResume.content?.experience || [])
        ].filter((exp, index, self) => 
          index === self.findIndex(e => 
            (e.company_name === exp.company_name || e.company === exp.company) && 
            (e.job_title === exp.job_title || e.position === exp.position)
          )
        ),
        education: [
          ...(targetResume.content?.education || []),
          ...(sourceResume.content?.education || [])
        ].filter((edu, index, self) => 
          index === self.findIndex(e => 
            (e.institution_name === edu.institution_name || e.institution === edu.institution) && 
            (e.degree_type === edu.degree_type || e.degree === edu.degree)
          )
        ),
        skills: Array.from(new Set([
          ...(targetResume.content?.skills || []),
          ...(sourceResume.content?.skills || [])
        ])),
        projects: [
          ...(targetResume.content?.projects || []),
          ...(sourceResume.content?.projects || [])
        ].filter((proj, index, self) => 
          index === self.findIndex(p => 
            (p.project_name === proj.project_name || p.name === proj.name)
          )
        ),
        certifications: [
          ...(targetResume.content?.certifications || []),
          ...(sourceResume.content?.certifications || [])
        ].filter((cert, index, self) => 
          index === self.findIndex(c => 
            (c.certification_name === cert.certification_name || c.name === cert.name)
          )
        ),
      };

      const mergedCustomization = {
        ...targetResume.customization_overrides,
        ...sourceResume.customization_overrides,
      };

      // Update the target resume with merged content
      const { error } = await supabase
        .from('resumes')
        .update({
          content: mergedContent,
          customization_overrides: mergedCustomization,
        })
        .eq('id', targetResume.id);

      if (error) throw error;

      toast.success(`Successfully merged content into ${targetResume.resume_name}`);
      
      // Refresh versions
      await fetchVersions();
      
      if (onMerge) {
        onMerge(sourceResume.id, targetResume.id);
      }
    } catch (error) {
      console.error('Merge error:', error);
      toast.error('Failed to merge resume versions');
    }
  };

  const formatPersonalInfo = (info: any) => {
    if (!info || Object.keys(info).length === 0) return <p className="text-sm text-muted-foreground italic">No personal information</p>;
    return (
      <div className="space-y-2 text-sm">
        {info.firstName && <p><span className="font-medium">Name:</span> {info.firstName} {info.lastName}</p>}
        {info.email && <p><span className="font-medium">Email:</span> {info.email}</p>}
        {info.phone && <p><span className="font-medium">Phone:</span> {info.phone}</p>}
        {info.location && <p><span className="font-medium">Location:</span> {info.location}</p>}
      </div>
    );
  };

  const formatSummary = (summary: any) => {
    if (!summary) return <p className="text-sm text-muted-foreground italic">No summary</p>;
    return <p className="text-sm whitespace-pre-wrap leading-relaxed">{summary}</p>;
  };

  const formatExperience = (experience: any[]) => {
    if (!experience || experience.length === 0) return <p className="text-sm text-muted-foreground italic">No experience entries</p>;
    return (
      <div className="space-y-4">
        {experience.map((exp, idx) => (
          <div key={idx} className="space-y-1">
            <p className="font-medium text-sm">{exp.position || exp.job_title}</p>
            <p className="text-sm text-muted-foreground">{exp.company || exp.company_name}</p>
            {(exp.startDate || exp.start_date) && (
              <p className="text-sm text-muted-foreground">
                {exp.startDate || exp.start_date} - {exp.endDate || exp.end_date || 'Present'}
              </p>
            )}
            {(exp.description || exp.job_description) && (
              <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap">{exp.description || exp.job_description}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const formatEducation = (education: any[]) => {
    if (!education || education.length === 0) return <p className="text-sm text-muted-foreground italic">No education entries</p>;
    return (
      <div className="space-y-4">
        {education.map((edu, idx) => (
          <div key={idx} className="space-y-1">
            <p className="font-medium text-sm">{edu.degree || edu.degree_type}</p>
            <p className="text-sm text-muted-foreground">{edu.institution || edu.institution_name}</p>
            {edu.field_of_study && <p className="text-sm">{edu.field_of_study}</p>}
            {(edu.graduationDate || edu.graduation_date) && (
              <p className="text-sm text-muted-foreground">{edu.graduationDate || edu.graduation_date}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const formatSkills = (skills: any) => {
    if (!skills) return <p className="text-sm text-muted-foreground italic">No skills</p>;
    
    // Handle array of skills
    if (Array.isArray(skills)) {
      if (skills.length === 0) return <p className="text-sm text-muted-foreground italic">No skills</p>;
      return (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, idx) => (
            <Badge key={idx} variant="secondary" className="text-sm">
              {typeof skill === 'string' ? skill : skill.skill_name || skill.name}
            </Badge>
          ))}
        </div>
      );
    }
    
    // Handle object with categories
    if (typeof skills === 'object' && Object.keys(skills).length > 0) {
      return (
        <div className="space-y-3">
          {Object.entries(skills).map(([category, skillList]: [string, any]) => (
            <div key={category}>
              <p className="text-sm font-medium text-muted-foreground mb-2">{category}:</p>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(skillList) && skillList.map((skill, idx) => (
                  <Badge key={idx} variant="secondary" className="text-sm">
                    {typeof skill === 'string' ? skill : skill.skill_name || skill.name}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return <p className="text-sm text-muted-foreground italic">No skills</p>;
  };

  const renderContentDiff = (label: string, current: any, selected: any, formatter?: (data: any) => JSX.Element) => {
    // Debug: Log the actual content to see what we're working with
    console.log(`${label} - Current:`, current);
    console.log(`${label} - Selected:`, selected);
    
    const currentValue = JSON.stringify(current, null, 2);
    const selectedValue = JSON.stringify(selected, null, 2);
    const isDifferent = currentValue !== selectedValue;

    return (
      <div className="space-y-4">
        <h4 className="font-medium text-sm flex items-center gap-2">
          {label}
          {isDifferent && <Badge variant="outline">Different</Badge>}
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Current Version</p>
            <div className="w-full rounded border border-yellow-300 bg-yellow-100 dark:border-yellow-600 dark:bg-yellow-900/20 p-3">
              {formatter ? formatter(current) : <pre className="text-xs">{currentValue}</pre>}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Selected Version</p>
            <div className="w-full rounded border border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/30 p-3">
              {formatter ? formatter(selected) : <pre className="text-xs">{selectedValue}</pre>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading versions...</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentResume) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Resume not found</p>
        </CardContent>
      </Card>
    );
  }

  if (relatedVersions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Version Comparison
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            No other versions found for comparison. Create a new version to compare changes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Compare Resume Versions</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Version Selector */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium mb-2">Current Version</p>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{currentResume.resume_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Version {currentResume.version_number}
                      {currentResume.version_description && ` - ${currentResume.version_description}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(currentResume.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {currentResume.is_default && (
                    <Badge variant="secondary">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Default
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <ArrowRight className="h-8 w-8 text-muted-foreground flex-shrink-0" />

          <div className="flex-1">
            <p className="text-sm font-medium mb-2">Compare With</p>
            <div className="space-y-2">
              {relatedVersions.map((version) => (
                <Card
                  key={version.id}
                  className={`cursor-pointer transition-colors ${
                    selectedVersion?.id === version.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedVersion(version)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{version.resume_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Version {version.version_number}
                          {version.version_description && ` - ${version.version_description}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(version.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {version.is_default && (
                        <Badge variant="secondary">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {selectedVersion && (
          <>
            <Separator />

            {/* Content Comparison */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Content Differences</h3>
              
              {renderContentDiff("Personal Information", currentResume.content?.personalInfo || currentResume.content?.profile, selectedVersion.content?.personalInfo || selectedVersion.content?.profile, formatPersonalInfo)}
              {renderContentDiff("Summary", currentResume.content?.summary, selectedVersion.content?.summary, formatSummary)}
              {renderContentDiff("Experience", currentResume.content?.employment || currentResume.content?.experience, selectedVersion.content?.employment || selectedVersion.content?.experience, formatExperience)}
              {renderContentDiff("Education", currentResume.content?.education, selectedVersion.content?.education, formatEducation)}
              {renderContentDiff("Skills", currentResume.content?.skills, selectedVersion.content?.skills, formatSkills)}
            </div>

            {onMerge && (
              <>
                <Separator />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => handleMerge('right-to-left')}
                  >
                    Merge Selected → Current
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleMerge('left-to-right')}
                  >
                    Merge Current → Selected
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
