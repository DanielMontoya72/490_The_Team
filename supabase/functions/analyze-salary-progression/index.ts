import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      salaryProgression,
      currentCompensation,
      marketData,
      negotiationHistory,
      industry,
      location,
      yearsExperience,
      jobTitle
    } = await req.json();

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const prompt = `Analyze salary progression and provide comprehensive career compensation insights:

SALARY HISTORY:
${JSON.stringify(salaryProgression, null, 2)}

CURRENT COMPENSATION: $${currentCompensation || 'Not specified'}

MARKET DATA:
${JSON.stringify(marketData, null, 2)}

NEGOTIATION HISTORY:
${JSON.stringify(negotiationHistory, null, 2)}

PROFILE:
- Industry: ${industry || 'Not specified'}
- Location: ${location || 'Not specified'}
- Years Experience: ${yearsExperience || 'Not specified'}
- Current/Target Role: ${jobTitle || 'Not specified'}

Provide comprehensive analysis in JSON format with these exact keys:

{
  "market_position_analysis": {
    "current_percentile": number (0-100),
    "position_label": "below_market" | "at_market" | "above_market",
    "gap_to_median": number,
    "gap_to_75th_percentile": number,
    "industry_comparison": string,
    "location_adjustment": string
  },
  "salary_progression_insights": {
    "annual_growth_rate": number (percentage),
    "total_growth_percentage": number,
    "growth_trend": "accelerating" | "steady" | "decelerating" | "stagnant",
    "years_to_next_milestone": number,
    "projected_5_year_salary": number,
    "career_stage_assessment": string
  },
  "negotiation_performance": {
    "success_rate": number (percentage),
    "average_increase_achieved": number (percentage),
    "total_negotiations": number,
    "successful_negotiations": number,
    "improvement_trend": "improving" | "consistent" | "declining",
    "skills_assessment": string
  },
  "compensation_trends": {
    "base_salary_trend": "increasing" | "stable" | "decreasing",
    "bonus_trend": "increasing" | "stable" | "decreasing",
    "equity_trend": "increasing" | "stable" | "decreasing",
    "total_comp_evolution": string
  },
  "advancement_recommendations": [
    {
      "priority": "high" | "medium" | "low",
      "category": "skill_development" | "negotiation" | "job_change" | "promotion" | "certification" | "networking",
      "recommendation": string,
      "expected_impact": string,
      "timeline": string
    }
  ],
  "optimal_timing_insights": {
    "best_time_for_raise": string,
    "market_timing_score": number (0-100),
    "job_change_recommendation": string,
    "promotion_readiness": string
  },
  "industry_benchmarks": {
    "entry_level_median": number,
    "mid_level_median": number,
    "senior_level_median": number,
    "executive_level_median": number,
    "your_trajectory_vs_benchmark": string
  }
}

Be specific with numbers and actionable with recommendations. Base all analysis on the provided data.`;

    const systemInstruction = 'You are an expert career compensation analyst. Provide data-driven salary progression analysis and actionable recommendations. Always return valid JSON.';

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
    
    let analysis;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                       content.match(/```\n([\s\S]*?)\n```/) ||
                       content.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      analysis = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Return fallback structure
      analysis = {
        market_position_analysis: {
          current_percentile: 50,
          position_label: "at_market",
          gap_to_median: 0,
          gap_to_75th_percentile: 15000,
          industry_comparison: "Analysis unavailable",
          location_adjustment: "Analysis unavailable"
        },
        salary_progression_insights: {
          annual_growth_rate: 5,
          total_growth_percentage: 0,
          growth_trend: "steady",
          years_to_next_milestone: 2,
          projected_5_year_salary: currentCompensation * 1.25,
          career_stage_assessment: "Analysis unavailable"
        },
        negotiation_performance: {
          success_rate: 0,
          average_increase_achieved: 0,
          total_negotiations: 0,
          successful_negotiations: 0,
          improvement_trend: "consistent",
          skills_assessment: "No negotiation data available"
        },
        compensation_trends: {
          base_salary_trend: "stable",
          bonus_trend: "stable",
          equity_trend: "stable",
          total_comp_evolution: "Analysis unavailable"
        },
        advancement_recommendations: [
          {
            priority: "high",
            category: "skill_development",
            recommendation: "Add salary history data to get personalized recommendations",
            expected_impact: "Better career insights",
            timeline: "Immediate"
          }
        ],
        optimal_timing_insights: {
          best_time_for_raise: "Add more data for timing analysis",
          market_timing_score: 50,
          job_change_recommendation: "Insufficient data",
          promotion_readiness: "Add career history for assessment"
        },
        industry_benchmarks: {
          entry_level_median: 50000,
          mid_level_median: 80000,
          senior_level_median: 120000,
          executive_level_median: 180000,
          your_trajectory_vs_benchmark: "Add data for comparison"
        }
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-salary-progression:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
