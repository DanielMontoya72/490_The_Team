import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, challengeId, code, language, testCases, scenario, design, caseStudy, response } = await req.json();

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get("Authorization")?.replace("Bearer ", "") || ""
    );

    if (!user) {
      throw new Error("Unauthorized");
    }

    let systemPrompt = "";
    let userPrompt = "";
    let evaluationResult: any = {};

    if (type === "system-design") {
      systemPrompt = "You are an expert system design reviewer. Evaluate system designs thoroughly.";
      userPrompt = `Evaluate this system design for the following scenario:

SCENARIO: ${JSON.stringify(scenario)}

DESIGN SUBMISSION:
${design}

Provide detailed feedback with:
- Strengths of the design
- Areas for improvement
- Alternative approaches
- Overall score (0-100)
- Summary of the design quality

Format as JSON with: strengths[], improvements[], alternatives[], score, summary.`;

    } else if (type === "case-study") {
      systemPrompt = "You are an expert business case evaluator. Assess case study responses.";
      userPrompt = `Evaluate this case study response:

CASE STUDY: ${JSON.stringify(caseStudy)}

RESPONSE:
${response}

Provide detailed evaluation with:
- Scores for: problem_analysis, data_usage, solution_quality, business_acumen, communication (each 0-10)
- Overall score (0-100) based on weighted average
- Feedback on strengths and improvements
- Summary

Format as JSON with: scores{problem_analysis, data_usage, solution_quality, business_acumen, communication}, score (0-100), feedback{strengths[], improvements[]}, summary.`;

    } else {
      // Coding challenge evaluation
      systemPrompt = "You are an expert code reviewer. Evaluate coding solutions against test cases. Be detailed, highlight strengths and weaknesses, and give generous partial credit when solutions are mostly correct.";
      userPrompt = `Evaluate this code solution:

CODE:
${code}

LANGUAGE: ${language}

TEST CASES:
${JSON.stringify(testCases, null, 2)}

Run the code mentally against each test case and determine:
1. Which test cases pass/fail
2. Time and space complexity
3. Code quality and best practices
4. Suggestions for improvement
5. Key strengths of the solution
6. Key weaknesses or risks

Then assign a numeric score from 0-100, where:
- 90-100: All tests pass, excellent quality
- 70-89: Most tests pass, minor issues
- 40-69: Some tests pass, significant issues but core idea is partially correct
- 10-39: Few tests pass, major issues
- 1-9: Barely working or very incomplete
- 0: Completely incorrect or does not address the problem at all

Be lenient: if the overall approach is basically correct, keep the score above 60 even if there are some bugs.

Format as JSON with: 
- results[]: array of {input, expected, actual, passed: boolean}
- allPassed: boolean
- performance: {timeComplexity, spaceComplexity}
- codeQuality: string
- suggestions: string[]
- score: number
- summary: string
- overallFeedback: string
- correctness: string
- efficiency: string
- bestPractices: string
- strengths: string[]
- improvements: string[]`;
    }

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API Error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    evaluationResult = JSON.parse(aiContent);

    // For coding challenges, ensure we always have a reasonable, lenient score based on passed tests
    if (type !== "system-design" && type !== "case-study") {
      const results = evaluationResult.results || [];
      const total = results.length;
      const passedCount = results.filter((r: any) => r.passed).length;
      if (total > 0) {
        const passRatio = passedCount / total;
        let baseScore: number;
        if (passRatio === 1) {
          baseScore = 95;
        } else if (passRatio >= 0.75) {
          baseScore = 85;
        } else if (passRatio >= 0.5) {
          baseScore = 70;
        } else if (passRatio > 0) {
          baseScore = 55;
        } else {
          baseScore = 30;
        }
        const aiScore = typeof evaluationResult.score === "number" ? evaluationResult.score : baseScore;
        evaluationResult.score = Math.round((baseScore + aiScore) / 2);
      } else if (typeof evaluationResult.score !== "number") {
        // No structured test results; default to a moderately positive score if the AI didn't provide one
        evaluationResult.score = evaluationResult.allPassed === false ? 40 : 80;
      }
    }

    // Update challenge status if it's a coding challenge and all tests passed
    if (challengeId && evaluationResult.allPassed) {
      await supabase
        .from("technical_challenges")
        .update({ status: "completed" })
        .eq("id", challengeId);
    }

    return new Response(
      JSON.stringify(evaluationResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
