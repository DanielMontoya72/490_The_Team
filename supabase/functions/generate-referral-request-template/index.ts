import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { jobId, contactId, requestType } = await req.json();

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError) throw jobError;

    // Fetch contact details - try professional_contacts first, then contact_suggestions
    let contact: any = null;
    
    const { data: professionalContact } = await supabase
      .from('professional_contacts')
      .select('*')
      .eq('id', contactId)
      .maybeSingle();

    if (professionalContact) {
      contact = professionalContact;
    } else {
      // Try contact_suggestions (AI-generated contacts)
      const { data: suggestionContact } = await supabase
        .from('contact_suggestions')
        .select('*')
        .eq('id', contactId)
        .maybeSingle();

      if (suggestionContact) {
        // Normalize the data structure to match professional_contacts
        contact = {
          id: suggestionContact.id,
          first_name: suggestionContact.contact_name?.split(' ')[0] || '',
          last_name: suggestionContact.contact_name?.split(' ').slice(1).join(' ') || '',
          current_company: suggestionContact.contact_company,
          current_title: suggestionContact.contact_title,
          how_we_met: null // Not available in contact_suggestions
        };
      }
    }

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) throw profileError;

    const prompt = `Generate a professional and personalized referral request message for a job application.

Job Details:
- Position: ${job.job_title}
- Company: ${job.company_name}
- Description: ${job.job_description || 'Not provided'}

Contact Details:
- Name: ${contact.first_name} ${contact.last_name}
- Title: ${contact.current_title || 'Not specified'}
- Company: ${contact.current_company || 'Not specified'}
- Relationship: ${contact.how_we_met || 'Professional connection'}

Requester Details:
- Name: ${profile.full_name || user.email}

Request Type: ${requestType || 'general'}

Please generate a referral request that:
1. Is warm and professional
2. Reminds them of your relationship (if any)
3. Clearly states the position and company you're interested in
4. Explains why you're a good fit (briefly)
5. Makes a specific ask (referral or introduction)
6. Offers to provide any additional information
7. Expresses gratitude
8. Includes appropriate timing etiquette

Format the response as JSON with the following structure:
{
  "subject": "Email subject line",
  "greeting": "Opening greeting",
  "body": "Main message body",
  "closing": "Closing and signature",
  "full_message": "Complete formatted message"
}`;

    const systemInstruction = 'You are a professional career coach and networking expert. Generate personalized, warm, and professional referral request messages.';

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
          tools: [{
            functionDeclarations: [{
              name: 'generate_referral_template',
              description: 'Generate a personalized referral request message template',
              parameters: {
                type: 'object',
                properties: {
                  subject: {
                    type: 'string',
                    description: 'Email subject line'
                  },
                  greeting: {
                    type: 'string',
                    description: 'Opening greeting'
                  },
                  body: {
                    type: 'string',
                    description: 'Main message body'
                  },
                  closing: {
                    type: 'string',
                    description: 'Closing and signature'
                  },
                  full_message: {
                    type: 'string',
                    description: 'Complete formatted message'
                  }
                },
                required: ['subject', 'greeting', 'body', 'closing', 'full_message']
              }
            }]
          }],
          toolConfig: {
            functionCallingConfig: { mode: 'ANY' }
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const functionCall = aiResponse.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    
    if (!functionCall || !functionCall.args) {
      throw new Error('No function call response from AI');
    }
    
    const template = functionCall.args;

    return new Response(JSON.stringify(template), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-referral-request-template:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});