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
    const { resumeData, theme, includeWatermark } = await req.json();

    if (!resumeData) {
      return new Response(
        JSON.stringify({ error: 'Resume data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate DOCX content using Office Open XML format
    const docxContent = generateDocxXML(resumeData, theme, includeWatermark);
    
    // Convert to base64 for transmission
    const encoder = new TextEncoder();
    const data = encoder.encode(docxContent);
    const base64 = btoa(String.fromCharCode(...data));

    console.log('[export-resume-docx] DOCX generated successfully');

    return new Response(
      JSON.stringify({ 
        docx: base64,
        filename: `${resumeData.name.replace(/\s+/g, '_')}_Resume.docx`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[export-resume-docx] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate DOCX' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateDocxXML(resumeData: any, theme: string, includeWatermark: boolean): string {
  const { personalInfo, summary, experience, education, skills, certifications, projects } = resumeData;
  
  // Simplified DOCX XML structure
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <!-- Header with name and contact -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="200"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="32"/>
          <w:color w:val="${theme === 'modern' ? '2563eb' : '000000'}"/>
        </w:rPr>
        <w:t>${escapeXml(personalInfo.name)}</w:t>
      </w:r>
    </w:p>
    
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="200"/>
      </w:pPr>
      <w:r>
        <w:t>${escapeXml(personalInfo.email)} | ${escapeXml(personalInfo.phone)}</w:t>
      </w:r>
    </w:p>
    
    ${summary ? `
    <w:p>
      <w:pPr>
        <w:spacing w:before="200" w:after="100"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="24"/>
        </w:rPr>
        <w:t>PROFESSIONAL SUMMARY</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>${escapeXml(summary)}</w:t>
      </w:r>
    </w:p>
    ` : ''}
    
    ${experience && experience.length > 0 ? `
    <w:p>
      <w:pPr>
        <w:spacing w:before="200" w:after="100"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="24"/>
        </w:rPr>
        <w:t>WORK EXPERIENCE</w:t>
      </w:r>
    </w:p>
    ${experience.map((exp: any) => `
      <w:p>
        <w:pPr>
          <w:spacing w:before="100" w:after="50"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:b/>
          </w:rPr>
          <w:t>${escapeXml(exp.jobTitle)}</w:t>
        </w:r>
      </w:p>
      <w:p>
        <w:r>
          <w:t>${escapeXml(exp.company)} | ${escapeXml(exp.dates)}</w:t>
        </w:r>
      </w:p>
      <w:p>
        <w:r>
          <w:t>${escapeXml(exp.description)}</w:t>
        </w:r>
      </w:p>
    `).join('')}
    ` : ''}
    
    ${education && education.length > 0 ? `
    <w:p>
      <w:pPr>
        <w:spacing w:before="200" w:after="100"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="24"/>
        </w:rPr>
        <w:t>EDUCATION</w:t>
      </w:r>
    </w:p>
    ${education.map((edu: any) => `
      <w:p>
        <w:r>
          <w:rPr>
            <w:b/>
          </w:rPr>
          <w:t>${escapeXml(edu.degree)} - ${escapeXml(edu.institution)}</w:t>
        </w:r>
      </w:p>
      <w:p>
        <w:r>
          <w:t>${escapeXml(edu.year)}</w:t>
        </w:r>
      </w:p>
    `).join('')}
    ` : ''}
    
    ${skills && skills.length > 0 ? `
    <w:p>
      <w:pPr>
        <w:spacing w:before="200" w:after="100"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="24"/>
        </w:rPr>
        <w:t>SKILLS</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>${escapeXml(skills.join(', '))}</w:t>
      </w:r>
    </w:p>
    ` : ''}
    
    ${includeWatermark ? `
    <w:p>
      <w:pPr>
        <w:spacing w:before="400"/>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="16"/>
          <w:color w:val="CCCCCC"/>
        </w:rPr>
        <w:t>Generated with Resume Builder</w:t>
      </w:r>
    </w:p>
    ` : ''}
  </w:body>
</w:document>`;

  return xml;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
