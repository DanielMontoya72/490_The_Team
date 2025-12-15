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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Fetch user's goals and progress
    const { data: goals } = await supabase
      .from("career_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const { data: progressData } = await supabase
      .from("goal_progress_tracking")
      .select("*")
      .eq("user_id", user.id)
      .order("update_date", { ascending: false });

    const { data: achievements } = await supabase
      .from("goal_achievements")
      .select("*")
      .eq("user_id", user.id)
      .order("achievement_date", { ascending: false });

    if (!goals || goals.length === 0) {
      return new Response(
        JSON.stringify({ message: "No goals to analyze" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // Analyze goals for insights
    const insights = [];
    const today = new Date();

    for (const goal of goals) {
      if (goal.status === "completed") continue;

      const goalProgress = progressData?.filter(p => p.goal_id === goal.id) || [];
      const latestProgress = goalProgress[0];
      const targetDate = goal.target_date ? new Date(goal.target_date) : null;

      // Check if goal is behind schedule
      if (targetDate && goal.progress_percentage < 100) {
        const daysUntilTarget = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const expectedProgress = daysUntilTarget > 0 
          ? Math.min(100, 100 - (daysUntilTarget / 90) * 100) // Assuming 90-day goals
          : 100;

        if (goal.progress_percentage < expectedProgress - 20) {
          const aiPrompt = `Generate a supportive and actionable insight for a user whose career goal is behind schedule.
          
Goal: ${goal.goal_title}
Description: ${goal.goal_description || "No description"}
Current Progress: ${goal.progress_percentage}%
Target Date: ${goal.target_date}
Days Until Target: ${daysUntilTarget}
Recent Challenges: ${latestProgress?.challenges || "Not specified"}

Provide:
1. A brief, encouraging title (max 60 chars)
2. A supportive description explaining why they might be behind (2-3 sentences)
3. 3-4 specific, actionable recommendations to get back on track

Format as JSON: {"title": "...", "description": "...", "actions": ["...", "..."]}`;

          const aiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [{ text: `You are a supportive career coach helping users achieve their goals.\n\n${aiPrompt}` }]
                  }
                ],
              }),
            }
          );

          if (!aiResponse.ok) {
            console.error("AI API error:", await aiResponse.text());
            continue;
          }

          const aiData = await aiResponse.json();
          let content = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (content) {
            try {
              // Strip markdown code blocks if present
              content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
              const parsed = JSON.parse(content);
              insights.push({
                goal_id: goal.id,
                type: "adjustment_recommendation",
                title: parsed.title,
                description: parsed.description,
                actions: parsed.actions,
              });
            } catch (e) {
              console.error("Failed to parse AI response:", e);
            }
          }
        }
      }

      // Check for slow progress
      if (goalProgress.length >= 2) {
        const recentUpdates = goalProgress.slice(0, 3);
        const progressIncrease = recentUpdates[0].progress_percentage - (recentUpdates[recentUpdates.length - 1].progress_percentage || 0);
        
        if (progressIncrease < 5 && goal.progress_percentage < 90) {
          const aiPrompt = `Generate a motivational insight for a user whose career goal progress has been slow.
          
Goal: ${goal.goal_title}
Current Progress: ${goal.progress_percentage}%
Recent Progress Increase: ${progressIncrease}%
Last Update: ${latestProgress?.notes || "No notes"}

Provide:
1. A motivating title (max 60 chars)
2. An understanding description addressing slow progress (2-3 sentences)
3. 3 specific strategies to increase momentum

Format as JSON: {"title": "...", "description": "...", "actions": ["...", "..."]}`;

          const aiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [{ text: `You are a supportive career coach helping users achieve their goals.\n\n${aiPrompt}` }]
                  }
                ],
              }),
            }
          );

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            let content = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (content) {
              try {
                // Strip markdown code blocks if present
                content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const parsed = JSON.parse(content);
                insights.push({
                  goal_id: goal.id,
                  type: "motivation",
                  title: parsed.title,
                  description: parsed.description,
                  actions: parsed.actions,
                });
              } catch (e) {
                console.error("Failed to parse AI response:", e);
              }
            }
          }
        }
      }

      // Check for milestone completions
      const milestonesArray = Array.isArray(goal.time_bound_milestones) ? goal.time_bound_milestones : [];
      if (latestProgress?.milestone_completed && milestonesArray.length > 0) {
        const aiPrompt = `Generate a celebratory insight for a user who just completed a career goal milestone.
        
Goal: ${goal.goal_title}
Milestone Completed: ${latestProgress.milestone_completed}
Current Progress: ${goal.progress_percentage}%
Reflection: ${latestProgress.reflection || "None"}

Provide:
1. A celebratory title (max 60 chars)
2. A congratulatory description acknowledging their achievement (2-3 sentences)
3. 2-3 suggestions for maintaining momentum and next steps

Format as JSON: {"title": "...", "description": "...", "actions": ["...", "..."]}`;

        const aiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: `You are a supportive career coach helping users achieve their goals.\n\n${aiPrompt}` }]
                }
              ],
            }),
          }
        );

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          let content = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (content) {
            try {
              // Strip markdown code blocks if present
              content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
              const parsed = JSON.parse(content);
              insights.push({
                goal_id: goal.id,
                type: "success_pattern",
                title: parsed.title,
                description: parsed.description,
                actions: parsed.actions,
              });
            } catch (e) {
              console.error("Failed to parse AI response:", e);
            }
          }
        }
      }
    }

    // Insert insights into database
    if (insights.length > 0) {
      const insightsToInsert = insights.map(insight => ({
        user_id: user.id,
        insight_type: insight.type,
        insight_title: insight.title,
        insight_description: insight.description,
        action_items: insight.actions,
        related_goals: [insight.goal_id],
        generated_at: new Date().toISOString(),
        acknowledged: false,
      }));

      const { error: insertError } = await supabase
        .from("goal_insights")
        .insert(insightsToInsert);

      if (insertError) {
        console.error("Error inserting insights:", insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        insights_generated: insights.length,
        message: insights.length > 0 ? "Insights generated successfully" : "No new insights to generate"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating goal insights:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
