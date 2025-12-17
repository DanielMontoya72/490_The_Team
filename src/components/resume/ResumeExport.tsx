import { useRef, useState } from 'react';
import { RESUME_TEMPLATES } from '@/data/seedData';
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
import SimpleResumeTemplate from '@/components/resume/SimpleResumeTemplate';
import { escapeText } from '@/lib/sanitize';

interface ResumeExportProps {
  resumeId: string;
  resumeName: string;
  resumeData: any;
  sections?: ResumeSection[];
}

export function ResumeExport({ resumeId, resumeName, resumeData, sections }: ResumeExportProps) {
  // Ref for the preview panel to export
  const previewRef = useRef<HTMLDivElement>(null);
  const { theme: currentTheme } = useTheme();
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx' | 'html' | 'txt'>('pdf');
  const [filename, setFilename] = useState(resumeName.replace(/\s+/g, '_'));
  const [includeWatermark, setIncludeWatermark] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // Only allow primary color customization
  const [primaryColor, setPrimaryColor] = useState(resumeData?.customization_overrides?.primaryColor || '#2563eb');

  // Template style and name
  const templateStyle = resumeData?.customization_overrides?.templateStyle || 'classic';
  const templateObj = RESUME_TEMPLATES.find(t => t.style === templateStyle);
  const templateName = templateObj ? templateObj.name : 'Classic';

  // Layout, font family, and font size customization
  const [layout, setLayout] = useState(resumeData?.customization_overrides?.layout || 'single-column');
  const [fontFamily, setFontFamily] = useState(resumeData?.customization_overrides?.fontFamily || 'Arial');
  const [fontSize, setFontSize] = useState(resumeData?.customization_overrides?.fontSize || '14px');

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
      skills: Array.isArray(resumeData.userProfile?.skills)
        ? resumeData.userProfile.skills.map((s: any) => typeof s === 'string' ? s : s.skill_name || '')
        : [],
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
  
  const generateHTMLContent = (data: any): string => {
    const sections: string[] = [];
    
    // Sanitize all user data to prevent XSS
    const safeName = escapeText(data.personalInfo.name);
    const safeHeadline = escapeText(data.personalInfo.headline);
    const safeEmail = escapeText(data.personalInfo.email);
    const safePhone = escapeText(data.personalInfo.phone);
    const safeLocation = escapeText(data.personalInfo.location);
  
    sections.push(`
      <header style="text-align:center;margin-bottom:16px;">
        <h1 style="margin:0;font-size:28px;font-weight:bold;">${safeName}</h1>
        ${safeHeadline ? `<p style=\"margin:4px 0;font-size:16px;\">${safeHeadline}</p>` : ""}
        <p style="margin:4px 0;font-size:14px;color:#4b5563;">
          ${[safeEmail, safePhone, safeLocation].filter(Boolean).join(" | ")}
        </p>
      </header>
    `);
  
    if (data.summary) {
      const safeSummary = escapeText(data.summary);
      sections.push(`
        <section style="margin-bottom:16px;">
          <h2 style="margin:0 0 4px 0;font-size:16px;border-bottom:1px solid #e5e7eb;">Professional Summary</h2>
          <p style="margin:0;font-size:14px;line-height:1.5;">${safeSummary}</p>
        </section>
      `);
    }
  
    if (data.experience.length > 0) {
      const items = data.experience.map((exp: any) => `
        <div style=\"margin-bottom:12px;\">
          <div style=\"font-weight:600;\">${escapeText(exp.jobTitle)}</div>
          <div style=\"font-size:13px;color:#4b5563;\">${escapeText(exp.company)} | ${escapeText(exp.dates)}</div>
          ${exp.description ? `<p style=\\\"margin:4px 0 0 0;font-size:14px;line-height:1.5;\\\">${escapeText(exp.description)}</p>` : ""}
        </div>
      `).join("");
  
      sections.push(`
        <section style="margin-bottom:16px;">
          <h2 style="margin:0 0 4px 0;font-size:16px;border-bottom:1px solid #e5e7eb;">Work Experience</h2>
          ${items}
        </section>
      `);
    }
  
    if (data.education.length > 0) {
      const items = data.education.map((edu: any) => `
        <div style=\"margin-bottom:8px;\">
          <div style=\"font-weight:600;\">${escapeText(edu.degree)}</div>
          <div style=\"font-size:13px;color:#4b5563;\">${escapeText(edu.institution)} | ${escapeText(String(edu.year))}${edu.gpa ? ` • GPA: ${escapeText(String(edu.gpa))}` : ""}</div>
        </div>
      `).join("");
  
      sections.push(`
        <section style="margin-bottom:16px;">
          <h2 style="margin:0 0 4px 0;font-size:16px;border-bottom:1px solid #e5e7eb;">Education</h2>
          ${items}
        </section>
      `);
    }
  
    if (data.skills.length > 0) {
      const safeSkills = data.skills.map((s: string) => escapeText(s)).join(', ');
      sections.push(`
        <section style="margin-bottom:16px;">
          <h2 style="margin:0 0 4px 0;font-size:16px;border-bottom:1px solid #e5e7eb;">Skills</h2>
          <p style="margin:0;font-size:14px;">${safeSkills}</p>
        </section>
      `);
    }
  
    if (data.certifications.length > 0) {
      const items = data.certifications.map((cert: any) => `
        <li>${escapeText(cert.name)} - ${escapeText(cert.issuer)} (${escapeText(cert.date)})</li>
      `).join("");
  
      sections.push(`
        <section style="margin-bottom:16px;">
          <h2 style="margin:0 0 4px 0;font-size:16px;border-bottom:1px solid #e5e7eb;">Certifications</h2>
          <ul style="margin:0 0 0 16px;font-size:14px;">${items}</ul>
        </section>
      `);
    }
  
    if (data.projects.length > 0) {
      const items = data.projects.map((proj: any) => `
        <div style=\"margin-bottom:12px;\">
          <div style=\"font-weight:600;\">${escapeText(proj.name)}</div>
          <p style=\"margin:4px 0 0 0;font-size:14px;line-height:1.5;\">${escapeText(proj.description)}</p>
        </div>
      `).join("");
  
      sections.push(`
        <section style="margin-bottom:16px;">
          <h2 style="margin:0 0 4px 0;font-size:16px;border-bottom:1px solid #e5e7eb;">Projects</h2>
          ${items}
        </section>
      `);
    }
  
    const watermark = includeWatermark
      ? `<footer style=\"margin-top:24px;font-size:11px;color:#9ca3af;text-align:center;\">Generated with Resume Builder</footer>`
      : "";
  
    const safeTitle = escapeText(`${data.personalInfo.name} - Resume`);
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 32px; color: #111827; }
      h1, h2 { color: #111827; }
    </style>
  </head>
  <body>
    ${sections.join('\n')}
    ${watermark}
  </body>
</html>`;
  };
 
  const exportAsPDF = async () => {
    setIsExporting(true);
    try {
      if (!previewRef.current) {
        toast.error('Preview not available for export');
        setIsExporting(false);
        return;
      }
      // Clone the preview node to avoid layout issues
      const node = previewRef.current.cloneNode(true) as HTMLElement;
      node.style.display = 'block';
      node.style.position = 'static';
      node.style.background = 'white';
      node.style.color = 'black';
      node.style.width = '794px'; // A4 width at 96dpi
      node.style.padding = '0';
      node.style.overflow = 'hidden';
      document.body.appendChild(node);
      const opt = {
        margin: 0,
        filename: `${filename}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, dpi: 96, letterRendering: true },
        jsPDF: { unit: 'pt' as const, format: 'a4' as const, orientation: 'portrait' as const },
      };
      await html2pdf().set(opt).from(node).save();
      document.body.removeChild(node);
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
          theme: currentTheme,
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
      {/* Hidden preview for export (WYSIWYG) */}
      <div
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          zIndex: -1,
          width: '100vw',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          background: 'transparent',
        }}
        aria-hidden
      >
        <div
          ref={previewRef}
          style={{
            width: '794px', // A4 width at 96dpi
            background: 'white',
            padding: 0,
            margin: 0,
            overflow: 'hidden',
            display: 'block',
            boxSizing: 'border-box',
          }}
        >
          <SimpleResumeTemplate data={formatResumeData()} primaryColor={primaryColor} templateStyle={templateStyle} />
        </div>
      </div>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download style={{ width: 24, height: 24 }} />
            Export Resume
          </h2>
          <div style={{ color: '#555', fontSize: 15, marginTop: 4 }}>
            Download your resume in multiple formats for different use cases
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <Label htmlFor="format">Export Format</Label>
            <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF - Professional Document</SelectItem>
                <SelectItem value="docx">DOCX - Microsoft Word</SelectItem>
                <SelectItem value="html">HTML - Web Portfolio</SelectItem>
                <SelectItem value="txt">TXT - Plain Text</SelectItem>
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
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              Extension will be added automatically
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <Label htmlFor="watermark">Include Watermark</Label>
              <div style={{ fontSize: 12, color: '#888' }}>Add a small branding footer</div>
            </div>
            <Switch
              id="watermark"
              checked={includeWatermark}
              onCheckedChange={setIncludeWatermark}
            />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              style={{ flex: 1 }}
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
          <div style={{ background: '#f6f6f6', borderRadius: 8, padding: 16, fontSize: 14, color: '#555' }}>
            <div style={{ fontWeight: 600 }}>Format Guide:</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li><strong>PDF:</strong> Best for email submissions and ATS systems</li>
              <li><strong>DOCX:</strong> Editable format for recruiters</li>
              <li><strong>HTML:</strong> Perfect for personal websites</li>
              <li><strong>TXT:</strong> For online application forms</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
