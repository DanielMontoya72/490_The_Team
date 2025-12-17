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
    const { subject, body, fromEmail, platform } = await req.json();

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log('Extracting job details from email:', { subject, platform, fromEmail });

    const systemPrompt = `You are an expert at parsing job application confirmation emails. Your task is to extract job details from emails sent by job platforms like LinkedIn, Indeed, Glassdoor, and ZipRecruiter.

Extract the following information:
- Job Title: The exact position/role title
- Company Name: The company hiring for this position
- Location: City, State format (e.g., "New York, NY"). Include remote/hybrid/on-site designation if mentioned.
- Remote Type: "remote", "hybrid", "on-site", or null if not specified

Be precise and extract exactly what's in the email. If a field cannot be determined, return null for that field.

IMPORTANT: Respond with ONLY a valid JSON object in this exact format:
{
  "jobTitle": "string or null",
  "companyName": "string or null",
  "location": "string or null",
  "remoteType": "remote" | "hybrid" | "on-site" | null,
  "confidence": number between 0-100 for the extraction accuracy, if it is a 100, then the extraction is 100% accurate, if it is a 0, then the extraction is 0% accurate
}`;

    const userPrompt = `Extract job details from this ${platform || 'job platform'} email:

FROM: ${fromEmail}
SUBJECT: ${subject}

BODY:
${body}

Extract the job title, company name, location, and remote type. Return ONLY the JSON object.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini response:', JSON.stringify(data, null, 2));

    // Extract the text content from Gemini response
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      throw new Error('Invalid Gemini response format');
    }

    // Parse the JSON from the response text
    // Handle potential markdown code blocks in the response
    let jsonText = textContent.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const extractedDetails = JSON.parse(jsonText);
    console.log('Extracted job details:', extractedDetails);

    return new Response(JSON.stringify({
      success: true,
      ...extractedDetails
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error extracting job details:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
