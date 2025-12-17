// Utility for section formatting
function getSectionFormatting(sectionId: string) {
  switch (sectionId) {
    case "summary":
      return { fontSizeClass: "text-base", spacingClass: "mb-6" };
    case "experience":
      return { fontSizeClass: "text-sm", spacingClass: "mb-6" };
    case "education":
      return { fontSizeClass: "text-sm", spacingClass: "mb-6" };
    case "skills":
      return { fontSizeClass: "text-sm", spacingClass: "mb-6" };
    case "projects":
      return { fontSizeClass: "text-sm", spacingClass: "mb-6" };
    case "certifications":
      return { fontSizeClass: "text-sm", spacingClass: "mb-6" };
    default:
      return { fontSizeClass: "text-sm", spacingClass: "mb-6" };
  }
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Mail, Phone, MapPin, Calendar, Building, GraduationCap, Award, Briefcase } from "lucide-react";
import { ResumeSection } from "@/components/resume/ResumeSectionCustomizer";


interface ResumePreviewPanelProps {
  content: any;
  primaryColor: string;
  templateStyle?: string;
  sections?: ResumeSection[];
}

export const ResumePreviewPanel = ({ content, primaryColor, templateStyle = "classic", sections }: ResumePreviewPanelProps) => {
  const profile = content.profile || {};
  const employment = content.employment || [];
  const education = content.education || [];
  const skills = content.skills || [];
  const projects = content.projects || [];
  const certifications = content.certifications || [];
  // Basic style logic for template
  let fontSizeClass = 'text-sm';
  let cardClass = '';
  // Default font family for preview
  const fontFamily = 'Inter, Arial, sans-serif';
  if (templateStyle === 'modern') {
    fontSizeClass = 'text-base';
    cardClass = 'shadow-lg border-2 border-primary';
  } else if (templateStyle === 'creative') {
    fontSizeClass = 'text-base font-mono';
    cardClass = 'bg-gradient-to-br from-primary/10 to-white border-0';
  } else if (templateStyle === 'entry') {
    fontSizeClass = 'text-sm';
    cardClass = 'border-dashed';
  }

  // Get enabled sections sorted by order
  const enabledSections = sections
    ?.filter(s => s.enabled)
    .sort((a, b) => a.order - b.order) || [];
  // Helper to check if a section should be shown
  const isSectionEnabled = (sectionId: string) => {
    if (!sections || sections.length === 0) return true;
    return enabledSections.some(s => s.id === sectionId);
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

  // Map templateStyle to layout
  let layout: "single-column" | "two-column" | "sidebar" | "compact" = "single-column";
  if (templateStyle === "modern") layout = "two-column";
  else if (templateStyle === "creative") layout = "sidebar";
  else if (templateStyle === "entry") layout = "compact";

  return (
    <Card className={`h-full ${cardClass}`}>
      {/* CardHeader with title removed for template previews */}
      <CardContent>
        {layout === "two-column" ? (
          // Two-column layout: sidebar + main content
          <div 
            className={`resume-preview-content bg-white text-gray-900 p-8 rounded-lg shadow-inner border ${fontSizeClass}`}
            style={{ fontFamily }}
          >
            <div className="grid grid-cols-3 gap-6">
              {/* Sidebar - 1/3 width */}
              <div className="col-span-1 space-y-4">
                {/* Profile Picture Placeholder */}
                <div className="w-32 h-32 rounded-full mx-auto mb-4" style={{ backgroundColor: primaryColor, opacity: 0.2 }} />
                
                {/* Contact Info */}
                <div className="space-y-2">
                  <h3 className="font-bold text-sm uppercase mb-2" style={{ color: primaryColor }}>Contact</h3>
                  {profile.email && (
                    <div className="flex items-start gap-2 text-xs">
                      <Mail className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span className="break-all">{profile.email}</span>
                    </div>
                  )}
                  {profile.phone && (
                    <div className="flex items-start gap-2 text-xs">
                      <Phone className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                  {profile.location && (
                    <div className="flex items-start gap-2 text-xs">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                </div>

                {/* Skills in sidebar */}
                {skills.length > 0 && isSectionEnabled('skills') && (
                  <div>
                    <h3 className="font-bold text-sm uppercase mb-2" style={{ color: primaryColor }}>Skills</h3>
                    <div className="flex flex-wrap gap-1">
                      {skills.slice(0, 8).map((skill: any, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill.skill_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education in sidebar */}
                {education.length > 0 && isSectionEnabled('education') && (
                  <div>
                    <h3 className="font-bold text-sm uppercase mb-2" style={{ color: primaryColor }}>Education</h3>
                    <div className="space-y-2">
                      {education.map((edu: any, index: number) => (
                        <div key={index} className="text-xs">
                          <p className="font-semibold">{edu.degree_type}</p>
                          <p className="text-gray-600">{edu.field_of_study}</p>
                          <p className="text-gray-500">{edu.institution_name}</p>
                          {edu.graduation_date && (
                            <p className="text-gray-500">{new Date(edu.graduation_date).getFullYear()}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Main Content - 2/3 width */}
              <div className="col-span-2 space-y-4">
                {/* Name and Headline */}
                <div className="mb-4">
                  <h1 className="text-3xl font-bold mb-1" style={{ color: primaryColor }}>
                    {profile.first_name} {profile.last_name}
                  </h1>
                  {profile.headline && (
                    <p className="text-lg text-gray-600">{profile.headline}</p>
                  )}
                </div>

                {/* Summary */}
                {sectionComponents.summary}

                {/* Experience */}
                {sectionComponents.experience}

                {/* Projects */}
                {sectionComponents.projects}

                {/* Certifications */}
                {sectionComponents.certifications}
              </div>
            </div>
          </div>
        ) : layout === "sidebar" ? (
          // Sidebar layout: colored sidebar + white content
          <div 
            className={`resume-preview-content bg-white rounded-lg shadow-inner border overflow-hidden ${fontSizeClass}`}
            style={{ fontFamily }}
          >
            <div className="grid grid-cols-3">
              {/* Colored Sidebar */}
              <div className="col-span-1 text-white p-6 space-y-4" style={{ backgroundColor: primaryColor }}>
                {/* Profile Picture Placeholder */}
                <div className="w-24 h-24 rounded-full bg-white opacity-20 mx-auto mb-4" />
                
                <div className="text-center mb-4">
                  <h1 className="text-xl font-bold mb-1">
                    {profile.first_name} {profile.last_name}
                  </h1>
                  {profile.headline && (
                    <p className="text-sm opacity-90">{profile.headline}</p>
                  )}
                </div>

                {/* Contact */}
                <div>
                  <h3 className="font-bold text-sm uppercase mb-2 border-b border-white/30 pb-1">Contact</h3>
                  <div className="space-y-2 text-xs">
                    {profile.email && (
                      <div className="flex items-start gap-2">
                        <Mail className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="break-all">{profile.email}</span>
                      </div>
                    )}
                    {profile.phone && (
                      <div className="flex items-start gap-2">
                        <Phone className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{profile.phone}</span>
                      </div>
                    )}
                    {profile.location && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{profile.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Skills */}
                {skills.length > 0 && isSectionEnabled('skills') && (
                  <div>
                    <h3 className="font-bold text-sm uppercase mb-2 border-b border-white/30 pb-1">Skills</h3>
                    <div className="space-y-1 text-xs">
                      {skills.slice(0, 10).map((skill: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="h-1 w-1 rounded-full bg-white" />
                          {skill.skill_name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {education.length > 0 && isSectionEnabled('education') && (
                  <div>
                    <h3 className="font-bold text-sm uppercase mb-2 border-b border-white/30 pb-1">Education</h3>
                    <div className="space-y-3 text-xs">
                      {education.map((edu: any, index: number) => (
                        <div key={index}>
                          <p className="font-semibold">{edu.degree_type}</p>
                          <p className="opacity-90">{edu.field_of_study}</p>
                          <p className="opacity-75">{edu.institution_name}</p>
                          {edu.graduation_date && (
                            <p className="opacity-75">{new Date(edu.graduation_date).getFullYear()}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Main Content */}
              <div className="col-span-2 p-8 space-y-4 text-gray-900">
                {sectionComponents.summary}
                {sectionComponents.experience}
                {sectionComponents.projects}
                {sectionComponents.certifications}
              </div>
            </div>
          </div>
        ) : layout === "compact" ? (
          // Compact layout: horizontal header + grid content
          <div 
            className={`resume-preview-content bg-white text-gray-900 p-6 rounded-lg shadow-inner border ${fontSizeClass}`}
            style={{ fontFamily }}
          >
            {/* Horizontal Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2" style={{ borderColor: primaryColor }}>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>
                  {profile.first_name} {profile.last_name}
                </h1>
                {profile.headline && (
                  <p className="text-sm text-gray-600">{profile.headline}</p>
                )}
              </div>
              <div className="text-right text-xs text-gray-600 space-y-1">
                {profile.email && <div className="flex items-center gap-1 justify-end"><Mail className="h-3 w-3" />{profile.email}</div>}
                {profile.phone && <div className="flex items-center gap-1 justify-end"><Phone className="h-3 w-3" />{profile.phone}</div>}
                {profile.location && <div className="flex items-center gap-1 justify-end"><MapPin className="h-3 w-3" />{profile.location}</div>}
              </div>
            </div>

            {/* Grid Content */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                {sectionComponents.summary}
                {sectionComponents.skills}
              </div>
              <div className="space-y-3">
                {sectionComponents.experience}
                {sectionComponents.education}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {sectionComponents.projects}
              {sectionComponents.certifications}
            </div>
          </div>
        ) : (
          // Default single-column layout
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
        )}
      </CardContent>
    </Card>
  );
};
