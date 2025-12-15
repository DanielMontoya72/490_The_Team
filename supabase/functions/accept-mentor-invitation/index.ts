import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing invitation token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    console.log('Processing invitation token:', token);

    // Fetch the invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('mentor_invitations')
      .select('*')
      .eq('invitation_token', token)
      .single();

    if (fetchError || !invitation) {
      console.error('Invitation fetch error:', fetchError);
      return new Response(JSON.stringify({ error: 'Invitation not found or invalid' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return new Response(JSON.stringify({ 
        error: 'This invitation has already been accepted',
        alreadyAccepted: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Check if expired
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      return new Response(JSON.stringify({ error: 'This invitation has expired' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Update invitation status to accepted
    const { error: updateError } = await supabase
      .from('mentor_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    // Try to find if mentor has an account by email
    const { data: mentorProfile } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('email', invitation.mentor_email)
      .single();

    // If mentor has an account, create the relationship
    if (mentorProfile) {
      const { error: relationshipError } = await supabase
        .from('mentor_relationships')
        .insert({
          mentee_id: invitation.user_id,
          mentor_id: mentorProfile.user_id,
          status: 'active',
          relationship_type: 'mentor',
          permissions: {
            can_view_profile: true,
            can_view_jobs: true,
            can_view_resumes: true,
            can_provide_feedback: true,
          },
        });

      if (relationshipError) {
        console.error('Relationship creation error:', relationshipError);
        // Don't fail the whole request, the invitation is still accepted
      }
    }

    // Create in-app notification for the mentee that invitation was accepted
    await supabase
      .from('notifications')
      .insert({
        user_id: invitation.user_id,
        title: 'Mentor Invitation Accepted!',
        message: `${invitation.mentor_name || invitation.mentor_email} has accepted your mentor invitation. You can now share your progress and receive guidance.`,
        type: 'mentor_invitation_accepted',
        link: '/networking',
        is_read: false
      });

    console.log('In-app notification created for invitation accepted');
    console.log('Invitation accepted successfully for:', invitation.mentor_email);

    return new Response(JSON.stringify({
      success: true, 
      message: 'Invitation accepted successfully',
      mentorName: invitation.mentor_name,
      mentorEmail: invitation.mentor_email
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error accepting invitation:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
