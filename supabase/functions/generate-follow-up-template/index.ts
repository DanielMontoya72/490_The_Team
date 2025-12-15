import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interviewId, followUpType, customContext } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get interview details
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select(`
        *,
        jobs!inner(
          job_title,
          company_name,
          company_description,
          industry
        )
      `)
      .eq('id', interviewId)
      .single();

    if (interviewError || !interview) {
      throw new Error('Interview not found');
    }

    const job = interview.jobs;

    const typeDescriptions = {
      'thank_you': 'A professional thank-you email to be sent within 24 hours after the interview',
      'status_inquiry': 'A polite follow-up email to inquire about the application status when no response has been received',
      'feedback_request': 'A professional request for constructive feedback after a rejection or to improve for future opportunities',
      'networking': 'A warm networking follow-up email to maintain professional relationships after a rejection'
    };

    const systemPrompt = `You are an expert professional communication writer specializing in post-interview follow-ups. 

Generate a personalized, professional email template based on the interview details provided.

Return a JSON object with this exact structure:
{
  "subject": "Professional, specific subject line",
  "content": "Full email body with proper formatting, including greeting, body paragraphs, and closing",
  "timing_recommendation": "When to send this email (e.g., 'Within 24 hours', 'After 1 week of no response')",
  "tips": ["Tip 1", "Tip 2", "Tip 3"] // Practical tips for personalizing and sending this email
}

Email writing guidelines:
- Be professional but warm and authentic
- Reference specific details from the interview
- Keep it concise (200-300 words)
- Include placeholders like [SPECIFIC_TOPIC_DISCUSSED] for the user to personalize
- Express genuine interest and gratitude
- End with a clear call-to-action or next step`;

    const contextNotes = interview.notes ? `\n\nInterview Notes: ${interview.notes}` : '';
    const outcomeInfo = interview.outcome ? `\nOutcome: ${interview.outcome}` : '';

    const userPrompt = `Generate a ${followUpType.replace('_', ' ')} email template for:

Interview Details:
- Type: ${interview.interview_type}
- Date: ${new Date(interview.interview_date).toLocaleDateString()}
- Company: ${job.company_name}
- Role: ${job.job_title}
- Interviewer: ${interview.interviewer_name || 'Not specified'}${outcomeInfo}${contextNotes}

Template Purpose: ${typeDescriptions[followUpType as keyof typeof typeDescriptions]}

${customContext ? `\nAdditional Context: ${customContext}` : ''}

Create a template that:
${followUpType === 'thank_you' ? `
- Thanks the interviewer for their time
- References 1-2 specific topics discussed (use placeholders)
- Reinforces interest in the role
- Mentions a key qualification or insight from the conversation
` : ''}${followUpType === 'status_inquiry' ? `
- Politely inquires about the hiring timeline
- Reiterates interest in the position
- Offers to provide additional information
- Maintains professionalism without seeming pushy
` : ''}${followUpType === 'feedback_request' ? `
- Gracefully acknowledges the outcome
- Requests constructive feedback for professional growth
- Thanks them for the opportunity
- Keeps the door open for future opportunities
` : ''}${followUpType === 'networking' ? `
- Thanks them for their time and insights
- Expresses interest in staying connected professionally
- Suggests LinkedIn connection or informational coffee chat
- Maintains a positive, forward-looking tone
` : ''}`;

    console.log('Calling Gemini AI for follow-up template...');

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
      const errorText = await aiResponse.text();
      console.error('AI API Error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('AI Response received, parsing...');

    let templateData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        templateData = JSON.parse(jsonMatch[0]);
      } else {
        templateData = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse follow-up template from AI response');
    }

    return new Response(
      JSON.stringify(templateData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-follow-up-template:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
