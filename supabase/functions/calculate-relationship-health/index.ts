import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting relationship health calculation...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Fetch all contacts from professional_contacts
    const { data: professionalContacts, error: professionalContactsError } = await supabase
      .from('professional_contacts')
      .select('*')
      .eq('user_id', user.id);

    if (professionalContactsError) throw professionalContactsError;

    // Fetch contacted suggestions from contact_suggestions
    const { data: contactedSuggestions, error: suggestionsError } = await supabase
      .from('contact_suggestions')
      .select('*')
      .eq('user_id', user.id)
      .not('contacted_at', 'is', null);

    if (suggestionsError) throw suggestionsError;

    // Normalize contacted suggestions to match professional_contacts structure
    const normalizedSuggestions = (contactedSuggestions || []).map(suggestion => ({
      id: suggestion.id,
      user_id: suggestion.user_id,
      first_name: suggestion.contact_name?.split(' ')[0] || '',
      last_name: suggestion.contact_name?.split(' ').slice(1).join(' ') || '',
      email: suggestion.email,
      phone: suggestion.phone,
      current_company: suggestion.contact_company,
      current_title: suggestion.contact_title,
      linkedin_url: suggestion.linkedin_url,
      location: suggestion.contact_location,
      last_contacted_at: suggestion.contacted_at, // Use contacted_at as last_contacted_at
      relationship_strength: 'weak', // Default for new suggestions
      shared_interests: suggestion.mutual_interests || [],
      opportunities_generated: 0,
      birthday: suggestion.birthday,
      created_at: suggestion.created_at,
      updated_at: suggestion.updated_at
    }));

    // Combine both sources
    const contacts = [...(professionalContacts || []), ...normalizedSuggestions];

    console.log(`Processing ${contacts.length} contacts (${professionalContacts?.length || 0} professional + ${normalizedSuggestions.length} AI suggestions)...`);

    // Calculate health metrics for each contact
    const healthMetrics = [];
    for (const contact of contacts) {
      // Fetch relationship activities for this contact
      const { data: activities, error: activitiesError } = await supabase
        .from('relationship_activities')
        .select('*')
        .eq('contact_id', contact.id)
        .eq('user_id', user.id);

      if (activitiesError) {
        console.error(`Error fetching activities for contact ${contact.id}:`, activitiesError);
      }

      const activityList = activities || [];
      
      // Count messages sent via AI
      const messagesSent = activityList.filter(a => a.activity_type === 'message').length;
      
      // Count interactions in the last 90 days
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const recentActivities = activityList.filter(a => 
        new Date(a.created_at) >= ninetyDaysAgo
      ).length;

      // Calculate days since last contact
      const daysSinceContact = contact.last_contacted_at 
        ? Math.floor((Date.now() - new Date(contact.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // Calculate engagement score based on messages sent and relationship strength
      let engagementScore = 30; // Base score
      
      // Add points for messages sent (up to 40 points)
      engagementScore += Math.min(40, messagesSent * 8);
      
      // Add points for recent activity (up to 20 points)
      engagementScore += Math.min(20, recentActivities * 5);
      
      // Adjust based on relationship strength
      if (contact.relationship_strength === 'strong') engagementScore += 10;
      else if (contact.relationship_strength === 'moderate') engagementScore += 5;
      
      engagementScore = Math.min(100, engagementScore);
      
      // Map to engagement level categories
      let engagementLevel = 'low';
      if (engagementScore >= 70) engagementLevel = 'high';
      else if (engagementScore >= 40) engagementLevel = 'medium';

      // Calculate response rate based on activities
      // Assume every 2 messages should get at least 1 response indicator
      let responseRate = 0.3; // Default
      if (messagesSent > 0) {
        // If they have recent activities (indicating engagement), higher response rate
        responseRate = recentActivities > 0 ? Math.min(0.9, 0.3 + (recentActivities * 0.15)) : 0.3;
      }
      if (contact.opportunities_generated && contact.opportunities_generated > 0) {
        responseRate = Math.max(responseRate, 0.7); // Boost if opportunities generated
      }

      // Calculate recency score
      let recencyScore = 100;
      if (daysSinceContact > 90) recencyScore = 20;
      else if (daysSinceContact > 60) recencyScore = 40;
      else if (daysSinceContact > 30) recencyScore = 60;
      else if (daysSinceContact > 14) recencyScore = 80;

      // Calculate mutual value score based on opportunities AND interactions
      let mutualValueScore = (contact.opportunities_generated || 0) * 20;
      mutualValueScore += Math.min(30, messagesSent * 5); // Add value for active communication
      mutualValueScore = Math.min(100, mutualValueScore);

      // Calculate overall health score
      const healthScore = Math.round(
        (recencyScore * 0.3) + 
        (engagementScore * 0.3) + 
        (mutualValueScore * 0.2) + 
        (responseRate * 100 * 0.2)
      );

      // Determine health status
      let healthStatus = 'at_risk';
      if (healthScore >= 75) healthStatus = 'strong';
      else if (healthScore >= 50) healthStatus = 'healthy';
      else if (healthScore >= 30) healthStatus = 'needs_attention';

      // Generate AI-powered recommendations based on message history
      let recommendations = [];
      try {
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        if (geminiApiKey && activityList.length > 0) {
          // Get message content from activities
          const messageHistory = activityList
            .filter(a => a.activity_type === 'message')
            .slice(0, 5) // Last 5 messages
            .map(a => ({
              date: a.created_at,
              notes: a.notes || 'Message sent'
            }));

          if (messageHistory.length > 0) {
            const aiPrompt = `Based on this professional contact and their communication history, provide 3 specific, actionable recommendations for strengthening the relationship:

Contact: ${contact.first_name} ${contact.last_name}
Company: ${contact.current_company || 'Unknown'}
Title: ${contact.current_title || 'Unknown'}
Relationship Strength: ${contact.relationship_strength || 'Unknown'}
Days Since Last Contact: ${daysSinceContact}
Engagement Level: ${engagementLevel}
Opportunities Generated: ${contact.opportunities_generated || 0}

Recent Message History:
${messageHistory.map(m => `- ${new Date(m.date).toLocaleDateString()}: ${m.notes}`).join('\n')}

Provide 3 concise, specific recommendations (each 10-15 words) based on what has been sent and the relationship context.`;

            const aiResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [
                    {
                      role: 'user',
                      parts: [{ text: `You are a professional networking advisor. Provide specific, actionable recommendations.\n\n${aiPrompt}` }]
                    }
                  ],
                  tools: [{
                    functionDeclarations: [{
                      name: 'generate_recommendations',
                      description: 'Generate relationship recommendations',
                      parameters: {
                        type: 'object',
                        properties: {
                          recommendations: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Array of 3 specific recommendations'
                          }
                        },
                        required: ['recommendations']
                      }
                    }]
                  }],
                  toolConfig: {
                    functionCallingConfig: { mode: 'ANY' }
                  }
                }),
              }
            );

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              const functionCall = aiData.candidates?.[0]?.content?.parts?.[0]?.functionCall;
              if (functionCall?.args) {
                recommendations = functionCall.args.recommendations || [];
              }
            }
          }
        }
      } catch (aiError) {
        console.error(`AI recommendation generation failed for contact ${contact.id}:`, aiError);
      }

      // Fallback to rule-based recommendations if AI fails or no messages
      if (recommendations.length === 0) {
        if (daysSinceContact > 30) {
          recommendations.push(`Reconnect soon - it's been ${daysSinceContact} days since last contact`);
        }
        if (contact.relationship_strength === 'weak' || !contact.relationship_strength) {
          recommendations.push('Share relevant industry news to strengthen the relationship');
        }
        if (!contact.opportunities_generated || contact.opportunities_generated === 0) {
          recommendations.push('Explore ways to provide mutual value');
        }
        if (contact.shared_interests && contact.shared_interests.length > 0) {
          recommendations.push(`Discuss shared interests: ${contact.shared_interests.slice(0, 2).join(', ')}`);
        }
      }

      healthMetrics.push({
        user_id: user.id,
        contact_id: contact.id,
        health_score: healthScore,
        health_status: healthStatus,
        last_interaction_days: daysSinceContact,
        response_rate: responseRate,
        engagement_level: engagementLevel,
        mutual_value_score: mutualValueScore,
        recommendations: recommendations
      });
    }

    console.log(`Calculated metrics for ${healthMetrics.length} contacts`);

    // Delete existing metrics for this user
    await supabase
      .from('relationship_health_metrics')
      .delete()
      .eq('user_id', user.id);

    // Insert new metrics
    const { data: insertedMetrics, error: insertError } = await supabase
      .from('relationship_health_metrics')
      .insert(healthMetrics)
      .select();

    if (insertError) throw insertError;

    console.log('Successfully updated relationship health metrics');

    return new Response(
      JSON.stringify({ 
        success: true, 
        metricsCalculated: insertedMetrics.length,
        metrics: insertedMetrics
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error calculating relationship health:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to calculate health metrics',
        details: error instanceof Error ? error.toString() : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});