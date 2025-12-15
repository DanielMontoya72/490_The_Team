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
      jobTitle, 
      companyName, 
      location,
      marketSalaryData,
      currentSalary,
      targetSalary,
      userExperience,
      userAchievements 
    } = await req.json();

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const prompt = `Generate comprehensive salary negotiation guidance for this position:

Position: ${jobTitle} at ${companyName}
Location: ${location}
Market Data: ${JSON.stringify(marketSalaryData)}
Current Salary: ${currentSalary ? `$${currentSalary}` : 'Not specified'}
Target Salary: ${targetSalary ? `$${targetSalary}` : 'Not specified'}
Experience: ${userExperience || 'Not provided'}
Key Achievements: ${userAchievements || 'Not provided'}

Provide:
1. Talking Points (array of key points to emphasize based on achievements and market value)
2. Negotiation Scripts (object with keys: initial_offer, counteroffer, benefits_discussion, final_negotiation)
3. Total Compensation Framework (object analyzing: base_salary, bonus, equity, benefits, perks, work_life_balance)
4. Timing Strategy (object with keys: before_offer, during_discussion, after_offer, follow_up)
5. Counteroffer Evaluation Template (object with evaluation_criteria array and decision_framework)
6. Confidence Tips (array of 5-7 actionable tips for building negotiation confidence)
7. Negotiation Exercises (array of 7 practical exercises to build confidence and practice negotiation skills)

Format as JSON with these exact keys: talking_points, scripts, compensation_framework, timing_strategy, counteroffer_template, confidence_tips, negotiation_exercises`;

    const systemInstruction = 'You are an expert salary negotiation coach. Provide strategic, data-driven negotiation guidance. Always return valid JSON.';

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
    
    // Try to parse JSON from the response
    let guidance;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        guidance = JSON.parse(jsonMatch[0]);
      } else {
        guidance = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      // Fallback structure
      guidance = {
        talking_points: [content],
        scripts: { initial_offer: content },
        compensation_framework: { base_salary: content },
        timing_strategy: content,
        counteroffer_template: { evaluation_criteria: [content] },
        confidence_tips: [content]
      };
    }

    return new Response(JSON.stringify(guidance), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-negotiation-guidance:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
