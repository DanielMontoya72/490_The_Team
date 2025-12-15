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
    const { originalMessage, contactName, jobTitle, companyName, daysSinceSent, followUpNumber } = await req.json();

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const followUpContext = followUpNumber === 0 
      ? "first follow-up" 
      : followUpNumber === 1 
        ? "second follow-up" 
        : "final follow-up";

    const prompt = `Generate a professional and friendly ${followUpContext} message for a referral request.

Context:
- Contact Name: ${contactName}
- Job Position: ${jobTitle} at ${companyName}
- Days since original request: ${daysSinceSent}
- Follow-up number: ${followUpNumber + 1}
- Original message summary: ${originalMessage?.substring(0, 200) || 'Not provided'}

Guidelines:
- Keep it brief and respectful of their time
- Reference the original request without being pushy
- ${followUpNumber >= 2 ? "This is the final follow-up, so be gracious and offer to let them off the hook if they're too busy" : "Express continued interest while being understanding"}
- Don't be apologetic but acknowledge they may be busy
- Include a clear but gentle call to action
- Keep professional but warm tone

Return ONLY the follow-up message text, no subject line or additional formatting.`;

    const systemInstruction = 'You are an expert at professional networking communication. Generate concise, warm, and effective follow-up messages that maintain professional relationships while advancing career goals.';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
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
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const message = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();

    console.log('Generated follow-up message for:', contactName);

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-referral-followup:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
