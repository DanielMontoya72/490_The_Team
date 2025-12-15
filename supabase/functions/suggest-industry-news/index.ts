import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contactId } = await req.json();

    console.log('Generating industry news suggestions for contact:', contactId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Fetch contact details - try professional_contacts first, then contact_suggestions
    let contact: any = null;
    let contactSource = 'professional_contacts';
    
    const { data: professionalContact, error: professionalError } = await supabase
      .from('professional_contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (professionalContact) {
      contact = professionalContact;
      console.log('Found contact in professional_contacts');
    } else {
      // Try contact_suggestions (AI-generated contacts)
      const { data: suggestionContact, error: suggestionError } = await supabase
        .from('contact_suggestions')
        .select('*')
        .eq('id', contactId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (suggestionContact) {
        // Normalize the data structure to match professional_contacts
        contact = {
          id: suggestionContact.id,
          first_name: suggestionContact.contact_name?.split(' ')[0] || '',
          last_name: suggestionContact.contact_name?.split(' ').slice(1).join(' ') || '',
          current_company: suggestionContact.contact_company,
          current_title: suggestionContact.contact_title,
          industry: null, // Not available in contact_suggestions
          shared_interests: suggestionContact.mutual_interests || []
        };
        contactSource = 'contact_suggestions';
        console.log('Found contact in contact_suggestions');
      }
    }

    if (!contact) {
      console.error('Contact not found in either table:', contactId);
      throw new Error('Contact not found');
    }

    // Get Gemini API key for AI generation
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    console.log('Generating realistic industry news suggestions with AI...');

    const prompt = `Generate 3 realistic, recent industry news suggestions for ${contact.first_name} ${contact.last_name}, ${contact.current_title} at ${contact.current_company}.

Industry: ${contact.industry || 'general business'}
Shared interests: ${contact.shared_interests?.join(', ') || 'professional development'}

For each news item:
1. Create a realistic headline based on current industry trends
2. Write a detailed 2-3 sentence summary
3. Explain why it's relevant to this specific contact
4. Provide 2-3 concrete talking points for discussing this news

Make the suggestions feel authentic and timely. Note: These are AI-generated insights, not real articles.`;

    console.log('Calling Gemini AI for news generation...');

    const systemInstruction = 'You are a professional relationship manager helping users stay connected with their network through relevant industry news and insights. Generate realistic news suggestions based on current industry trends.';

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
              name: 'suggest_industry_news',
              description: 'Return industry news suggestions for a contact',
              parameters: {
                type: 'object',
                properties: {
                  suggestions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        headline: { type: 'string' },
                        summary: { type: 'string' },
                        relevanceReason: { type: 'string' },
                        talkingPoints: { type: 'array', items: { type: 'string' } }
                      },
                      required: ['headline', 'summary', 'relevanceReason', 'talkingPoints']
                    }
                  }
                },
                required: ['suggestions']
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
      console.error('Gemini AI API error:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded',
            details: 'Too many requests. Please try again in a few moments.',
            isRateLimited: true
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      throw new Error(`AI API request failed: ${response.status}`);
    }

    const aiData = await response.json();
    console.log('AI Response received, parsing...');

    const functionCall = aiData.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    if (!functionCall) {
      throw new Error('No function call in AI response');
    }
    const suggestions = functionCall.args?.suggestions || [];

    // Save news suggestions to database
    const newsToInsert = suggestions.map((news: any) => ({
      user_id: user.id,
      contact_id: contactId,
      contact_source: contactSource,
      news_headline: news.headline,
      news_summary: news.summary,
      news_url: null,
      relevance_reason: news.relevanceReason,
      suggested_talking_points: news.talkingPoints
    }));

    const { data: savedNews, error: saveError } = await supabase
      .from('industry_news_suggestions')
      .insert(newsToInsert)
      .select();

    if (saveError) throw saveError;

    return new Response(
      JSON.stringify({ 
        contactId,
        suggestions: savedNews
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in suggest-industry-news:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate news suggestions';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
