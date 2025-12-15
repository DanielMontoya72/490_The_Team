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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { jobId, currentCompensation, manualJobDetails } = await req.json();

    let job;
    
    // Use manual job details if provided, otherwise fetch from database
    if (manualJobDetails) {
      job = {
        job_title: manualJobDetails.job_title,
        company_name: 'General Market',
        location: manualJobDetails.location,
        industry: manualJobDetails.industry || 'Not specified',
        company_size: 'Various',
        job_description: ''
      };
    } else {
      // Fetch job details from database
      const { data: jobData, error: jobError } = await supabaseClient
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError) throw new Error('Job not found');
      job = jobData;
    }

    // Fetch user's profile for context
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('experience_level, location')
      .eq('user_id', user.id)
      .single();

    console.log('Researching salary for:', job.job_title, 'at', job.company_name);

    const prompt = `Analyze the salary and compensation for this job opportunity and provide comprehensive market research.

JOB DETAILS:
- Title: ${job.job_title}
- Company: ${job.company_name}
- Location: ${job.location || 'Not specified'}
- Company Size: ${job.company_size || 'Not specified'}
- Industry: ${job.industry || 'Not specified'}
- Job Description: ${job.job_description?.substring(0, 500) || 'Not provided'}

USER CONTEXT:
- Experience Level: ${profile?.experience_level || 'Not specified'}
- Current Location: ${profile?.location || 'Not specified'}
- Current Compensation: ${currentCompensation ? '$' + currentCompensation.toLocaleString() : 'Not provided'}

IMPORTANT: You MUST return a valid JSON object with these EXACT fields:
{
  "salary_range_min": 80000,
  "salary_range_max": 120000,
  "median_salary": 100000,
  "percentile_25": 85000,
  "percentile_75": 115000,
  "base_salary_avg": 95000,
  "bonus_avg": 10000,
  "equity_avg": 15000,
  "benefits_value": 20000,
  "total_compensation_avg": 140000,
  "market_comparisons": [
    {
      "company": "Company A",
      "position": "Similar Role",
      "total_comp": 135000,
      "base": 100000,
      "bonus": 15000,
      "equity": 20000,
      "company_size": "1000-5000",
      "location": "San Francisco"
    }
  ],
  "similar_positions": [
    {
      "title": "Senior Software Engineer",
      "salary_range": "90k-130k",
      "requirements_match": 85
    }
  ],
  "historical_trends": [
    {
      "year": 2024,
      "median": 98000,
      "change_percent": 5.2,
      "trend": "increasing"
    },
    {
      "year": 2023,
      "median": 93000,
      "change_percent": 4.1,
      "trend": "increasing"
    }
  ],
  "negotiation_recommendations": [
    {
      "priority": "high",
      "strategy": "Emphasize your experience with...",
      "expected_impact": "Could increase base by 10-15%",
      "talking_points": ["Point 1", "Point 2"]
    }
  ],
  "competitive_analysis": "Detailed analysis of the market position, comparing this opportunity with similar roles in the industry and location. Include insights about what makes this competitive or not.",
  "market_position": "at_market",
  "compensation_gap": 5000
}

Provide realistic salary data based on:
1. The job title, location, and company size
2. Current market conditions and trends
3. Industry standards and benchmarks
4. Experience level requirements
5. Cost of living in the location

Be comprehensive and realistic. Include specific negotiation strategies based on the role and market data.`;

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const systemInstruction = 'You are a salary research expert. Provide detailed, accurate salary data and negotiation insights.';

    const aiResponse = await fetch(
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

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('Failed to generate salary research');
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('AI Response length:', analysisText?.length);
    
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || 
                       analysisText.match(/```\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : analysisText;
      analysis = JSON.parse(jsonText);
      console.log('Successfully parsed AI response');
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('AI response text:', analysisText?.substring(0, 500));
      
      // Provide fallback data when AI returns non-JSON response
      console.log('Using fallback salary data');
      analysis = {
        salary_range_min: 60000,
        salary_range_max: 100000,
        median_salary: 80000,
        percentile_25: 65000,
        percentile_75: 95000,
        base_salary_avg: 75000,
        bonus_avg: 8000,
        equity_avg: 10000,
        benefits_value: 15000,
        total_compensation_avg: 108000,
        market_comparisons: [],
        similar_positions: [],
        historical_trends: [],
        negotiation_recommendations: [
          {
            priority: "medium",
            strategy: "Research market rates for your specific location",
            expected_impact: "Better understanding of fair compensation",
            talking_points: ["Gather local salary data", "Consider cost of living"]
          }
        ],
        competitive_analysis: analysisText || "Unable to generate detailed analysis. Please ensure you provide a valid location for more accurate salary research.",
        market_position: "unknown",
        compensation_gap: null
      };
    }

    // Calculate compensation gap if current compensation provided
    let compensationGap = null;
    let marketPosition = 'unknown';
    
    if (currentCompensation && analysis.median_salary) {
      compensationGap = analysis.median_salary - currentCompensation;
      
      if (currentCompensation < analysis.percentile_25) {
        marketPosition = 'below';
      } else if (currentCompensation > analysis.percentile_75) {
        marketPosition = 'above';
      } else {
        marketPosition = 'at';
      }
    }

    // Save the salary research (only if not manual search or if jobId provided)
    if (!manualJobDetails || jobId) {
      // Check if research already exists for this job
      const { data: existingResearch } = await supabaseClient
        .from('salary_research')
        .select('id')
        .eq('user_id', user.id)
        .eq('job_id', jobId)
        .maybeSingle();

      let savedResearch;
      
      if (existingResearch) {
        // Update existing research
        const { data, error: updateError } = await supabaseClient
          .from('salary_research')
          .update({
            job_title: job.job_title,
            location: job.location,
            experience_level: profile?.experience_level,
            company_size: job.company_size,
            salary_range_min: analysis.salary_range_min,
            salary_range_max: analysis.salary_range_max,
            median_salary: analysis.median_salary,
            percentile_25: analysis.percentile_25,
            percentile_75: analysis.percentile_75,
            base_salary_avg: analysis.base_salary_avg,
            bonus_avg: analysis.bonus_avg,
            equity_avg: analysis.equity_avg,
            benefits_value: analysis.benefits_value,
            total_compensation_avg: analysis.total_compensation_avg,
            market_comparisons: analysis.market_comparisons || [],
            similar_positions: analysis.similar_positions || [],
            historical_trends: analysis.historical_trends || [],
            negotiation_recommendations: analysis.negotiation_recommendations || [],
            competitive_analysis: analysis.competitive_analysis,
            current_compensation: currentCompensation,
            compensation_gap: compensationGap,
            market_position: marketPosition,
          })
          .eq('id', existingResearch.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('Error updating research:', updateError);
          throw updateError;
        }
        savedResearch = data;
      } else {
        // Insert new research
        const { data, error: insertError } = await supabaseClient
          .from('salary_research')
          .insert({
            user_id: user.id,
            job_id: jobId || null,
            job_title: job.job_title,
            location: job.location,
            experience_level: profile?.experience_level,
            company_size: job.company_size,
            salary_range_min: analysis.salary_range_min,
            salary_range_max: analysis.salary_range_max,
            median_salary: analysis.median_salary,
            percentile_25: analysis.percentile_25,
            percentile_75: analysis.percentile_75,
            base_salary_avg: analysis.base_salary_avg,
            bonus_avg: analysis.bonus_avg,
            equity_avg: analysis.equity_avg,
            benefits_value: analysis.benefits_value,
            total_compensation_avg: analysis.total_compensation_avg,
            market_comparisons: analysis.market_comparisons || [],
            similar_positions: analysis.similar_positions || [],
            historical_trends: analysis.historical_trends || [],
            negotiation_recommendations: analysis.negotiation_recommendations || [],
            competitive_analysis: analysis.competitive_analysis,
            current_compensation: currentCompensation,
            compensation_gap: compensationGap,
            market_position: marketPosition,
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Error inserting research:', insertError);
          throw insertError;
        }
        savedResearch = data;
      }

      console.log('Salary research saved successfully');
      
      return new Response(
        JSON.stringify(savedResearch),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For manual searches, return analysis without saving
    return new Response(
      JSON.stringify({
        ...analysis,
        job_title: job.job_title,
        location: job.location,
        current_compensation: currentCompensation,
        compensation_gap: compensationGap,
        market_position: marketPosition,
        created_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in research-salary:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});