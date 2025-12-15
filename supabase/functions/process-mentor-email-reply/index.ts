import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { from, subject, body, plainText } = await req.json();

    console.log('Received email reply:', { from, subject });

    // Extract invitation ID from subject line
    // Subject format: "Re: New Message from Your Mentee [INV-{invitation_id}]"
    const invitationMatch = subject?.match(/\[INV-([a-f0-9-]+)\]/i);
    
    if (!invitationMatch) {
      console.log('No invitation ID found in subject:', subject);
      return new Response(JSON.stringify({ error: 'No invitation ID found in subject' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const invitationId = invitationMatch[1];
    console.log('Found invitation ID:', invitationId);

    // Clean the reply text - remove quoted content
    const messageText = cleanReplyText(plainText || body);

    if (!messageText.trim()) {
      return new Response(JSON.stringify({ error: 'Empty message content' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the invitation exists
    const { data: invitation, error: invError } = await supabase
      .from('mentor_invitations')
      .select('id, mentor_email')
      .eq('id', invitationId)
      .single();

    if (invError || !invitation) {
      console.log('Invitation not found:', invitationId);
      return new Response(JSON.stringify({ error: 'Invitation not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    // Verify the email is from the mentor
    const senderEmail = extractEmail(from);
    if (senderEmail.toLowerCase() !== invitation.mentor_email.toLowerCase()) {
      console.log('Email mismatch:', { sender: senderEmail, expected: invitation.mentor_email });
      return new Response(JSON.stringify({ error: 'Sender email does not match mentor' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      });
    }

    // Insert the message into the database
    const { data: message, error: insertError } = await supabase
      .from('mentor_invitation_messages')
      .insert({
        invitation_id: invitationId,
        message_text: messageText.trim(),
        is_from_mentor: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save message' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    console.log('Message saved successfully:', message.id);

    return new Response(JSON.stringify({ success: true, messageId: message.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error processing email reply:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// Extract email address from "Name <email@domain.com>" format
function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from.trim();
}

// Clean reply text by removing quoted content
function cleanReplyText(text: string): string {
  if (!text) return '';
  
  // Split by common reply markers
  const lines = text.split('\n');
  const cleanLines: string[] = [];
  
  for (const line of lines) {
    // Stop at common reply indicators
    if (line.match(/^On .+ wrote:$/i) || 
        line.match(/^>/) ||
        line.match(/^-{3,}/) ||
        line.match(/^_{3,}/) ||
        line.match(/^From:.*$/i) ||
        line.match(/^Sent:.*$/i) ||
        line.match(/^To:.*$/i) ||
        line.match(/^Subject:.*$/i) ||
        line.includes('Original Message')) {
      break;
    }
    cleanLines.push(line);
  }
  
  return cleanLines.join('\n').trim();
}
