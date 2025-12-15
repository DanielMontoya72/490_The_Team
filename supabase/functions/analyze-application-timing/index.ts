import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TimingAnalysis {
  optimalDayOfWeek: string;
  optimalTimeRange: string;
  bestDays: { day: string; score: number; reasoning: string }[];
  worstTimes: { description: string; reason: string }[];
  industryInsights: { industry: string; bestTime: string; note: string }[];
  realTimeRecommendation: {
    action: 'submit_now' | 'wait';
    message: string;
    suggestedTime?: string;
    reasoning: string;
  };
  timezoneConsideration?: string;
  abTestSuggestion?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, industry, companySize, isRemote, timezone, currentHour, currentDayOfWeek } = await req.json();

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header to identify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Fetch user's historical timing data
    const { data: historicalData } = await supabase
      .from('application_timing_analytics')
      .select('*')
      .eq('user_id', user.id);

    // Fetch job-related data if jobId provided
    let jobData = null;
    if (jobId) {
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      jobData = data;
    }

    // Build analysis prompt
    const prompt = `You are an expert in job application timing optimization. Analyze the following data and provide recommendations for the best time to submit job applications.

Current Context:
- Industry: ${industry || jobData?.industry || 'General'}
- Company Size: ${companySize || 'Unknown'}
- Is Remote Position: ${isRemote || false}
- User's Timezone: ${timezone || 'America/New_York'}
- Current Day: ${getDayName(currentDayOfWeek || new Date().getDay())}
- Current Hour: ${currentHour || new Date().getHours()}:00

Historical Data Summary:
${historicalData && historicalData.length > 0 
  ? `- Total applications tracked: ${historicalData.length}
- Applications with responses: ${historicalData.filter(d => d.response_received).length}
- Average response time: ${calculateAverageResponseTime(historicalData)} hours
- Best performing day historically: ${findBestDay(historicalData)}
- Best performing hour historically: ${findBestHour(historicalData)}`
  : 'No historical data available yet'}

Based on industry research and best practices:
1. Recruiters are most active Tuesday-Thursday, 9-11 AM local time
2. Avoid Friday afternoons, weekends, and holidays
3. Monday mornings are often busy with meetings
4. Applications submitted during business hours get faster responses
5. For remote positions, consider the company's headquarters timezone

Provide a JSON response with the following structure:
{
  "optimalDayOfWeek": "The best day (e.g., 'Tuesday')",
  "optimalTimeRange": "Best time range (e.g., '9:00 AM - 11:00 AM')",
  "bestDays": [
    { "day": "Tuesday", "score": 95, "reasoning": "Recruiters are settled after Monday" },
    { "day": "Wednesday", "score": 90, "reasoning": "Mid-week peak activity" },
    { "day": "Thursday", "score": 85, "reasoning": "Still good before Friday slowdown" }
  ],
  "worstTimes": [
    { "description": "Friday evening (after 4 PM)", "reason": "Applications get buried over the weekend" },
    { "description": "Monday morning (before 10 AM)", "reason": "Recruiters are catching up on emails" }
  ],
  "industryInsights": [
    { "industry": "${industry || 'General'}", "bestTime": "Tuesday-Wednesday 9-11 AM", "note": "Industry-specific insight" }
  ],
  "realTimeRecommendation": {
    "action": "submit_now" or "wait",
    "message": "Clear recommendation message",
    "suggestedTime": "If wait, when to submit (e.g., 'Tuesday at 9:00 AM')",
    "reasoning": "Why this recommendation"
  },
  "timezoneConsideration": "If remote position, mention timezone considerations",
  "abTestSuggestion": "Suggestion for A/B testing timing strategies"
}`;

    const systemPrompt = 'You are an expert in job application timing optimization. Always respond with valid JSON only.';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }
          ],
          generationConfig: { temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to get timing analysis from AI');
    }

    const aiResponse = await response.json();
    const content = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text;

    let analysis: TimingAnalysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Provide fallback analysis
      analysis = getDefaultAnalysis(currentDayOfWeek, currentHour, industry);
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-application-timing:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getDayName(dayIndex: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex] || 'Unknown';
}

function calculateAverageResponseTime(data: any[]): number {
  const withResponse = data.filter(d => d.response_time_hours);
  if (withResponse.length === 0) return 0;
  return Math.round(withResponse.reduce((acc, d) => acc + d.response_time_hours, 0) / withResponse.length);
}

function findBestDay(data: any[]): string {
  if (data.length === 0) return 'Not enough data';
  const dayStats: Record<number, { total: number; responses: number }> = {};
  data.forEach(d => {
    if (d.submission_day_of_week !== null) {
      if (!dayStats[d.submission_day_of_week]) {
        dayStats[d.submission_day_of_week] = { total: 0, responses: 0 };
      }
      dayStats[d.submission_day_of_week].total++;
      if (d.response_received) dayStats[d.submission_day_of_week].responses++;
    }
  });
  
  let bestDay = 2; // Default to Tuesday
  let bestRate = 0;
  Object.entries(dayStats).forEach(([day, stats]) => {
    const rate = stats.total > 0 ? stats.responses / stats.total : 0;
    if (rate > bestRate) {
      bestRate = rate;
      bestDay = parseInt(day);
    }
  });
  return getDayName(bestDay);
}

function findBestHour(data: any[]): string {
  if (data.length === 0) return 'Not enough data';
  const hourStats: Record<number, { total: number; responses: number }> = {};
  data.forEach(d => {
    if (d.submission_hour !== null) {
      if (!hourStats[d.submission_hour]) {
        hourStats[d.submission_hour] = { total: 0, responses: 0 };
      }
      hourStats[d.submission_hour].total++;
      if (d.response_received) hourStats[d.submission_hour].responses++;
    }
  });
  
  let bestHour = 10; // Default to 10 AM
  let bestRate = 0;
  Object.entries(hourStats).forEach(([hour, stats]) => {
    const rate = stats.total > 0 ? stats.responses / stats.total : 0;
    if (rate > bestRate) {
      bestRate = rate;
      bestHour = parseInt(hour);
    }
  });
  return `${bestHour}:00`;
}

function getDefaultAnalysis(dayOfWeek: number, hour: number, industry?: string): TimingAnalysis {
  const currentDay = getDayName(dayOfWeek || new Date().getDay());
  const currentHour = hour || new Date().getHours();
  
  // Determine if now is a good time
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isGoodHour = currentHour >= 9 && currentHour <= 11;
  const isFridayAfternoon = dayOfWeek === 5 && currentHour >= 15;
  const isMondayMorning = dayOfWeek === 1 && currentHour < 10;
  
  let action: 'submit_now' | 'wait' = 'submit_now';
  let message = '';
  let suggestedTime = '';
  let reasoning = '';
  
  if (!isWeekday) {
    action = 'wait';
    message = 'Wait until Tuesday morning for best results';
    suggestedTime = 'Tuesday at 9:00 AM';
    reasoning = 'Weekend submissions often get buried and reviewed late';
  } else if (isFridayAfternoon) {
    action = 'wait';
    message = 'Wait until next Tuesday morning';
    suggestedTime = 'Tuesday at 9:00 AM';
    reasoning = 'Friday afternoon applications may not be reviewed until Monday';
  } else if (isMondayMorning) {
    action = 'wait';
    message = 'Wait until 10 AM or consider Tuesday';
    suggestedTime = 'Today at 10:00 AM or Tuesday at 9:00 AM';
    reasoning = 'Recruiters are busy with Monday morning catch-up';
  } else if (isGoodHour && isWeekday && !isFridayAfternoon) {
    action = 'submit_now';
    message = 'Great time to submit your application!';
    reasoning = 'This is peak recruiter activity time';
  } else if (currentHour >= 12 && currentHour <= 14) {
    action = 'wait';
    message = 'Consider waiting until after lunch hours';
    suggestedTime = 'Today at 2:00 PM or tomorrow at 9:00 AM';
    reasoning = 'Many recruiters take lunch breaks during this time';
  } else if (currentHour >= 15 && currentHour <= 17 && dayOfWeek !== 5) {
    action = 'submit_now';
    message = 'Acceptable time to submit';
    reasoning = 'Afternoon is decent but morning is optimal';
  } else {
    action = 'wait';
    message = 'Wait until tomorrow morning';
    suggestedTime = 'Tomorrow at 9:00 AM';
    reasoning = 'Evening submissions may get lost in the queue';
  }

  return {
    optimalDayOfWeek: 'Tuesday',
    optimalTimeRange: '9:00 AM - 11:00 AM',
    bestDays: [
      { day: 'Tuesday', score: 95, reasoning: 'Recruiters are settled after Monday' },
      { day: 'Wednesday', score: 90, reasoning: 'Mid-week peak activity' },
      { day: 'Thursday', score: 85, reasoning: 'Still good before Friday slowdown' }
    ],
    worstTimes: [
      { description: 'Friday evening (after 4 PM)', reason: 'Applications get buried over the weekend' },
      { description: 'Monday morning (before 10 AM)', reason: 'Recruiters are catching up on emails' },
      { description: 'Weekends', reason: 'No recruiter activity, applications pile up' },
      { description: 'Holidays', reason: 'Reduced staffing and delayed reviews' }
    ],
    industryInsights: [
      { industry: industry || 'General', bestTime: 'Tuesday-Wednesday 9-11 AM', note: 'Standard business hours work best for most industries' }
    ],
    realTimeRecommendation: {
      action,
      message,
      suggestedTime: suggestedTime || undefined,
      reasoning
    },
    timezoneConsideration: 'For remote positions, consider the company HQ timezone when timing your submission',
    abTestSuggestion: 'Try submitting half your applications at 9 AM and half at 10 AM to compare response rates'
  };
}
