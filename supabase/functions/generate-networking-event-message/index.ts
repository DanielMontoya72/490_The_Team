import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MessageRequest {
  contactName: string;
  contactTitle?: string;
  contactCompany?: string;
  conversationNotes?: string;
  eventName?: string;
  messageType: string;
  tone: string;
  additionalContext?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      contactName,
      contactTitle,
      contactCompany,
      conversationNotes,
      eventName,
      messageType,
      tone,
      additionalContext
    }: MessageRequest = await req.json();

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Build context for AI
    const contextParts = [
      `Contact: ${contactName}`,
      contactTitle && `Title: ${contactTitle}`,
      contactCompany && `Company: ${contactCompany}`,
      eventName && `Met at: ${eventName}`,
      conversationNotes && `Discussion topics: ${conversationNotes}`,
      additionalContext && `Additional context: ${additionalContext}`
    ].filter(Boolean);

    const context = contextParts.join('\n');

    // Build prompt based on message type
    let promptInstructions = '';
    switch (messageType) {
      case 'follow_up':
        promptInstructions = `Create a professional follow-up email after meeting ${contactName} at a networking event. Reference the conversation notes if available. Express interest in continuing the connection.`;
        break;
      case 'thank_you':
        promptInstructions = `Create a warm thank you email to ${contactName} for their time at the networking event. Mention specific insights from the conversation if available.`;
        break;
      case 'coffee_meeting':
        promptInstructions = `Create a professional email inviting ${contactName} to a coffee meeting or virtual call to continue the conversation started at the networking event.`;
        break;
      case 'introduction':
        promptInstructions = `Create a professional introduction email to ${contactName}, formally introducing yourself and your background after meeting briefly at the networking event.`;
        break;
      default:
        promptInstructions = `Create a professional networking email to ${contactName} following up after meeting at an event.`;
    }

    // Adjust tone
    const toneInstructions = {
      professional: 'Keep it professional and business-focused.',
      friendly: 'Make it warm and friendly while maintaining professionalism.',
      formal: 'Use formal business language.',
      casual: 'Keep it conversational but respectful.'
    }[tone] || 'Keep it professional.';

    const systemPrompt = `You are an expert at writing professional networking emails. 
Create a subject line and email body that:
- Is genuine and personalized
- References the context provided
- ${toneInstructions}
- Is concise (under 200 words)
- Includes a clear call-to-action
- Feels natural, not templated

Return ONLY a JSON object with "subject" and "message" keys. No markdown, no extra text.`;

    const userPrompt = `${promptInstructions}

Context:
${context}

Generate the email now.`;

    console.log('Calling Gemini AI to generate networking message...');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
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
          generationConfig: {
            temperature: 0.8,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini AI error:', response.status, errorText);
      throw new Error(`Gemini AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const messageContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!messageContent) {
      throw new Error('No content in AI response');
    }

    console.log('AI Response:', messageContent);

    // Parse the JSON response
    let parsedResponse;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = messageContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : messageContent;
      parsedResponse = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', messageContent);
      throw new Error('Invalid JSON response from AI');
    }

    if (!parsedResponse.subject || !parsedResponse.message) {
      throw new Error('Invalid response format from AI');
    }

    return new Response(
      JSON.stringify(parsedResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('Error in generate-networking-event-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
