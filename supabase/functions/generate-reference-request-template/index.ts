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
    const { 
      referenceName, 
      referenceTitle, 
      referenceCompany,
      targetCompany,
      targetRole,
      requestType,
      appreciationType
    } = await req.json();

    console.log("Generating template for:", { referenceName, requestType, appreciationType });

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    let prompt = '';

    if (requestType === 'appreciation') {
      const appreciationTypes: Record<string, string> = {
        thank_you_note: 'a heartfelt thank you note',
        gift: 'a message to accompany a gift',
        update: 'a career update message',
        recommendation: 'a LinkedIn recommendation request',
      };
      const appreciationTypeText = appreciationTypes[appreciationType as string] || 'an appreciation message';

      prompt = `Generate ${appreciationTypeText} for a professional reference.

Reference Details:
- Name: ${referenceName}
- Title: ${referenceTitle || 'Not specified'}
- Company: ${referenceCompany || 'Not specified'}

Requirements:
- Keep it professional yet warm
- Be specific about appreciating their support
- If it's a thank you note, express gratitude for being a reference
- If it's a career update, share positive news and thank them for their role
- Keep it concise (150-200 words)
- Use a friendly but professional tone

Generate only the message text, no subject line or headers.`;
    } else {
      prompt = `Generate a professional reference request email template.

Reference Details:
- Name: ${referenceName}
- Title: ${referenceTitle || 'Not specified'}
- Company: ${referenceCompany || 'Not specified'}

Target Opportunity:
- Company: ${targetCompany || 'Not specified'}
- Role: ${targetRole || 'Not specified'}
- Request Type: ${requestType?.replace('_', ' ') || 'job application'}

Requirements:
- Start with a warm greeting
- Remind them briefly of your relationship
- Clearly state you're asking them to be a reference
- Mention the specific opportunity (company and role)
- Provide context about why this role interests you
- Offer to provide talking points or any materials they might need
- Thank them in advance and offer to discuss further
- Keep it concise (200-250 words)
- Professional but personable tone

Include subject line at the top formatted as "Subject: [subject text]"

Then include the full email body.`;
    }

    const systemInstruction = 'You are a professional career coach who helps job seekers communicate effectively with their references. Generate warm, professional, and personalized messages.';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\n${prompt}` }]
            }
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const template = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log("Template generated successfully");

    return new Response(
      JSON.stringify({ template }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error generating template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
