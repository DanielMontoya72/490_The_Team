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
    const { templateType, contactName, contactTitle, contactCompany, tone, additionalContext, birthday, sharedInterests, newsContent } = await req.json();

    console.log('Generating template for:', { templateType, contactName, tone });

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

    // Get Gemini API key for AI generation
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Extract and fetch content from URLs in additionalContext
    let enrichedContext = additionalContext || '';
    if (additionalContext) {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = additionalContext.match(urlRegex);
      
      if (urls && urls.length > 0) {
        console.log('Found URLs in context:', urls);
        
        for (const url of urls) {
          try {
            console.log('Fetching content from:', url);
            const response = await fetch(url);
            const html = await response.text();
            
            // Extract main text content (remove HTML tags and scripts)
            let textContent = html
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            
            // Limit to first 2000 characters to avoid token limits
            if (textContent.length > 2000) {
              textContent = textContent.substring(0, 2000) + '...';
            }
            
            enrichedContext += `\n\nContent from ${url}:\n${textContent}`;
            console.log('Successfully extracted content from URL');
          } catch (urlError) {
            console.error('Error fetching URL content:', urlError);
            enrichedContext += `\n\n[Note: Could not fetch content from ${url}]`;
          }
        }
      }
    }

    // Build prompt based on template type
    let prompt = '';
    let systemMessage = `You are an expert relationship manager helping professionals maintain authentic connections. Generate messages that sound natural, build genuine rapport, and feel personally written (not AI-generated). Avoid clichés, be conversational, and show real thought.

CRITICAL: When context includes links or articles:
- Be VERY SPECIFIC about what you read - mention key points, data, or arguments
- Give your GENUINE OPINION or PERSPECTIVE on the content
- Show you actually engaged with the material, don't just acknowledge it exists
- Connect the content to why it matters to the recipient specifically`;

    switch (templateType) {
      case 'birthday':
        prompt = `Write a warm ${tone} birthday message to ${contactName}${contactTitle ? `, who works as ${contactTitle}` : ''}${contactCompany ? ` at ${contactCompany}` : ''}.${sharedInterests ? ` You know they're interested in ${sharedInterests.join(', ')}.` : ''}${enrichedContext ? ` Additional context: ${enrichedContext}` : ''}

Style guide:
- Keep it genuine and personal (2-4 sentences max)
- Make it feel like a real person wrote it, not AI
- If you have context about shared interests, weave them in naturally
- Avoid generic phrases like "wishing you all the best" - be more creative
- End with something warm but professional

Format: Return subject line and message body.`;
        break;

      case 'congratulations':
        prompt = `Write a ${tone} congratulations message to ${contactName}${contactTitle ? `, ${contactTitle}` : ''}${contactCompany ? ` at ${contactCompany}` : ''}.${enrichedContext ? ` They achieved: ${enrichedContext}` : ' They achieved something professionally noteworthy.'}${sharedInterests ? ` You share interests in ${sharedInterests.join(', ')}.` : ''}

Style guide:
- Be genuinely enthusiastic and SPECIFIC about the achievement (2-4 sentences)
- If you have details from a link: mention SPECIFIC aspects that impressed you
- Share what YOU find remarkable or interesting about it
- Show you understand why it matters and what it took to accomplish
- Give a personal take or insight that shows genuine engagement
- Offer authentic support or ask a thoughtful question about their experience

Format: Return subject line and message body.`;
        break;

      case 'check_in':
        prompt = `Write a ${tone} check-in message to reconnect with ${contactName}${contactTitle ? `, ${contactTitle}` : ''}${contactCompany ? ` at ${contactCompany}` : ''}.${enrichedContext ? ` Context: ${enrichedContext}` : ''}${sharedInterests ? ` You share interests in ${sharedInterests.join(', ')}.` : ''}

Style guide:
- Make it natural and non-intrusive (3-5 sentences)
- If there's context/link content: be SPECIFIC about what caught your attention and why
- Give a genuine reason for reaching out - share your perspective if referencing content
- Reference something concrete (past conversation, their company news, shared interest, or specific details from linked content)
- Include an engaging question or observation that invites dialogue
- If mentioning an article/content: share what YOU think about it, not just "thought you'd find this interesting"

Format: Return subject line and message body.`;
        break;

      case 'industry_news':
        prompt = `Write a ${tone} message sharing relevant news with ${contactName}${contactTitle ? `, ${contactTitle}` : ''}${contactCompany ? ` at ${contactCompany}` : ''}.${enrichedContext ? ` News: ${enrichedContext}` : ' Share a relevant industry update.'}${sharedInterests ? ` They're interested in ${sharedInterests.join(', ')}.` : ''}

Style guide:
- Be HIGHLY SPECIFIC about what you read (3-5 sentences)
- Mention concrete details: data points, quotes, key arguments, or examples from the content
- Give YOUR THOUGHTFUL OPINION or analysis - what struck you? What's surprising? What does it mean?
- Explain why this matters to THEM specifically in their role/industry
- Ask a substantive question that shows you engaged deeply with the material
- Make it feel like you spent time thinking about this, not just forwarding a link

Format: Return subject line and message body.`;
        break;

      case 'thank_you':
        prompt = `Write a ${tone} thank you message to ${contactName}${contactTitle ? `, ${contactTitle}` : ''}${contactCompany ? ` at ${contactCompany}` : ''}.${enrichedContext ? ` Reason: ${enrichedContext}` : ' Thank them for their help or support.'}

Style guide:
- Express genuine, specific gratitude (2-4 sentences)
- Be clear about what you're thanking them for
- Explain the specific impact it had on you
- Show you value the relationship beyond this one favor
- End warmly but professionally

Format: Return subject line and message body.`;
        break;

      case 'update':
        prompt = `Write a ${tone} personal update to share with ${contactName}${contactTitle ? `, ${contactTitle}` : ''}${contactCompany ? ` at ${contactCompany}` : ''}.${enrichedContext ? ` Update: ${enrichedContext}` : ' Share a professional development or milestone.'}${sharedInterests ? ` You share interests in ${sharedInterests.join(', ')}.` : ''}

Style guide:
- Share your update engagingly (3-5 sentences)
- Make it relevant to them - why would they care?
- Invite their perspective or feedback naturally
- Don't just broadcast - create dialogue
- Balance professional with personal warmth

Format: Return subject line and message body.`;
        break;

      case 'relationship_strengthening':
        const suggestionContext = newsContent ? `
Suggestion Title: ${newsContent.headline}
Details: ${newsContent.summary}
Key Points: ${newsContent.talkingPoints ? newsContent.talkingPoints.join(', ') : 'N/A'}` : '';

        prompt = `Write a ${tone} message to ${contactName}${contactTitle ? `, ${contactTitle}` : ''}${contactCompany ? ` at ${contactCompany}` : ''} based on this relationship strengthening suggestion:
${suggestionContext}${enrichedContext ? ` Additional context: ${enrichedContext}` : ''}${sharedInterests ? ` You share interests in ${sharedInterests.join(', ')}.` : ''}

Style guide:
- Act on the suggestion naturally and authentically (3-5 sentences)
- Be SPECIFIC about the suggestion - reference the key details provided
- Explain why you're reaching out in relation to this suggestion
- Make it feel personal and thoughtful, not automated
- Include a question or call to action that encourages engagement
- Show genuine interest in strengthening the relationship

Format: Return subject line and message body.`;
        break;

      default:
        throw new Error('Invalid template type');
    }

    console.log('Calling Gemini AI for template generation...');

    // Call Gemini AI with tool calling for structured output
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemMessage}\n\n${prompt}` }]
            }
          ],
          tools: [{
            functionDeclarations: [{
              name: 'generate_message_template',
              description: 'Generate a personalized message template',
              parameters: {
                type: 'object',
                properties: {
                  subject: { type: 'string', description: 'Email subject line' },
                  message: { type: 'string', description: 'The message body' }
                },
                required: ['subject', 'message']
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
      throw new Error(`AI API request failed: ${response.status}`);
    }

    const aiData = await response.json();
    console.log('AI Response received, parsing...');

    const functionCall = aiData.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    if (!functionCall) {
      throw new Error('No function call in AI response');
    }
    const generatedContent = functionCall.args;

    return new Response(
      JSON.stringify({
        subject: generatedContent.subject,
        message: generatedContent.message,
        templateType,
        tone
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-relationship-message-template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate template';
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
