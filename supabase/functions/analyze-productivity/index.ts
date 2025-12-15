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

    const { periodDays = 30 } = await req.json();

    // Fetch time tracking entries
    const { data: entries, error: entriesError } = await supabase
      .from('time_tracking_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('started_at', new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString())
      .order('started_at', { ascending: true });

    if (entriesError) throw entriesError;

    // Fetch productivity metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('productivity_metrics')
      .select('*')
      .eq('user_id', user.id)
      .gte('metric_date', new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('metric_date', { ascending: true });

    if (metricsError) throw metricsError;

    // Fetch job outcomes
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('status, created_at, updated_at')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString());

    if (jobsError) throw jobsError;

    // Prepare data for AI analysis
    const analysisData = {
      totalEntries: entries?.length || 0,
      timeByActivity: entries?.reduce((acc: any, entry: any) => {
        acc[entry.activity_type] = (acc[entry.activity_type] || 0) + entry.duration_minutes;
        return acc;
      }, {}),
      averageEnergyLevel: entries?.reduce((sum: number, e: any) => sum + (e.energy_level || 0), 0) / (entries?.length || 1),
      averageProductivityRating: entries?.reduce((sum: number, e: any) => sum + (e.productivity_rating || 0), 0) / (entries?.length || 1),
      totalTimeMinutes: entries?.reduce((sum: number, e: any) => sum + e.duration_minutes, 0) || 0,
      metricsOverview: metrics,
      jobOutcomes: {
        total: jobs?.length || 0,
        byStatus: jobs?.reduce((acc: any, job: any) => {
          acc[job.status] = (acc[job.status] || 0) + 1;
          return acc;
        }, {})
      },
      periodDays
    };

    // Call AI for insights
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const systemInstruction = `You are a productivity analyst helping job seekers optimize their time investment. Analyze their activity patterns and provide actionable insights. Always respond with valid JSON array.`;

    const userPrompt = `Analyze this ${periodDays}-day job search productivity data and generate insights:

Total time invested: ${analysisData.totalTimeMinutes} minutes
Average energy level: ${analysisData.averageEnergyLevel.toFixed(2)}/5
Average productivity rating: ${analysisData.averageProductivityRating.toFixed(2)}/5

Time by activity:
${Object.entries(analysisData.timeByActivity).map(([type, mins]) => `- ${type}: ${mins} minutes`).join('\n')}

Job outcomes: ${analysisData.jobOutcomes.total} jobs tracked
${Object.entries(analysisData.jobOutcomes.byStatus).map(([status, count]) => `- ${status}: ${count}`).join('\n')}

Generate 5-7 productivity insights covering:
1. Time allocation optimization (which activities deserve more/less time)
2. Productivity patterns (best working hours, energy correlation)
3. Burnout risk assessment (work-life balance, warning signs)
4. Efficiency improvements (task completion rates, time management)
5. Outcome correlation (time investment vs. results)
6. Schedule optimization (when to do what activities)
7. Productivity coaching (specific actionable tips)

Return JSON array of insights, each with:
{
  "type": "time_allocation|productivity_pattern|burnout_warning|efficiency_tip|schedule_optimization",
  "title": "Short insight title",
  "description": "Detailed analysis and explanation",
  "recommendations": ["Specific action 1", "Specific action 2", "Specific action 3"],
  "priority": "low|medium|high|critical"
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
    const aiContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // Parse AI response
    let insights = [];
    try {
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      insights = [{
        type: 'efficiency_tip',
        title: 'Continue Tracking Your Productivity',
        description: 'Keep logging your activities to build better insights over time.',
        recommendations: ['Log at least 5 activities per week', 'Rate your energy and productivity', 'Review weekly patterns'],
        priority: 'medium'
      }];
    }

    // Store insights in database
    const insightRecords = insights.map((insight: any) => ({
      user_id: user.id,
      insight_type: insight.type,
      insight_title: insight.title,
      insight_description: insight.description,
      recommendations: insight.recommendations || [],
      priority: insight.priority || 'medium',
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    }));

    const { error: insertError } = await supabase
      .from('productivity_insights')
      .insert(insightRecords);

    if (insertError) {
      console.error('Failed to store insights:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        insights: insights,
        analysisData: analysisData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-productivity:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
