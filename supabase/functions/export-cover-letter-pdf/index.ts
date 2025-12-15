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
    const { content, fileName } = await req.json();

    if (!content) {
      throw new Error('Content is required');
    }

    // Simple PDF generation using basic PDF structure
    // For production, consider using a proper PDF library
    const pdfContent = generateSimplePDF(content, fileName || 'Cover Letter');

    return new Response(
      pdfContent as any,
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName || 'cover-letter'}.pdf"`,
        },
      }
    );
  } catch (error) {
    console.error('Error generating PDF:', error);
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

function generateSimplePDF(content: string, title: string): Uint8Array {
  // Basic PDF structure
  const lines = content.split('\n');
  const pageWidth = 612; // 8.5 inches at 72 DPI
  const pageHeight = 792; // 11 inches at 72 DPI
  const margin = 72; // 1 inch
  const fontSize = 12;
  const lineHeight = 14;
  
  let yPosition = pageHeight - margin;
  
  // Build PDF objects
  const objects: string[] = [];
  
  // Object 1: Catalog
  objects.push(`1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj`);
  
  // Object 2: Pages
  objects.push(`2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj`);
  
  // Object 3: Page
  objects.push(`3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 5 0 R >>
endobj`);
  
  // Object 4: Resources
  objects.push(`4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >> >> >>
endobj`);
  
  // Object 5: Content stream
  let contentStream = `BT
/F1 ${fontSize} Tf
${margin} ${yPosition} Td
${lineHeight} TL\n`;

  for (const line of lines) {
    const escapedLine = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    contentStream += `(${escapedLine}) Tj T*\n`;
  }
  
  contentStream += `ET`;
  
  const contentLength = contentStream.length;
  
  objects.push(`5 0 obj
<< /Length ${contentLength} >>
stream
${contentStream}
endstream
endobj`);
  
  // Build PDF
  let pdf = '%PDF-1.4\n';
  const xrefPositions: number[] = [0];
  
  for (const obj of objects) {
    xrefPositions.push(pdf.length);
    pdf += obj + '\n';
  }
  
  const xrefPosition = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  
  for (let i = 1; i <= objects.length; i++) {
    const pos = xrefPositions[i].toString().padStart(10, '0');
    pdf += `${pos} 00000 n \n`;
  }
  
  pdf += 'trailer\n';
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += `${xrefPosition}\n`;
  pdf += '%%EOF';
  
  return new TextEncoder().encode(pdf);
}
