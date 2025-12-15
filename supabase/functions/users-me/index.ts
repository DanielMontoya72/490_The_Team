import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS'
};

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

interface SuccessResponse {
  data: any;
  message?: string;
}

function createErrorResponse(code: string, message: string, details?: any, status = 400): Response {
  const errorBody: ErrorResponse = {
    error: {
      code,
      message,
      details
    }
  };
  
  console.error(`[${code}] ${message}`, details || '');
  
  return new Response(
    JSON.stringify(errorBody),
    { 
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

function createSuccessResponse(data: any, message?: string, status = 200): Response {
  const successBody: SuccessResponse = {
    data,
    ...(message && { message })
  };
  
  return new Response(
    JSON.stringify(successBody),
    { 
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse(
        'UNAUTHORIZED',
        'Authentication required. Please log in.',
        'No authorization header found',
        401
      );
    }

    // Extract user id from verified JWT (verify_jwt=true ensures token is valid)
    const token = authHeader.replace('Bearer ', '');
    let userId: string | null = null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      userId = payload?.sub ?? null;
    } catch (e) {
      console.error('[users-me] Failed to decode JWT:', e);
    }

    if (!userId) {
      return createErrorResponse(
        'UNAUTHORIZED',
        'Authentication required. Please log in.',
        'Could not extract user id from token',
        401
      );
    }

    // Initialize Supabase client with auth for DB policies
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    console.log(`[users-me] ${req.method} request for user: ${userId}`);

    // Handle GET request - Fetch user profile
    if (req.method === 'GET') {
      const { data: profile, error: profileError } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        return createErrorResponse(
          'DATABASE_ERROR',
          'Failed to fetch user profile',
          profileError.message,
          500
        );
      }

      if (!profile) {
        return createErrorResponse(
          'NOT_FOUND',
          'User profile not found',
          'Profile may not be created yet',
          404
        );
      }

      console.log(`[users-me] Profile retrieved successfully for user: ${userId}`);
      return createSuccessResponse(profile, 'Profile retrieved successfully');
    }

    // Handle PUT request - Update user profile
    if (req.method === 'PUT') {
      const body = await req.json();
      
      // Validate required fields
      const validationErrors: any = {};
      
      if (body.first_name !== undefined && (!body.first_name || body.first_name.trim() === '')) {
        validationErrors.first_name = 'First name is required';
      }
      
      if (body.last_name !== undefined && (!body.last_name || body.last_name.trim() === '')) {
        validationErrors.last_name = 'Last name is required';
      }
      
      if (body.email !== undefined) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.email)) {
          validationErrors.email = 'Invalid email format';
        }
      }
      
      if (body.phone !== undefined && body.phone) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(body.phone)) {
          validationErrors.phone = 'Invalid phone format';
        }
      }

      if (Object.keys(validationErrors).length > 0) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Validation failed',
          validationErrors,
          400
        );
      }

      // Prepare update data - only include fields that were provided
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (body.first_name !== undefined) updateData.first_name = body.first_name.trim();
      if (body.last_name !== undefined) updateData.last_name = body.last_name.trim();
      if (body.email !== undefined) updateData.email = body.email.toLowerCase().trim();
      if (body.phone !== undefined) updateData.phone = body.phone || null;
      if (body.location !== undefined) updateData.location = body.location || null;
      if (body.headline !== undefined) updateData.headline = body.headline || null;
      if (body.bio !== undefined) updateData.bio = body.bio || null;
      if (body.industry !== undefined) updateData.industry = body.industry || null;
      if (body.experience_level !== undefined) updateData.experience_level = body.experience_level || null;
      if (body.profile_picture_url !== undefined) updateData.profile_picture_url = body.profile_picture_url || null;

      console.log(`[users-me] Updating profile for user: ${userId}`);

      const { data: updatedProfile, error: updateError } = await supabaseClient
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        // Check for specific error types
        if (updateError.code === '23505') {
          return createErrorResponse(
            'DUPLICATE_ERROR',
            'Email address already in use',
            'Please use a different email address',
            409
          );
        }
        
        return createErrorResponse(
          'DATABASE_ERROR',
          'Failed to update profile',
          updateError.message,
          500
        );
      }

      console.log(`[users-me] Profile updated successfully for user: ${userId}`);
      return createSuccessResponse(updatedProfile, 'Profile updated successfully', 200);
    }

    // Method not allowed
    return createErrorResponse(
      'METHOD_NOT_ALLOWED',
      `Method ${req.method} not allowed`,
      'Only GET and PUT methods are supported',
      405
    );

  } catch (error) {
    // Catch any unexpected errors
    console.error('[users-me] Unexpected error:', error);
    
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      'Please try again later',
      500
    );
  }
});
