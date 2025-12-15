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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch user profile data
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch skills
    const { data: skills } = await supabase
      .from('user_skills')
      .select('*')
      .eq('user_id', user.id);

    // Fetch employment history
    const { data: employment } = await supabase
      .from('employment_history')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });

    // Fetch education
    const { data: education } = await supabase
      .from('education')
      .select('*')
      .eq('user_id', user.id)
      .order('graduation_date', { ascending: false });

    // Fetch job applications
    const { data: jobs } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Prepare user data for analysis
    const userData = {
      profile,
      skillsCount: skills?.length || 0,
      topSkills: skills?.slice(0, 10).map(s => s.skill_name) || [],
      experienceYears: employment?.reduce((sum, e) => {
        const start = new Date(e.start_date);
        const end = e.is_current ? new Date() : new Date(e.end_date);
        return sum + (end.getFullYear() - start.getFullYear());
      }, 0) || 0,
      companies: employment?.map(e => e.company_name) || [],
      education: education?.map(e => ({ level: e.education_level, field: e.field_of_study })) || [],
      jobsApplied: jobs?.length || 0,
      jobsByStatus: jobs?.reduce((acc: any, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {}) || {}
    };

    // Call AI for competitive analysis
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const systemInstruction = `You are a career analytics expert specializing in competitive positioning analysis. Provide data-driven insights based on industry benchmarks and best practices. Always respond with valid JSON.`;

    const userPrompt = `Generate a comprehensive competitive analysis for this job seeker:

Profile Summary:
- Skills: ${userData.skillsCount} skills (Top: ${userData.topSkills.join(', ')})
- Experience: ${userData.experienceYears} years
- Companies: ${userData.companies.slice(0, 3).join(', ')}
- Education: ${userData.education.map(e => `${e.level} in ${e.field}`).join(', ')}
- Applications: ${userData.jobsApplied} jobs (${Object.entries(userData.jobsByStatus).map(([s, c]) => `${s}: ${c}`).join(', ')})

Generate a competitive analysis with these sections (return as JSON):

{
  "competitive_positioning": {
    "overall_score": 0-100,
    "market_position": "entry|mid|senior|expert",
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "unique_value_proposition": "What makes this candidate unique"
  },
  "peer_comparison": {
    "vs_average_applicant": {
      "skills": "above|at|below average - explanation",
      "experience": "above|at|below average - explanation",
      "application_strategy": "above|at|below average - explanation",
      "success_rate": "above|at|below average - explanation"
    },
    "vs_top_performers": {
      "skill_gap_analysis": "Detailed comparison",
      "experience_gap": "What's missing",
      "achievement_gap": "Areas for improvement"
    }
  },
  "skill_gaps": [
    {
      "skill": "Missing skill name",
      "importance": "critical|high|medium",
      "market_demand": "Description of demand",
      "learning_path": ["Step 1", "Step 2", "Step 3"],
      "estimated_time_weeks": 4
    }
  ],
  "differentiation_strategies": [
    {
      "strategy": "Strategy name",
      "description": "Detailed description",
      "implementation_steps": ["Step 1", "Step 2", "Step 3"],
      "expected_impact": "high|medium|low",
      "timeframe": "immediate|short-term|long-term"
    }
  ],
  "recommendations": [
    {
      "category": "skills|networking|applications|personal_brand",
      "priority": "critical|high|medium|low",
      "action": "Specific actionable recommendation",
      "expected_outcome": "What this will achieve",
      "effort_level": "low|medium|high"
    }
  ],
  "market_positioning": {
    "current_tier": "entry|mid|senior|expert",
    "target_tier": "Where they should aim",
    "positioning_strategy": "How to position themselves",
    "competitive_advantages": ["Advantage 1", "Advantage 2", "Advantage 3"],
    "areas_for_improvement": ["Area 1", "Area 2", "Area 3"]
  },
  "performance_metrics": {
    "application_volume_percentile": 0-100,
    "success_rate_vs_industry": "above|at|below average",
    "network_strength_score": 0-100,
    "skill_relevance_score": 0-100,
    "career_progression_pace": "fast|average|slow"
  }
}`;

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }]
            }
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Parse AI response
    let analysis: any = {};
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse competitive analysis');
    }

    // Store analysis in database
    const { data: savedAnalysis, error: insertError } = await supabase
      .from('competitive_analysis')
      .insert({
        user_id: user.id,
        competitive_positioning: analysis.competitive_positioning || {},
        skill_gaps: analysis.skill_gaps || [],
        peer_comparison: analysis.peer_comparison || {},
        differentiation_strategies: analysis.differentiation_strategies || [],
        recommendations: analysis.recommendations || [],
        market_positioning: analysis.market_positioning || {},
        performance_metrics: analysis.performance_metrics || {}
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to store analysis:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: savedAnalysis
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-competitive-analysis:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
