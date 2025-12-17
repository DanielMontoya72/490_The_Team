import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileDown, FileText, Mail, Printer } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

interface ContactInfo {
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
}

interface CoverLetterExportProps {
  content: string;
  jobTitle: string;
  companyName: string;
  applicantName: string;
  onContentUpdate?: (content: string) => void;
}

export function CoverLetterExport({ content, jobTitle, companyName, applicantName, onContentUpdate }: CoverLetterExportProps) {
  const [loading, setLoading] = useState(false);
  const [formatStyle, setFormatStyle] = useState('professional');
  const [includeLetterhead, setIncludeLetterhead] = useState(true);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    email: '',
    phone: '',
    location: '',
    linkedin: ''
  });

  const generateFilename = () => {
    const date = new Date().toISOString().split('T')[0];
    const cleanCompany = companyName.replace(/[^a-z0-9]/gi, '_');
    const cleanTitle = jobTitle.replace(/[^a-z0-9]/gi, '_');
    return `CoverLetter_${cleanCompany}_${cleanTitle}_${date}`;
  };

  const exportAsPDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = formatStyle === 'minimal' ? 15 : 20;
      const maxWidth = pageWidth - (margin * 2);
      
      let yPosition = margin;

      // Apply styling based on format
      const applyFormatStyle = () => {
        switch (formatStyle) {
          case 'modern':
            doc.setFont('helvetica');
            break;
          case 'classic':
            doc.setFont('times');
            break;
          case 'minimal':
            doc.setFont('courier');
            break;
          default:
            doc.setFont('helvetica');
        }
      };

      applyFormatStyle();

      // Add letterhead if enabled
      if (includeLetterhead) {
        if (formatStyle === 'modern') {
          // Modern style with accent line
          doc.setFillColor(59, 130, 246);
          doc.rect(margin, yPosition, maxWidth, 2, 'F');
          yPosition += 8;
          
          doc.setFontSize(18);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(59, 130, 246);
          doc.text(applicantName, margin, yPosition);
          yPosition += 6;
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 100, 100);
          if (contactInfo.email) {
            doc.text(`✉ ${contactInfo.email}`, margin, yPosition);
            yPosition += 5;
          }
          if (contactInfo.phone) {
            doc.text(`☎ ${contactInfo.phone}`, margin, yPosition);
            yPosition += 5;
          }
          if (contactInfo.location) {
            doc.text(`📍 ${contactInfo.location}`, margin, yPosition);
            yPosition += 5;
          }
          doc.setTextColor(0, 0, 0);
          yPosition += 5;
        } else if (formatStyle === 'classic') {
          // Classic centered letterhead
          doc.setFontSize(14);
          doc.setFont('times', 'bold');
          const nameWidth = doc.getTextWidth(applicantName);
          doc.text(applicantName, (pageWidth - nameWidth) / 2, yPosition);
          yPosition += 5;
          
          doc.setFontSize(9);
          doc.setFont('times', 'normal');
          const contactLine = [contactInfo.email, contactInfo.phone].filter(Boolean).join(' | ');
          if (contactLine) {
            const contactWidth = doc.getTextWidth(contactLine);
            doc.text(contactLine, (pageWidth - contactWidth) / 2, yPosition);
            yPosition += 5;
          }
          if (contactInfo.location) {
            const locWidth = doc.getTextWidth(contactInfo.location);
            doc.text(contactInfo.location, (pageWidth - locWidth) / 2, yPosition);
            yPosition += 5;
          }
          yPosition += 5;
          doc.setLineWidth(0.5);
          doc.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 10;
        } else if (formatStyle === 'minimal') {
          // Minimal style
          doc.setFontSize(10);
          doc.setFont('courier', 'bold');
          doc.text(applicantName, margin, yPosition);
          yPosition += 5;
          
          doc.setFontSize(8);
          doc.setFont('courier', 'normal');
          if (contactInfo.email) {
            doc.text(contactInfo.email, margin, yPosition);
            yPosition += 4;
          }
          if (contactInfo.phone) {
            doc.text(contactInfo.phone, margin, yPosition);
            yPosition += 4;
          }
          yPosition += 8;
        } else {
          // Professional style
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(applicantName, margin, yPosition);
          yPosition += 6;
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          const contactParts = [contactInfo.email, contactInfo.phone, contactInfo.location].filter(Boolean);
          if (contactParts.length > 0) {
            doc.text(contactParts.join(' • '), margin, yPosition);
            yPosition += 5;
          }
          yPosition += 5;
        }
        
        const date = new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        doc.setFontSize(10);
        doc.text(date, margin, yPosition);
        yPosition += 12;
      }

      // Add company information
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`${companyName}`, margin, yPosition);
      yPosition += 6;
      doc.text(`Re: ${jobTitle}`, margin, yPosition);
      yPosition += 12;

      // Add content
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(content, maxWidth);
      
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 6;
      });

      doc.save(`${generateFilename()}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setLoading(false);
    }
  };

  const exportAsDOCX = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-cover-letter-docx', {
        body: {
          content,
          jobTitle,
          companyName,
          applicantName,
          includeLetterhead,
          formatStyle,
          contactInfo
        }
      });

      if (error) throw error;

      // Convert base64 to blob
      const byteCharacters = atob(data.docx);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      // Download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generateFilename()}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('DOCX exported successfully');
    } catch (error) {
      console.error('DOCX export error:', error);
      toast.error('Failed to export DOCX');
    } finally {
      setLoading(false);
    }
  };

  const exportAsText = () => {
    const textContent = `
${includeLetterhead ? `${applicantName}\n${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n` : ''}${companyName}
Re: ${jobTitle}

${content}
    `.trim();

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generateFilename()}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success('Text file exported successfully');
  };

  const copyForEmail = () => {
    const emailContent = `
Subject: Application for ${jobTitle} at ${companyName}

Dear Hiring Manager,

${content}

Sincerely,
${applicantName}
    `.trim();

    navigator.clipboard.writeText(emailContent);
    toast.success('Email template copied to clipboard');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print');
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Cover Letter - ${jobTitle}</title>
          <style>
            @media print {
              body { margin: 1in; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; }
              .letterhead { margin-bottom: 1em; }
              .company-info { margin-bottom: 1em; }
              .content { text-align: justify; }
            }
          </style>
        </head>
        <body>
          ${includeLetterhead ? `
            <div class="letterhead">
              <strong>${applicantName}</strong><br>
              ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          ` : ''}
          <div class="company-info">
            <strong>${companyName}</strong><br>
            Re: ${jobTitle}
          </div>
          <div class="content">
            ${content.split('\n').map(p => `<p>${p}</p>`).join('')}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Cover Letter</CardTitle>
        <CardDescription>
          Download your cover letter in various formats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="format-style">Formatting Style</Label>
            <Select value={formatStyle} onValueChange={setFormatStyle}>
              <SelectTrigger id="format-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional - Clean and business-appropriate</SelectItem>
                <SelectItem value="modern">Modern - Blue accents with contemporary layout</SelectItem>
                <SelectItem value="classic">Classic - Traditional serif fonts, centered header</SelectItem>
                <SelectItem value="minimal">Minimal - Simplified design, maximum content focus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="letterhead"
              checked={includeLetterhead}
              onChange={(e) => setIncludeLetterhead(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="letterhead" className="cursor-pointer">
              Include custom letterhead
            </Label>
          </div>

          {includeLetterhead && (
            <div className="grid gap-3 pl-6 border-l-2 border-muted">
              <div className="grid gap-1">
                <Label htmlFor="email" className="text-sm">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={contactInfo.email}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="phone" className="text-sm">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={contactInfo.phone}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="location" className="text-sm">Location</Label>
                <Input
                  id="location"
                  placeholder="City, State"
                  value={contactInfo.location}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="linkedin" className="text-sm">LinkedIn Profile (optional)</Label>
                <Input
                  id="linkedin"
                  placeholder="linkedin.com/in/yourprofile"
                  value={contactInfo.linkedin}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, linkedin: e.target.value }))}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={exportAsPDF}
            disabled={loading}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>

          <Button
            variant="outline"
            onClick={exportAsDOCX}
            disabled={loading}
          >
            <FileText className="h-4 w-4 mr-2" />
            Export DOCX
          </Button>

          <Button
            variant="outline"
            onClick={exportAsText}
          >
            <FileText className="h-4 w-4 mr-2" />
            Plain Text
          </Button>

          <Button
            variant="outline"
            onClick={copyForEmail}
          >
            <Mail className="h-4 w-4 mr-2" />
            Email Template
          </Button>

          <Button
            variant="outline"
            onClick={handlePrint}
            className="col-span-2"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Filename: {generateFilename()}
        </p>
      </CardContent>
    </Card>
  );
}
