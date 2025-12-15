import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Mail, Phone, MapPin, Calendar, Building, GraduationCap, Award, Briefcase } from "lucide-react";
import { ResumeSection } from "@/components/resume/ResumeSectionCustomizer";

interface ResumePreviewPanelProps {
  content: any;
  customization: any;
  template: any;
  sections?: ResumeSection[];
}

export const ResumePreviewPanel = ({ content, customization, template, sections }: ResumePreviewPanelProps) => {
  const profile = content.profile || {};
  const employment = content.employment || [];
  const education = content.education || [];
  const skills = content.skills || [];
  const projects = content.projects || [];
  const certifications = content.certifications || [];

  const primaryColor = customization.primaryColor || template?.customization_settings?.primaryColor || "#2563eb";
  const fontSize = customization.fontSize || template?.customization_settings?.fontSize || "medium";
  const fontFamily = customization.fontFamily || template?.customization_settings?.fontFamily || "Inter";

  // Small: 12pt (text-xs), Medium: 14pt (text-sm), Large: 16pt (text-base)
  let fontSizeClass = 'text-sm'; // default medium
  if (fontSize === 'small') fontSizeClass = 'text-xs';
  else if (fontSize === 'large') fontSizeClass = 'text-base';

  // Get enabled sections sorted by order
  const enabledSections = sections
    ?.filter(s => s.enabled)
    .sort((a, b) => a.order - b.order) || [];

  // Helper to check if a section should be shown
  const isSectionEnabled = (sectionId: string) => {
    if (!sections || sections.length === 0) return true; // Show all if no sections config
    return enabledSections.some(s => s.id === sectionId);
  };

  // Helper to get section order
  const getSectionOrder = (sectionId: string) => {
    const section = enabledSections.find(s => s.id === sectionId);
    return section?.order ?? 999;
  };

  // Helper to get section formatting classes
  const getSectionFormatting = (sectionId: string) => {
    const section = sections?.find(s => s.id === sectionId);
    const fontSize = section?.formatting?.fontSize || 'medium';
    const spacing = section?.formatting?.spacing || 'normal';
    
    // Small: 12pt (text-xs), Medium: 14pt (text-sm), Large: 16pt (text-base)
    let fontSizeClass = 'text-sm'; // default medium
    if (fontSize === 'small') fontSizeClass = 'text-xs';
    else if (fontSize === 'large') fontSizeClass = 'text-base';
    
    const spacingClass = spacing === 'compact' ? 'mb-3 space-y-1' : spacing === 'relaxed' ? 'mb-8 space-y-4' : 'mb-6 space-y-2';
    
    return { fontSizeClass, spacingClass };
  };

  // Section components map
  const sectionComponents: Record<string, JSX.Element | null> = {
    summary: (content.summary || profile.bio) && isSectionEnabled('summary') ? (() => {
      const { fontSizeClass, spacingClass } = getSectionFormatting('summary');
      return (
        <div className={spacingClass}>
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2" style={{ color: primaryColor }}>
            <div className="h-1 w-8 rounded" style={{ backgroundColor: primaryColor }} />
            Professional Summary
          </h2>
          <p className={`text-gray-700 leading-relaxed ${fontSizeClass}`}>
            {content.summary || profile.bio}
          </p>
        </div>
      );
    })() : null,
    experience: employment.length > 0 && isSectionEnabled('experience') ? (() => {
      const { fontSizeClass, spacingClass } = getSectionFormatting('experience');
      return (
        <div className={spacingClass}>
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={{ color: primaryColor }}>
            <div className="h-1 w-8 rounded" style={{ backgroundColor: primaryColor }} />
            Work Experience
          </h2>
          <div className="space-y-4">
            {employment.map((job: any, index: number) => (
              <div key={index} className="relative pl-4 border-l-2" style={{ borderColor: primaryColor }}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className={`font-bold text-gray-900 ${fontSizeClass}`}>{job.job_title}</h3>
                    <p className={`text-gray-600 flex items-center gap-1 ${fontSizeClass}`}>
                      <Building className="h-3 w-3" />
                      {job.company_name}
                      {job.location && ` • ${job.location}`}
                    </p>
                  </div>
                  <div className={`text-gray-500 flex items-center gap-1 ${fontSizeClass}`}>
                    <Calendar className="h-3 w-3" />
                    {new Date(job.start_date).getFullYear()} - {job.is_current ? "Present" : new Date(job.end_date).getFullYear()}
                  </div>
                </div>
                {job.job_description && (
                  <p className={`text-gray-700 mt-2 whitespace-pre-line ${fontSizeClass}`}>{job.job_description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    })() : null,
    education: education.length > 0 && isSectionEnabled('education') ? (() => {
      const { fontSizeClass, spacingClass } = getSectionFormatting('education');
      return (
        <div className={spacingClass}>
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={{ color: primaryColor }}>
            <div className="h-1 w-8 rounded" style={{ backgroundColor: primaryColor }} />
            Education
          </h2>
          <div className="space-y-3">
            {education.map((edu: any, index: number) => (
              <div key={index} className="relative pl-4 border-l-2" style={{ borderColor: primaryColor }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`font-bold text-gray-900 ${fontSizeClass}`}>{edu.degree_type} in {edu.field_of_study}</h3>
                    <p className={`text-gray-600 flex items-center gap-1 ${fontSizeClass}`}>
                      <GraduationCap className="h-3 w-3" />
                      {edu.institution_name}
                    </p>
                    {edu.show_gpa && edu.gpa && (
                      <p className={`text-gray-600 ${fontSizeClass}`}>GPA: {edu.gpa}</p>
                    )}
                  </div>
                  {edu.graduation_date && (
                    <div className={`text-gray-500 ${fontSizeClass}`}>
                      {new Date(edu.graduation_date).getFullYear()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    })() : null,
    skills: skills.length > 0 && isSectionEnabled('skills') ? (() => {
      const { fontSizeClass, spacingClass } = getSectionFormatting('skills');
      return (
        <div className={spacingClass}>
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={{ color: primaryColor }}>
            <div className="h-1 w-8 rounded" style={{ backgroundColor: primaryColor }} />
            Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill: any, index: number) => (
              <Badge 
                key={index} 
                variant="secondary"
                className={`px-3 py-1 ${fontSizeClass}`}
                style={{ 
                  backgroundColor: `${primaryColor}15`,
                  color: primaryColor,
                  borderColor: primaryColor
                }}
              >
                {skill.skill_name || skill}
              </Badge>
            ))}
          </div>
        </div>
      );
    })() : null,
    projects: projects.length > 0 && isSectionEnabled('projects') ? (() => {
      const { fontSizeClass, spacingClass } = getSectionFormatting('projects');
      return (
        <div className={spacingClass}>
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={{ color: primaryColor }}>
            <div className="h-1 w-8 rounded" style={{ backgroundColor: primaryColor }} />
            Projects
          </h2>
          <div className="space-y-3">
            {projects.map((project: any, index: number) => (
              <div key={index} className="relative pl-4 border-l-2" style={{ borderColor: primaryColor }}>
                <h3 className={`font-bold text-gray-900 flex items-center gap-1 ${fontSizeClass}`}>
                  <Briefcase className="h-3 w-3" />
                  {project.project_name}
                </h3>
                <p className={`text-gray-600 ${fontSizeClass}`}>{project.role}</p>
                {project.description && (
                  <p className={`text-gray-700 mt-1 ${fontSizeClass}`}>{project.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    })() : null,
    certifications: certifications.length > 0 && isSectionEnabled('certifications') ? (() => {
      const { fontSizeClass, spacingClass } = getSectionFormatting('certifications');
      return (
        <div className={spacingClass}>
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={{ color: primaryColor }}>
            <div className="h-1 w-8 rounded" style={{ backgroundColor: primaryColor }} />
            Certifications
          </h2>
          <div className="space-y-2">
            {certifications.map((cert: any, index: number) => (
              <div key={index} className="flex items-start gap-2">
                <Award className="h-4 w-4 mt-0.5" style={{ color: primaryColor }} />
                <div>
                  <p className={`font-medium text-gray-900 ${fontSizeClass}`}>{cert.certification_name}</p>
                  <p className={`text-gray-600 ${fontSizeClass}`}>{cert.issuing_organization}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    })() : null,
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Live Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          className={`resume-preview-content bg-white text-gray-900 p-8 rounded-lg shadow-inner border ${fontSizeClass}`}
          style={{ fontFamily }}
        >
          {/* Header */}
          <div className="text-center mb-6 pb-4 border-b-2" style={{ borderColor: primaryColor }}>
            <h1 className="text-3xl font-bold mb-2" style={{ color: primaryColor }}>
              {profile.first_name} {profile.last_name}
            </h1>
            {profile.headline && (
              <p className="text-lg text-gray-600 mb-3">{profile.headline}</p>
            )}
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
              {profile.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </div>
              )}
              {profile.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {profile.phone}
                </div>
              )}
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {profile.location}
                </div>
              )}
            </div>
          </div>

          {/* Render sections in order */}
          {enabledSections.length > 0 ? (
            enabledSections.map(section => sectionComponents[section.id])
          ) : (
            // Fallback to default order if no sections configured
            Object.values(sectionComponents)
          )}
        </div>
      </CardContent>
    </Card>
  );
};
