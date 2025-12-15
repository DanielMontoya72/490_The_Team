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
    const { subject, content, followUpType, placeholderValues } = await req.json();

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;

    const typeDescriptions: Record<string, string> = {
      'thank_you': 'Thank-you email after an interview',
      'status_inquiry': 'Status inquiry email to check on application progress',
      'feedback_request': 'Request for constructive feedback after the interview process',
      'networking': 'Networking follow-up to maintain professional relationships'
    };

    const systemPrompt = `You are an expert professional communication editor. Your task is to take a follow-up email template with filled-in placeholder values and polish it into a natural, flowing professional email.

The user has filled in specific details for placeholder fields. Take these values and integrate them naturally into the email, ensuring:
1. The tone matches a ${typeDescriptions[followUpType] || 'professional follow-up email'}
2. The filled-in details flow naturally in context
3. Grammar and punctuation are correct
4. The email reads as a cohesive, personalized message
5. Keep the same structure and intent, just make it polished

Return a JSON object:
{
  "subject": "Polished subject line",
  "content": "Polished email body with filled values integrated naturally"
}`;

    const userPrompt = `Here's the email template with placeholder values filled in:

Subject: ${subject}

Content:
${content}

The user filled in these placeholder values:
${Object.entries(placeholderValues).map(([key, value]) => `- ${key}: "${value}"`).join('\n')}

Please polish this email so the filled-in values flow naturally and the entire message reads professionally. Keep the same structure and meaning, just make it read smoothly.`;

    console.log('Calling Gemini AI to finalize follow-up...');

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error('AI API Error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const responseContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('AI Response received, parsing...');

    let finalizedData;
    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        finalizedData = JSON.parse(jsonMatch[0]);
      } else {
        finalizedData = JSON.parse(responseContent);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback: return the content as-is
      finalizedData = { subject, content };
    }

    return new Response(
      JSON.stringify(finalizedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in finalize-follow-up:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
