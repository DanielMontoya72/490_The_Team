import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, jobTitle, companyName, applicantName, includeLetterhead, formatStyle, contactInfo } = await req.json();

    if (!content || !jobTitle || !companyName || !applicantName) {
      throw new Error('Missing required fields');
    }

    // Create DOCX content structure
    const docxContent = createDOCXStructure({
      content,
      jobTitle,
      companyName,
      applicantName,
      includeLetterhead,
      formatStyle,
      contactInfo: contactInfo || {}
    });

    // Convert to base64
    const base64Content = btoa(String.fromCharCode(...docxContent));

    return new Response(
      JSON.stringify({ docx: base64Content }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating DOCX:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function createDOCXStructure(params: {
  content: string;
  jobTitle: string;
  companyName: string;
  applicantName: string;
  includeLetterhead: boolean;
  formatStyle: string;
  contactInfo: {
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
  };
}): Uint8Array {
  const { content, jobTitle, companyName, applicantName, includeLetterhead, formatStyle, contactInfo } = params;
  
  // Simple DOCX structure with proper XML formatting
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Get styling based on format style
  const fontFamily = formatStyle === 'modern' ? 'Calibri' : 'Times New Roman';
  const fontSizeNum = formatStyle === 'minimal' ? 11 : 12;
  const fontSizeStr = (fontSizeNum * 2).toString();

  // Build document parts
  let documentBody = '';

  if (includeLetterhead) {
    // Header with name
    documentBody += `
      <w:p>
        <w:pPr><w:jc w:val="${formatStyle === 'classic' ? 'center' : 'left'}"/></w:pPr>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:sz w:val="${formatStyle === 'modern' ? '32' : '28'}"/>
            ${formatStyle === 'modern' ? '<w:color w:val="3B82F6"/>' : ''}
          </w:rPr>
          <w:t>${escapeXml(applicantName)}</w:t>
        </w:r>
      </w:p>
    `;

    // Contact information
    if (contactInfo.email || contactInfo.phone || contactInfo.location) {
      const contactParts = [];
      if (contactInfo.email) contactParts.push(contactInfo.email);
      if (contactInfo.phone) contactParts.push(contactInfo.phone);
      if (contactInfo.location) contactParts.push(contactInfo.location);
      
      const contactText = formatStyle === 'classic' 
        ? contactParts.join(' | ')
        : contactParts.join(' • ');

      documentBody += `
        <w:p>
          <w:pPr><w:jc w:val="${formatStyle === 'classic' ? 'center' : 'left'}"/></w:pPr>
          <w:r>
            <w:rPr><w:sz w:val="18"/></w:rPr>
            <w:t>${escapeXml(contactText)}</w:t>
          </w:r>
        </w:p>
      `;
    }

    if (contactInfo.linkedin) {
      documentBody += `
        <w:p>
          <w:pPr><w:jc w:val="${formatStyle === 'classic' ? 'center' : 'left'}"/></w:pPr>
          <w:r>
            <w:rPr><w:sz w:val="18"/></w:rPr>
            <w:t>${escapeXml(contactInfo.linkedin)}</w:t>
          </w:r>
        </w:p>
      `;
    }

    // Date
    documentBody += `
      <w:p>
        <w:pPr><w:jc w:val="${formatStyle === 'classic' ? 'center' : 'left'}"/></w:pPr>
        <w:r>
          <w:rPr><w:sz w:val="20"/></w:rPr>
          <w:t>${escapeXml(date)}</w:t>
        </w:r>
      </w:p>
      <w:p/>
    `;
  }

  documentBody += `
    <w:p>
      <w:r>
        <w:rPr><w:b/></w:rPr>
        <w:t>${escapeXml(companyName)}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Re: ${escapeXml(jobTitle)}</w:t>
      </w:r>
    </w:p>
    <w:p/>
  `;

  // Add content paragraphs
  const paragraphs = content.split('\n').filter(p => p.trim());
  paragraphs.forEach(paragraph => {
    documentBody += `
      <w:p>
        <w:pPr><w:jc w:val="both"/></w:pPr>
        <w:r>
          <w:rPr><w:sz w:val="${fontSizeStr}"/></w:rPr>
          <w:t>${escapeXml(paragraph)}</w:t>
        </w:r>
      </w:p>
    `;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${documentBody}
  </w:body>
</w:document>`;

  // Create minimal DOCX structure
  const encoder = new TextEncoder();
  const xmlBytes = encoder.encode(xml);

  // For simplicity, return the XML as bytes
  // In production, this would be packaged as a proper DOCX ZIP file
  return xmlBytes;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
