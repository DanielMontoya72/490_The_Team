import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interviewId, followUpType } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Get interview details
    const { data: interview, error: interviewError } = await supabase
      .from('informational_interviews')
      .select('*')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .single();

    if (interviewError || !interview) {
      throw new Error('Interview not found');
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, email')
      .eq('user_id', user.id)
      .single();

    const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'the user';

    // Construct prompt based on follow-up type
    const prompts: Record<string, string> = {
      thank_you: `Generate a professional thank-you email template for an informational interview follow-up. 
        Candidate: ${interview.candidate_name} (${interview.candidate_title} at ${interview.candidate_company})
        User: ${userName}
        Interview notes: ${interview.notes || 'General career discussion'}
        Key insights: ${interview.key_insights || 'Not recorded yet'}
        
        The email should:
        - Express genuine gratitude for their time
        - Reference specific insights or advice they shared
        - Mention how their guidance will be applied
        - Keep the door open for future communication
        - Be warm but professional`,
        
      check_in: `Generate a professional check-in email template to maintain the relationship.
        Candidate: ${interview.candidate_name} (${interview.candidate_title} at ${interview.candidate_company})
        User: ${userName}
        Original discussion: ${interview.notes || 'Career insights'}
        Time since interview: ~3 months
        
        The email should:
        - Reference the original conversation
        - Share a brief update on progress since then
        - Provide value (share an article, insight, or connection)
        - Ask a thoughtful follow-up question
        - Be concise and respectful of their time`,
        
      update: `Generate a professional update email template to share career progress.
        Candidate: ${interview.candidate_name} (${interview.candidate_title} at ${interview.candidate_company})
        User: ${userName}
        
        The email should:
        - Thank them for their previous guidance
        - Share a specific win or milestone
        - Connect the success to their advice
        - Keep it brief and celebratory
        - Express continued appreciation`,
        
      opportunity_share: `Generate a professional email template to share an opportunity or connection.
        Candidate: ${interview.candidate_name} (${interview.candidate_title} at ${interview.candidate_company})
        User: ${userName}
        
        The email should:
        - Reference the relationship warmly
        - Share the opportunity or connection with context
        - Explain why it might be valuable to them
        - Make it easy to act on (clear links/contacts)
        - No expectation of reciprocation`,
        
      relationship_maintenance: `Generate a professional relationship maintenance email template.
        Candidate: ${interview.candidate_name} (${interview.candidate_title} at ${interview.candidate_company})
        User: ${userName}
        
        The email should:
        - Be genuinely helpful, not transactional
        - Share relevant industry news or insights
        - Ask about their current projects/interests
        - Offer help or connections if appropriate
        - Be warm and conversational`
    };

    const prompt = prompts[followUpType] || prompts.relationship_maintenance;

    // Call Gemini AI API
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const systemInstruction = 'You are an expert at crafting professional networking emails. Generate templates that are authentic, relationship-focused, and respectful of busy professionals.';

    const aiResponse = await fetch(
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
          tools: [{
            functionDeclarations: [{
              name: 'generate_followup_template',
              description: 'Generate a follow-up email template',
              parameters: {
                type: 'object',
                properties: {
                  subject: { type: 'string', description: 'Email subject line' },
                  message: { type: 'string', description: 'Email body content' },
                  timing_advice: { type: 'string', description: 'When to send this email' },
                  tips: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Tips for personalizing and sending'
                  }
                },
                required: ['subject', 'message', 'timing_advice', 'tips']
              }
            }]
          }],
          toolConfig: {
            functionCallingConfig: { mode: 'ANY' }
          }
        }),
      }
    );

    if (!aiResponse.ok) {
      console.error('AI API error:', await aiResponse.text());
      throw new Error('Failed to generate template');
    }

    const aiData = await aiResponse.json();
    const functionCall = aiData.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    
    if (!functionCall) {
      throw new Error('No template generated');
    }

    const template = functionCall.args;

    console.log('Generated follow-up template:', { interviewId, followUpType, candidateName: interview.candidate_name });

    return new Response(JSON.stringify(template), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating follow-up template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});