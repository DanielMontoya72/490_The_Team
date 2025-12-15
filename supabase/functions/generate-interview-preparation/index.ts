import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interviewId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get interview details with job information
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select(`
        *,
        jobs!inner(
          job_title,
          company_name,
          company_size,
          industry,
          location,
          company_description,
          job_description
        )
      `)
      .eq('id', interviewId)
      .single();

    if (interviewError || !interview) {
      throw new Error('Interview not found');
    }

    const job = interview.jobs;

    const systemPrompt = `You are an expert interview preparation coach. Generate a comprehensive, actionable preparation checklist for an upcoming interview.

Return a JSON object with this exact structure:
{
  "preparation_tasks": [
    {
      "category": "Research & Preparation|Logistics|Confidence Building|Materials|Questions|Post-Interview",
      "task": "specific actionable task",
      "description": "detailed description of what to do and why it's important",
      "priority": "high|medium|low",
      "completed": false,
      "estimated_time_minutes": number
    }
  ]
}

CRITICAL REQUIREMENTS - You MUST include ALL of these:

1. ROLE-SPECIFIC PREPARATION TASKS (at least 3):
   - Tasks specifically tailored to the job title and responsibilities
   - Industry-specific knowledge or trends to review
   - Technical skills or concepts to brush up on for the role

2. THOUGHTFUL QUESTIONS TO PREPARE (at least 3):
   - Questions about team dynamics and collaboration
   - Questions about role expectations and growth opportunities
   - Questions about company culture and values
   - Questions about current challenges or projects

3. ATTIRE SUGGESTIONS (at least 1):
   - Specific dress code recommendation based on industry and company culture
   - Include reasoning (e.g., "Business casual for tech startup" or "Conservative suit for finance")

4. LOGISTICS VERIFICATION (at least 3):
   - Confirm exact interview location/link
   - Test video/audio technology if virtual
   - Plan transportation and arrival time
   - Verify interviewer names and titles

5. PORTFOLIO/WORK SAMPLES PREPARATION (at least 2):
   - Identify relevant work samples to bring or share
   - Prepare portfolio or project demonstrations
   - Print physical copies if needed

6. POST-INTERVIEW FOLLOW-UP REMINDERS (at least 2):
   - Prepare thank-you email template
   - Set reminder to send follow-up within 24 hours
   - Note key topics to reference in follow-up

Categories must include:
- Research & Preparation: Company research, role-specific knowledge, industry trends
- Logistics: Location/link verification, technology setup, timing confirmation, transportation
- Confidence Building: Mock interview practice, stress management, positive affirmations
- Materials: Portfolio, work samples, reference list
- Questions: Thoughtful questions prepared for the interviewer
- Post-Interview: Thank-you email, follow-up reminders, next steps`;

    const userPrompt = `Generate a detailed interview preparation checklist for:

Interview Details:
- Type: ${interview.interview_type}
- Date: ${new Date(interview.interview_date).toLocaleDateString()}
- Company: ${job.company_name}
- Role: ${job.job_title}
- Location: ${interview.location || interview.meeting_link || 'Not specified'}
- Duration: ${interview.duration_minutes} minutes

Company Context:
- Industry: ${job.industry || 'Not specified'}
- Company Size: ${job.company_size || 'Not specified'}
- Description: ${job.company_description || 'Not specified'}

Job Context:
${job.job_description ? `Job Description: ${job.job_description.substring(0, 500)}...` : 'No description provided'}

Generate 18-25 specific, actionable tasks covering ALL CRITICAL REQUIREMENTS mentioned in the system prompt. 

MUST INCLUDE:
- At least 3 role-specific preparation tasks tailored to "${job.job_title}"
- At least 3 thoughtful questions to ask the interviewer
- At least 1 specific attire recommendation for ${job.industry || 'this industry'}
- At least 3 logistics verification tasks (location/link, technology, timing, transportation)
- At least 2 portfolio/work sample preparation tasks
- At least 2 post-interview follow-up reminders

Make all tasks concrete, actionable, and highly relevant to this specific role, company, and interview context.`;

    console.log('Calling Gemini AI for preparation checklist...');

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    console.log('AI Response received, parsing...');

    let preparationData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        preparationData = JSON.parse(jsonMatch[0]);
      } else {
        preparationData = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse preparation checklist from AI response');
    }

    // Update interview with preparation tasks
    const { data: updatedInterview, error: updateError } = await supabase
      .from('interviews')
      .update({
        preparation_tasks: preparationData.preparation_tasks
      })
      .eq('id', interviewId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ preparation_tasks: preparationData.preparation_tasks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-interview-preparation:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
