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
    const { question, response, timeSpentSeconds, previousSessions = [] } = await req.json();

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Extract scores from previous sessions for comparison
    const previousScoresData = previousSessions.slice(0, 5).map((session: any) => ({
      date: session.created_at,
      scores: session.scores || {},
      question: session.feedback?.question || 'Unknown'
    }));

    const hasHistory = previousScoresData.length > 0;

    const prompt = `Analyze this interview response for a writing practice session:

Question: ${question}
Response: ${response}
Time Spent: ${timeSpentSeconds} seconds

${hasHistory ? `Previous Practice Sessions (${previousScoresData.length} sessions):
${previousScoresData.map((s: any, idx: number) => `
Session ${idx + 1} (${new Date(s.date).toLocaleDateString()}):
- Overall: ${s.scores.overall_score || 0}/100
- Clarity: ${s.scores.clarity_score || 0}/100
- Professionalism: ${s.scores.professionalism_score || 0}/100
- Structure: ${s.scores.structure_score || 0}/100
- Storytelling: ${s.scores.storytelling_score || 0}/100
- Question: ${s.question}
`).join('\n')}` : 'This is the first practice session.'}

Provide detailed feedback on:
1. Clarity Score (0-100, assess how clear and understandable the response is)
2. Professionalism Score (0-100, evaluate professional tone and language)
3. Structure Score (0-100, assess organization using STAR or similar frameworks)
4. Storytelling Score (0-100, evaluate engagement and narrative flow)
5. Overall Score (0-100, weighted average of above)
6. Strengths (array of 3-5 specific things done well)
7. Areas for Improvement (array of 3-5 specific suggestions)
8. Rewritten Example (a polished version of their response showing improvements)
9. Communication Tips (array of 5-7 actionable tips for better virtual interview communication)
10. Nerve Management Tips (array of 3-5 tips specific to managing interview anxiety)
${hasHistory ? `11. Comparison Analysis (object with keys: improvement_areas, areas_needing_work, trend_summary, recommendations)
    - improvement_areas: What skills/areas have improved compared to previous sessions
    - areas_needing_work: What still needs focus based on patterns across sessions
    - trend_summary: Overall trajectory (improving, plateaued, needs more practice)
    - recommendations: Array of 3-5 specific next steps for continued improvement` : ''}

Format as JSON with these exact keys: clarity_score, professionalism_score, structure_score, storytelling_score, overall_score, strengths, improvements, rewritten_example, communication_tips, nerve_management_tips${hasHistory ? ', comparison_analysis' : ''}`;

    const systemInstruction = 'You are an expert communication coach specializing in interview preparation. Provide constructive, actionable feedback that helps candidates improve their written and verbal communication. Always return valid JSON.';

    const response_ai = await fetch(
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

    if (!response_ai.ok) {
      const errorText = await response_ai.text();
      console.error('AI API error:', response_ai.status, errorText);
      throw new Error(`AI API error: ${response_ai.status}`);
    }

    const data = await response_ai.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Try to parse JSON from the response
    let feedback;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        feedback = JSON.parse(jsonMatch[0]);
      } else {
        feedback = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      // Fallback structure
      feedback = {
        clarity_score: 70,
        professionalism_score: 70,
        structure_score: 70,
        storytelling_score: 70,
        overall_score: 70,
        strengths: [content],
        improvements: ['Continue practicing'],
        rewritten_example: response,
        communication_tips: [content],
        nerve_management_tips: ['Take deep breaths'],
        comparison_analysis: null
      };
    }

    return new Response(JSON.stringify(feedback), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-written-response:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
