import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interviewId, jobId } = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Invalid user');

    // Fetch interview details
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', interviewId)
      .single();

    if (interviewError) throw interviewError;

    // Fetch job and job match analysis
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError) throw jobError;

    const { data: jobMatch } = await supabase
      .from('job_match_analyses')
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle();

    // Fetch company research
    const { data: companyResearch } = await supabase
      .from('company_research')
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle();

    // Fetch interview preparation checklist
    const { data: interviewInsights } = await supabase
      .from('interview_insights')
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle();

    // Fetch practice sessions
    const { data: mockSessions } = await supabase
      .from('mock_interview_sessions')
      .select('*')
      .eq('interview_id', interviewId);

    // Fetch question responses
    const { data: questionResponses } = await supabase
      .from('interview_question_responses')
      .select('*')
      .eq('interview_id', interviewId);

    // Fetch historical interview outcomes for this user
    const { data: historicalInterviews } = await supabase
      .from('interviews')
      .select('outcome')
      .eq('user_id', user.id)
      .not('outcome', 'is', null);

    // Calculate historical success rate
    const totalHistoricalInterviews = historicalInterviews?.length || 0;
    const successfulInterviews = historicalInterviews?.filter(
      (i: any) => ['offer', 'accepted'].includes(i.outcome)
    ).length || 0;
    const historicalSuccessRate = totalHistoricalInterviews > 0 
      ? (successfulInterviews / totalHistoricalInterviews) * 100 
      : 50; // Default to 50% if no history

    // Calculate trend (recent vs older interviews)
    const recentInterviews = historicalInterviews?.slice(-5) || [];
    const recentSuccesses = recentInterviews.filter(
      (i: any) => ['offer', 'accepted'].includes(i.outcome)
    ).length;
    const recentSuccessRate = recentInterviews.length > 0
      ? (recentSuccesses / recentInterviews.length) * 100
      : historicalSuccessRate;
    const performanceTrend = recentSuccessRate - historicalSuccessRate;

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');

    // Calculate practice hours
    const practiceHours = mockSessions ? mockSessions.reduce((sum, session) => {
      return sum + (session.duration_minutes || 0);
    }, 0) / 60 : 0;

    // Calculate preparation task completion
    const preparationTasks = interview.preparation_tasks || [];
    const totalTasks = preparationTasks.length;
    const completedTasks = preparationTasks.filter((task: any) => task.completed).length;
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate company research score (deterministic)
    let companyResearchScore = 0;
    if (companyResearch) {
      companyResearchScore += companyResearch.company_profile ? 25 : 0;
      companyResearchScore += companyResearch.recent_news ? 25 : 0;
      companyResearchScore += companyResearch.leadership_info ? 25 : 0;
      companyResearchScore += companyResearch.talking_points ? 25 : 0;
    }

    // Calculate practice hours score (deterministic)
    // 5+ hours = 100%, linear scaling
    const practiceHoursScore = Math.min(100, (practiceHours / 5) * 100);

    // Calculate mock interview score (deterministic)
    // 3+ sessions = 100%
    const mockInterviewCount = mockSessions?.length || 0;
    const mockInterviewScore = Math.min(100, (mockInterviewCount / 3) * 100);

    // Calculate question practice score (deterministic)
    // 10+ questions = 100%
    const questionCount = questionResponses?.length || 0;
    const questionPracticeScore = Math.min(100, (questionCount / 10) * 100);

    // Calculate preparation score (deterministic, weighted combination)
    const preparationScore = Math.round(
      taskCompletionRate * 0.40 + // 40% weight to checklist tasks
      mockInterviewScore * 0.25 + // 25% weight to mock interviews
      questionPracticeScore * 0.20 + // 20% weight to question practice
      practiceHoursScore * 0.10 + // 10% weight to total practice hours
      (interviewInsights ? 5 : 0) // 5% bonus for having insights
    );

    // Calculate role match score (deterministic, from job match data)
    const roleMatchScore = jobMatch ? Math.round(
      (jobMatch.overall_score || 0) * 0.50 + // 50% from overall match
      (jobMatch.skills_score || 0) * 0.30 + // 30% from skills match
      (jobMatch.experience_score || 0) * 0.20 // 20% from experience match
    ) : 0;

    // Calculate base probability from preparation factors
    const baseProbability = Math.round(
      preparationScore * 0.35 + // 35% weight to preparation
      roleMatchScore * 0.30 + // 30% weight to role match
      companyResearchScore * 0.20 + // 20% weight to company research
      practiceHoursScore * 0.15 // 15% weight to practice hours
    );

    // Adjust probability based on historical performance
    // If historical success rate is significantly different from 50%, adjust the prediction
    const historicalAdjustment = (historicalSuccessRate - 50) * 0.3; // 30% weight to history
    const trendAdjustment = performanceTrend * 0.1; // 10% weight to recent trend
    
    // Calculate final overall probability
    const overallProbability = Math.min(100, Math.max(0, Math.round(
      baseProbability + historicalAdjustment + trendAdjustment
    )));

    // Determine confidence level based on data completeness
    let confidenceLevel = 'low';
    const dataPoints = [
      jobMatch ? 1 : 0,
      companyResearch ? 1 : 0,
      mockInterviewCount > 0 ? 1 : 0,
      questionCount > 0 ? 1 : 0,
      totalTasks > 0 ? 1 : 0
    ].reduce((a, b) => a + b, 0);
    
    if (dataPoints >= 4) confidenceLevel = 'high';
    else if (dataPoints >= 2) confidenceLevel = 'medium';

    const prompt = `Based on the following interview preparation data, provide AI-generated recommendations and insights:

Interview Details:
- Type: ${interview.interview_type}
- Date: ${interview.interview_date}

HISTORICAL PERFORMANCE:
- Total Past Interviews: ${totalHistoricalInterviews}
- Historical Success Rate: ${historicalSuccessRate.toFixed(1)}%
- Recent Success Rate (last 5): ${recentSuccessRate.toFixed(1)}%
- Performance Trend: ${performanceTrend > 0 ? '+' : ''}${performanceTrend.toFixed(1)}%
${totalHistoricalInterviews > 0 ? `- Successful Outcomes: ${successfulInterviews}` : '- No historical data yet'}

CALCULATED SCORES (DO NOT CHANGE THESE):
- Overall Probability: ${overallProbability}%
- Confidence Level: ${confidenceLevel}
- Preparation Score: ${preparationScore}%
- Role Match Score: ${roleMatchScore}%
- Company Research Score: ${companyResearchScore}%
- Practice Hours Score: ${practiceHoursScore}%
- Historical Success Rate: ${historicalSuccessRate.toFixed(1)}%
- Performance Trend: ${performanceTrend > 0 ? 'Improving' : performanceTrend < 0 ? 'Declining' : 'Stable'}

Preparation Tasks: ${completedTasks}/${totalTasks} completed (${taskCompletionRate.toFixed(1)}%)
${preparationTasks.map((t: any) => `- ${t.task}: ${t.completed ? '✓' : '✗'}`).join('\n')}

Company Research: ${companyResearchScore}%
- Company Profile: ${companyResearch?.company_profile ? '✓' : '✗'}
- Recent News: ${companyResearch?.recent_news ? '✓' : '✗'}
- Leadership Info: ${companyResearch?.leadership_info ? '✓' : '✗'}
- Talking Points: ${companyResearch?.talking_points ? '✓' : '✗'}

Practice:
- Mock Sessions: ${mockInterviewCount}
- Practice Hours: ${practiceHours.toFixed(1)}
- Questions Practiced: ${questionCount}

Job Match: ${jobMatch ? `${jobMatch.overall_score}%` : 'Not completed'}
${jobMatch ? `- Skills: ${jobMatch.skills_score}%, Experience: ${jobMatch.experience_score}%` : ''}

IMPORTANT: You must use the EXACT scores provided above. Do NOT recalculate them.

Based on this data, provide ONLY:
1. improvement_recommendations: Array of 3-5 specific, actionable recommendations
2. prioritized_actions: Array of top 3-5 immediate actions to take
3. strength_areas: Array of 2-4 things the candidate is doing well
4. weakness_areas: Array of 2-4 areas that need improvement
5. predicted_outcome: One of "likely", "possible", or "uncertain"

Focus recommendations on:
- Tasks not yet completed
- Areas with low scores
- Specific actions to improve weak areas
- Historical performance patterns (if improving, encourage; if declining, address)
- Comparison with historical success rate to identify if current preparation is better/worse than usual

Format as JSON with these exact keys and the EXACT scores provided:
{
  "overall_probability": ${overallProbability},
  "confidence_level": "${confidenceLevel}",
  "preparation_score": ${preparationScore},
  "role_match_score": ${roleMatchScore},
  "company_research_score": ${companyResearchScore},
  "practice_hours_score": ${practiceHoursScore},
  "historical_success_rate": ${historicalSuccessRate.toFixed(1)},
  "performance_trend": "${performanceTrend > 0 ? 'improving' : performanceTrend < 0 ? 'declining' : 'stable'}",
  "improvement_recommendations": [],
  "prioritized_actions": [],
  "strength_areas": [],
  "weakness_areas": [],
  "predicted_outcome": ""
}

Note: The overall probability already incorporates historical success rate (${historicalSuccessRate.toFixed(1)}%) and recent performance trend (${performanceTrend > 0 ? '+' : ''}${performanceTrend.toFixed(1)}%). ${totalHistoricalInterviews === 0 ? 'No historical data available yet - encourage completing more interviews to improve prediction accuracy.' : `Based on ${totalHistoricalInterviews} past interviews, the candidate has a ${historicalSuccessRate.toFixed(1)}% success rate.`}`;

    const systemInstruction = 'You are an expert interview coach and data analyst. Analyze preparation factors and predict interview success probability with specific, actionable recommendations. Always return valid JSON.';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
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
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    let prediction;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        prediction = JSON.parse(jsonMatch[0]);
      } else {
        prediction = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      throw new Error('Failed to parse prediction data');
    }

    // Save prediction to database
    const { data: savedPrediction, error: saveError } = await supabase
      .from('interview_success_predictions')
      .insert({
        user_id: user.id,
        interview_id: interviewId,
        job_id: jobId,
        overall_probability: prediction.overall_probability,
        confidence_level: prediction.confidence_level,
        preparation_score: prediction.preparation_score,
        role_match_score: prediction.role_match_score,
        company_research_score: prediction.company_research_score,
        practice_hours_score: prediction.practice_hours_score,
        improvement_recommendations: prediction.improvement_recommendations,
        prioritized_actions: prediction.prioritized_actions,
        strength_areas: prediction.strength_areas,
        weakness_areas: prediction.weakness_areas,
        predicted_outcome: prediction.predicted_outcome,
        historical_success_rate: parseFloat(historicalSuccessRate.toFixed(1)),
        performance_trend: performanceTrend > 0 ? 'improving' : performanceTrend < 0 ? 'declining' : 'stable'
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(JSON.stringify(savedPrediction), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calculate-interview-success:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
