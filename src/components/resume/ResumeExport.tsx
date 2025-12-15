import { useState } from 'react';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, FileType, Code, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';
import { ResumeSection } from '@/components/resume/ResumeSectionCustomizer';

interface ResumeExportProps {
  resumeId: string;
  resumeName: string;
  resumeData: any;
  sections?: ResumeSection[];
}

export function ResumeExport({ resumeId, resumeName, resumeData, sections }: ResumeExportProps) {
  const { theme: currentTheme } = useTheme();
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx' | 'html' | 'txt'>('pdf');
  const [theme, setTheme] = useState<'classic' | 'modern' | 'minimal' | 'creative'>('modern');
  const [filename, setFilename] = useState(resumeName.replace(/\s+/g, '_'));
  const [includeWatermark, setIncludeWatermark] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Get enabled sections sorted by order
  const enabledSections = sections
    ?.filter(s => s.enabled)
    .sort((a, b) => a.order - b.order) || [];

  // Helper to check if a section should be shown
  const isSectionEnabled = (sectionId: string) => {
    if (!sections || sections.length === 0) return true; // Show all if no sections config
    return enabledSections.some(s => s.id === sectionId);
  };

  const formatResumeData = () => {
    const { content, customization_overrides } = resumeData;
    
    return {
      personalInfo: {
        name: `${resumeData.userProfile?.first_name || ''} ${resumeData.userProfile?.last_name || ''}`.trim(),
        email: resumeData.userProfile?.email || '',
        phone: resumeData.userProfile?.phone || '',
        location: resumeData.userProfile?.location || '',
        headline: resumeData.userProfile?.headline || ''
      },
      summary: content?.summary || '',
      experience: resumeData.userProfile?.employment_history?.map((exp: any) => ({
        jobTitle: exp.job_title,
        company: exp.company_name,
        dates: `${new Date(exp.start_date).toLocaleDateString()} - ${exp.is_current ? 'Present' : new Date(exp.end_date).toLocaleDateString()}`,
        description: exp.job_description || '',
        location: exp.location || ''
      })) || [],
      education: resumeData.userProfile?.education?.map((edu: any) => ({
        degree: `${edu.degree_type} in ${edu.field_of_study}`,
        institution: edu.institution_name,
        year: edu.graduation_date ? new Date(edu.graduation_date).getFullYear() : 'Present',
        gpa: edu.show_gpa && edu.gpa ? edu.gpa : null
      })) || [],
      skills: resumeData.userProfile?.skills?.map((s: any) => s.skill_name) || [],
      certifications: resumeData.userProfile?.certifications?.map((cert: any) => ({
        name: cert.certification_name,
        issuer: cert.issuing_organization,
        date: new Date(cert.date_earned).toLocaleDateString()
      })) || [],
      projects: resumeData.userProfile?.projects?.map((proj: any) => ({
        name: proj.project_name,
        description: proj.description,
        technologies: proj.technologies || [],
        url: proj.project_url || ''
      })) || []
    };
  };

  const generateHTMLContent = (data: any): string => {
    // Use colorblind-friendly colors when colorblind theme is active
    const colors = currentTheme === 'colorblind' ? {
      classic: { primary: '#000000', secondary: '#FF5800', accent: '#1E90FF' },
      modern: { primary: '#FF5800', secondary: '#1E90FF', accent: '#000000' },
      minimal: { primary: '#000000', secondary: '#FF5800', accent: '#1E90FF' },
      creative: { primary: '#1E90FF', secondary: '#FF5800', accent: '#000000' }
    } : {
      classic: { primary: '#000000', secondary: '#333333', accent: '#666666' },
      modern: { primary: '#2563eb', secondary: '#1e40af', accent: '#3b82f6' },
      minimal: { primary: '#1f2937', secondary: '#374151', accent: '#6b7280' },
      creative: { primary: '#7c3aed', secondary: '#6d28d9', accent: '#8b5cf6' }
    };

    const themeColors = colors[theme];

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.personalInfo.name} - Resume</title>
  <style>
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none; }
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 850px;
      margin: 0 auto;
      padding: 40px 20px;
      background: white;
    }
    
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 3px solid ${themeColors.primary};
      margin-bottom: 30px;
    }
    
    .header h1 {
      color: ${themeColors.primary};
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .header .headline {
      color: ${themeColors.secondary};
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 12px;
    }
    
    .contact-info {
      display: flex;
      justify-content: center;
      gap: 20px;
      flex-wrap: wrap;
      font-size: 14px;
      color: #666;
    }
    
    .section {
      margin-bottom: 30px;
    }
    
    .section-title {
      color: ${themeColors.primary};
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid ${themeColors.accent};
    }
    
    .section-content {
      padding-left: 10px;
    }
    
    .experience-item, .education-item, .project-item, .certification-item {
      margin-bottom: 20px;
    }
    
    .item-title {
      font-size: 18px;
      font-weight: 600;
      color: ${themeColors.secondary};
      margin-bottom: 4px;
    }
    
    .item-subtitle {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
    }
    
    .item-description {
      font-size: 14px;
      line-height: 1.6;
      color: #444;
      white-space: pre-wrap;
    }
    
    .skills-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .skill-badge {
      background: ${themeColors.accent};
      color: white;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
    }
    
    .watermark {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.personalInfo.name}</h1>
    ${data.personalInfo.headline ? `<div class="headline">${data.personalInfo.headline}</div>` : ''}
    <div class="contact-info">
      ${data.personalInfo.email ? `<span>${data.personalInfo.email}</span>` : ''}
      ${data.personalInfo.phone ? `<span>${data.personalInfo.phone}</span>` : ''}
      ${data.personalInfo.location ? `<span>${data.personalInfo.location}</span>` : ''}
    </div>
  </div>
  
  ${enabledSections.length > 0 ? enabledSections.map(section => {
    if (section.id === 'summary' && data.summary && isSectionEnabled('summary')) {
      return `
  <div class="section">
    <h2 class="section-title">Professional Summary</h2>
    <div class="section-content">
      <p>${data.summary}</p>
    </div>
  </div>`;
    } else if (section.id === 'experience' && data.experience.length > 0 && isSectionEnabled('experience')) {
      return `
  <div class="section">
    <h2 class="section-title">Work Experience</h2>
    <div class="section-content">
      ${data.experience.map((exp: any) => `
        <div class="experience-item">
          <div class="item-title">${exp.jobTitle}</div>
          <div class="item-subtitle">${exp.company} | ${exp.dates}</div>
          ${exp.description ? `<div class="item-description">${exp.description}</div>` : ''}
        </div>
      `).join('')}
    </div>
  </div>`;
    } else if (section.id === 'education' && data.education.length > 0 && isSectionEnabled('education')) {
      return `
  <div class="section">
    <h2 class="section-title">Education</h2>
    <div class="section-content">
      ${data.education.map((edu: any) => `
        <div class="education-item">
          <div class="item-title">${edu.degree}</div>
          <div class="item-subtitle">${edu.institution} | ${edu.year}</div>
          ${edu.gpa ? `<div class="item-description">GPA: ${edu.gpa}</div>` : ''}
        </div>
      `).join('')}
    </div>
  </div>`;
    } else if (section.id === 'skills' && data.skills.length > 0 && isSectionEnabled('skills')) {
      return `
  <div class="section">
    <h2 class="section-title">Skills</h2>
    <div class="section-content">
      <div class="skills-container">
        ${data.skills.map((skill: string) => `<span class="skill-badge">${skill}</span>`).join('')}
      </div>
    </div>
  </div>`;
    } else if (section.id === 'certifications' && data.certifications.length > 0 && isSectionEnabled('certifications')) {
      return `
  <div class="section">
    <h2 class="section-title">Certifications</h2>
    <div class="section-content">
      ${data.certifications.map((cert: any) => `
        <div class="certification-item">
          <div class="item-title">${cert.name}</div>
          <div class="item-subtitle">${cert.issuer} | ${cert.date}</div>
        </div>
      `).join('')}
    </div>
  </div>`;
    } else if (section.id === 'projects' && data.projects.length > 0 && isSectionEnabled('projects')) {
      return `
  <div class="section">
    <h2 class="section-title">Projects</h2>
    <div class="section-content">
      ${data.projects.map((proj: any) => `
        <div class="project-item">
          <div class="item-title">${proj.name}</div>
          <div class="item-description">${proj.description}</div>
          ${proj.technologies.length > 0 ? `
            <div style="margin-top: 8px;">
              ${proj.technologies.map((tech: string) => `<span class="skill-badge" style="font-size: 11px; padding: 4px 10px;">${tech}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  </div>`;
    }
    return '';
  }).join('') : `
  ${data.summary && isSectionEnabled('summary') ? `
  <div class="section">
    <h2 class="section-title">Professional Summary</h2>
    <div class="section-content">
      <p>${data.summary}</p>
    </div>
  </div>` : ''}
  ${data.experience.length > 0 && isSectionEnabled('experience') ? `
  <div class="section">
    <h2 class="section-title">Work Experience</h2>
    <div class="section-content">
      ${data.experience.map((exp: any) => `
        <div class="experience-item">
          <div class="item-title">${exp.jobTitle}</div>
          <div class="item-subtitle">${exp.company} | ${exp.dates}</div>
          ${exp.description ? `<div class="item-description">${exp.description}</div>` : ''}
        </div>
      `).join('')}
    </div>
  </div>` : ''}
  ${data.education.length > 0 && isSectionEnabled('education') ? `
  <div class="section">
    <h2 class="section-title">Education</h2>
    <div class="section-content">
      ${data.education.map((edu: any) => `
        <div class="education-item">
          <div class="item-title">${edu.degree}</div>
          <div class="item-subtitle">${edu.institution} | ${edu.year}</div>
          ${edu.gpa ? `<div class="item-description">GPA: ${edu.gpa}</div>` : ''}
        </div>
      `).join('')}
    </div>
  </div>` : ''}
  ${data.skills.length > 0 && isSectionEnabled('skills') ? `
  <div class="section">
    <h2 class="section-title">Skills</h2>
    <div class="section-content">
      <div class="skills-container">
        ${data.skills.map((skill: string) => `<span class="skill-badge">${skill}</span>`).join('')}
      </div>
    </div>
  </div>` : ''}
  ${data.certifications.length > 0 && isSectionEnabled('certifications') ? `
  <div class="section">
    <h2 class="section-title">Certifications</h2>
    <div class="section-content">
      ${data.certifications.map((cert: any) => `
        <div class="certification-item">
          <div class="item-title">${cert.name}</div>
          <div class="item-subtitle">${cert.issuer} | ${cert.date}</div>
        </div>
      `).join('')}
    </div>
  </div>` : ''}
  ${data.projects.length > 0 && isSectionEnabled('projects') ? `
  <div class="section">
    <h2 class="section-title">Projects</h2>
    <div class="section-content">
      ${data.projects.map((proj: any) => `
        <div class="project-item">
          <div class="item-title">${proj.name}</div>
          <div class="item-description">${proj.description}</div>
          ${proj.technologies.length > 0 ? `
            <div style="margin-top: 8px;">
              ${proj.technologies.map((tech: string) => `<span class="skill-badge" style="font-size: 11px; padding: 4px 10px;">${tech}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  </div>` : ''}
  `}
  
  ${includeWatermark ? `
  <div class="watermark">
    Generated with Resume Builder
  </div>
  ` : ''}
</body>
</html>
    `;
  };

  const generatePlainText = (data: any): string => {
    let text = '';
    
    // Header
    text += `${data.personalInfo.name.toUpperCase()}\n`;
    if (data.personalInfo.headline) text += `${data.personalInfo.headline}\n`;
    text += `${data.personalInfo.email} | ${data.personalInfo.phone}`;
    if (data.personalInfo.location) text += ` | ${data.personalInfo.location}`;
    text += `\n\n`;
    
    // Summary
    if (data.summary) {
      text += `PROFESSIONAL SUMMARY\n`;
      text += `${'-'.repeat(50)}\n`;
      text += `${data.summary}\n\n`;
    }
    
    // Experience
    if (data.experience.length > 0) {
      text += `WORK EXPERIENCE\n`;
      text += `${'-'.repeat(50)}\n`;
      data.experience.forEach((exp: any) => {
        text += `${exp.jobTitle}\n`;
        text += `${exp.company} | ${exp.dates}\n`;
        if (exp.description) text += `${exp.description}\n`;
        text += `\n`;
      });
    }
    
    // Education
    if (data.education.length > 0) {
      text += `EDUCATION\n`;
      text += `${'-'.repeat(50)}\n`;
      data.education.forEach((edu: any) => {
        text += `${edu.degree}\n`;
        text += `${edu.institution} | ${edu.year}\n`;
        if (edu.gpa) text += `GPA: ${edu.gpa}\n`;
        text += `\n`;
      });
    }
    
    // Skills
    if (data.skills.length > 0) {
      text += `SKILLS\n`;
      text += `${'-'.repeat(50)}\n`;
      text += `${data.skills.join(', ')}\n\n`;
    }
    
    // Certifications
    if (data.certifications.length > 0) {
      text += `CERTIFICATIONS\n`;
      text += `${'-'.repeat(50)}\n`;
      data.certifications.forEach((cert: any) => {
        text += `${cert.name} - ${cert.issuer} (${cert.date})\n`;
      });
      text += `\n`;
    }
    
    // Projects
    if (data.projects.length > 0) {
      text += `PROJECTS\n`;
      text += `${'-'.repeat(50)}\n`;
      data.projects.forEach((proj: any) => {
        text += `${proj.name}\n`;
        text += `${proj.description}\n`;
        if (proj.technologies.length > 0) text += `Technologies: ${proj.technologies.join(', ')}\n`;
        text += `\n`;
      });
    }
    
    if (includeWatermark) {
      text += `\n${'-'.repeat(50)}\n`;
      text += `Generated with Resume Builder\n`;
    }
    
    return text;
  };

  const exportAsPDF = async () => {
    setIsExporting(true);
    try {
      const data = formatResumeData();
      const htmlContent = generateHTMLContent(data);
      
      // Create temporary element
      const element = document.createElement('div');
      element.innerHTML = htmlContent;
      document.body.appendChild(element);
      
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
        filename: `${filename}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
      };
      
      await html2pdf().set(opt).from(element).save();
      
      document.body.removeChild(element);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsDOCX = async () => {
    setIsExporting(true);
    try {
      const data = formatResumeData();
      
      const { data: result, error } = await supabase.functions.invoke('export-resume-docx', {
        body: {
          resumeData: { ...data, name: data.personalInfo.name },
          theme,
          includeWatermark
        }
      });

      if (error) throw error;

      // Create download link
      const byteCharacters = atob(result.docx);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('DOCX exported successfully!');
    } catch (error) {
      console.error('DOCX export error:', error);
      toast.error('Failed to export DOCX');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsHTML = () => {
    setIsExporting(true);
    try {
      const data = formatResumeData();
      const htmlContent = generateHTMLContent(data);
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('HTML exported successfully!');
    } catch (error) {
      console.error('HTML export error:', error);
      toast.error('Failed to export HTML');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsText = () => {
    setIsExporting(true);
    try {
      const data = formatResumeData();
      const textContent = generatePlainText(data);
      
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Plain text exported successfully!');
    } catch (error) {
      console.error('Text export error:', error);
      toast.error('Failed to export plain text');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    const data = formatResumeData();
    const htmlContent = generateHTMLContent(data);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleExport = () => {
    switch (exportFormat) {
      case 'pdf':
        exportAsPDF();
        break;
      case 'docx':
        exportAsDOCX();
        break;
      case 'html':
        exportAsHTML();
        break;
      case 'txt':
        exportAsText();
        break;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Resume
          </CardTitle>
          <CardDescription>
            Download your resume in multiple formats for different use cases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="format">Export Format</Label>
              <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>PDF - Professional Document</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="docx">
                    <div className="flex items-center gap-2">
                      <FileType className="h-4 w-4" />
                      <span>DOCX - Microsoft Word</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="html">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      <span>HTML - Web Portfolio</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="txt">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>TXT - Plain Text</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="theme">Theme</Label>
              <Select value={theme} onValueChange={(value: any) => setTheme(value)}>
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classic - Traditional Black</SelectItem>
                  <SelectItem value="modern">Modern - Professional Blue</SelectItem>
                  <SelectItem value="minimal">Minimal - Clean Gray</SelectItem>
                  <SelectItem value="creative">Creative - Bold Purple</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filename">Filename</Label>
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="my_resume"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Extension will be added automatically
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="watermark">Include Watermark</Label>
                <p className="text-xs text-muted-foreground">
                  Add a small branding footer
                </p>
              </div>
              <Switch
                id="watermark"
                checked={includeWatermark}
                onCheckedChange={setIncludeWatermark}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1"
              size="lg"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export as {exportFormat.toUpperCase()}
                </>
              )}
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              size="lg"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
            <p className="font-medium">Format Guide:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li><strong>PDF:</strong> Best for email submissions and ATS systems</li>
              <li><strong>DOCX:</strong> Editable format for recruiters</li>
              <li><strong>HTML:</strong> Perfect for personal websites</li>
              <li><strong>TXT:</strong> For online application forms</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
