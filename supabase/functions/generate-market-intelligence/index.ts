import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** -----------------------------
 *  Industry normalization
 *  ----------------------------- */
function normalizeIndustry(raw?: string) {
  const s = (raw || "").toLowerCase().trim();

  const map: Record<string, { domain: string; label: string }> = {
    // Healthcare umbrella
    cardiology: { domain: "healthcare", label: "Cardiology" },
    cardiologist: { domain: "healthcare", label: "Cardiology" },
    dentistry: { domain: "healthcare", label: "Dentistry" },
    dentist: { domain: "healthcare", label: "Dentistry" },
    medicine: { domain: "healthcare", label: "Healthcare" },
    nursing: { domain: "healthcare", label: "Healthcare" },
    "public health": { domain: "healthcare", label: "Healthcare" },
    healthcare: { domain: "healthcare", label: "Healthcare" },

    // Law umbrella
    law: { domain: "law", label: "Law" },
    legal: { domain: "law", label: "Law" },
    litigation: { domain: "law", label: "Litigation" },
    "corporate law": { domain: "law", label: "Corporate Law" },

    // Finance umbrella
    finance: { domain: "finance", label: "Finance" },
    banking: { domain: "finance", label: "Banking" },
    fintech: { domain: "finance", label: "FinTech" },
    accounting: { domain: "finance", label: "Accounting" },

    // Tech umbrella
    technology: { domain: "technology", label: "Technology" },
    software: { domain: "technology", label: "Software" },
    "data science": { domain: "technology", label: "Data Science" },
    ai: { domain: "technology", label: "AI/ML" },
    "machine learning": { domain: "technology", label: "AI/ML" },
    "computer science": { domain: "technology", label: "Technology" },
  };

  // If not in map, treat as its own domain with the raw value as label
  const normalized = map[s];
  if (normalized) return normalized;
  
  // Determine domain based on keywords
  if (s.includes("health") || s.includes("medical") || s.includes("doctor") || s.includes("nurse")) {
    return { domain: "healthcare", label: raw || "Healthcare" };
  }
  if (s.includes("law") || s.includes("legal") || s.includes("attorney")) {
    return { domain: "law", label: raw || "Law" };
  }
  if (s.includes("financ") || s.includes("bank") || s.includes("account")) {
    return { domain: "finance", label: raw || "Finance" };
  }
  if (s.includes("tech") || s.includes("software") || s.includes("engineer") || s.includes("data")) {
    return { domain: "technology", label: raw || "Technology" };
  }
  
  // Default: use raw as both domain and label
  return { domain: raw || "other", label: raw || "Other" };
}

/** -----------------------------
 *  Domain blocklist filter
 *  ----------------------------- */
const DOMAIN_BLOCKLIST: Record<string, RegExp[]> = {
  healthcare: [
    /python|javascript|react|node\.js|node|aws|docker|kubernetes|devops|frontend|backend|software engineer|data engineer/i,
  ],
  law: [
    /python|javascript|react|node\.js|node|aws|docker|kubernetes|devops|frontend|backend|software engineer|data engineer/i,
  ],
  finance: [
    /python|javascript|react|node\.js|node|aws|docker|kubernetes|devops|frontend|backend|software engineer|data engineer/i,
  ],
  technology: [], // tech can include tech tools
};

function isBlocked(domain: string, text: string) {
  return (DOMAIN_BLOCKLIST[domain] || []).some((rx) => rx.test(text));
}

/** -----------------------------
 *  Helpers
 *  ----------------------------- */
async function callGemini(GEMINI_API_KEY: string, prompt: string, system: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${system}\n\n${prompt}` }]
          }
        ],
      }),
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  let content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  content = content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error("JSON parse error:", e, content);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) throw new Error("Unauthorized");

    const { industry, location } = await req.json();
    const norm = normalizeIndustry(industry);

    console.log(
      `[MI] user=${user.id}, raw_industry=${industry}, domain=${norm.domain}, label=${norm.label}, location=${location}`,
    );

    // Profile + skills + jobs
    const { data: profile } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).single();

    const { data: skills } = await supabase
      .from("skills")
      .select("skill_name, proficiency_level, years_experience")
      .eq("user_id", user.id);

    const { data: jobs } = await supabase
      .from("jobs")
      .select("job_title, company_name, industry, status")
      .eq("user_id", user.id)
      .limit(20);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    // Delete ALL previous market intelligence data for this user (reset on each generation)
    console.log("[MI] Deleting all previous market intelligence data for user");
    await supabase.from("skill_demand_trends").delete().eq("user_id", user.id);
    await supabase.from("market_trends").delete().eq("user_id", user.id);
    await supabase.from("market_insights").delete().eq("user_id", user.id).eq("insight_type", "career_positioning");
    await supabase.from("company_growth_tracking").delete().eq("user_id", user.id);

    // Extract unique job titles, companies, and industries from user's applications
    const uniqueJobTitles = [...new Set(jobs?.map((j) => j.job_title).filter(Boolean) || [])];
    const uniqueCompanies = [...new Set(jobs?.map((j) => j.company_name).filter(Boolean) || [])];
    const uniqueIndustries = [...new Set(jobs?.map((j) => j.industry).filter(Boolean) || [])];
    const userSkillNames = skills?.map((s) => s.skill_name) || [];

    /** ---------------------------------------------------
     *  1) COMBINED: Skills + Trends Analysis (PERSONALIZED)
     *  --------------------------------------------------- */
    const combinedPrompt = `
Generate PERSONALIZED market intelligence for a job seeker in the ${norm.label} industry.

=== USER'S JOB SEARCH CONTEXT (CRITICAL - USE THIS DATA) ===
Target Industry: ${norm.label}
Location: ${location || "Global"}
Jobs They're Applying To: ${uniqueJobTitles.slice(0, 10).join(", ") || "Not specified"}
Companies They're Targeting: ${uniqueCompanies.slice(0, 10).join(", ") || "Not specified"}
Industries in Applications: ${uniqueIndustries.join(", ") || norm.label}
Their Current Skills: ${userSkillNames.join(", ") || "None listed"}
Skills with Proficiency: ${skills?.map((s) => `${s.skill_name} (${s.proficiency_level}, ${s.years_experience || 0}yr)`).join(", ") || "None"}

=== PERSONALIZATION REQUIREMENTS ===
1. SKILLS: Generate skills that would help them land the jobs they're applying for (${uniqueJobTitles.slice(0, 3).join(", ") || "roles in " + norm.label})
2. Compare their current skills against what's needed - highlight gaps and strengths
3. Hot roles should include or relate to: ${uniqueJobTitles.slice(0, 5).join(", ") || "typical " + norm.label + " roles"}
4. Salary data should reflect roles similar to what they're targeting
5. Market trends should directly impact their job search strategy

${norm.domain !== "technology" ? `
NEVER include for ${norm.label}:
- Programming languages (Python, JavaScript, Java, etc.)
- Web frameworks (React, Node.js, Angular, etc.)
- Cloud platforms (AWS, Azure, GCP)
- Software engineering roles or DevOps tools
` : ""}

Return JSON with:
{
  "skills": [
    {
      "skill_name": "skill relevant to their target jobs",
      "demand_score": 0-100,
      "growth_rate": percentage as number,
      "market_saturation": 0-1,
      "average_salary": number in USD for roles requiring this skill,
      "trend_direction": "rising|stable|declining|emerging",
      "related_skills": ["skill that pairs well"],
      "relevance_to_user": "Why this skill matters for their job search"
    }
  ],
  "job_demand": {
    "growth_rate": percentage for their target role category,
    "hot_roles": ["roles similar to what they're applying for"],
    "declining_roles": ["roles to avoid"],
    "market_size": "Market outlook for their target roles in ${location || "Global"}"
  },
  "salary_trends": {
    "average_growth": percentage as number,
    "high_paying_roles": [{"role":"role relevant to their applications","salary":number}]
  },
  "disruptions": {
    "emerging_technologies": ["tech affecting their target jobs"],
    "market_shifts": "How market changes affect their job search",
    "competitive_landscape": "Competition level for their target roles",
    "future_outlook": "Outlook for professionals targeting these roles"
  }
}
`;

    const combinedParsed = await callGemini(
      GEMINI_API_KEY,
      combinedPrompt,
      "You generate realistic market intelligence data. Always return valid JSON with all required fields populated with realistic values.",
    );

    let insertedSkills = 0;

    // Insert skills
    console.log("[MI] Raw skills from AI:", combinedParsed?.skills?.map((s: any) => s.skill_name).join(", "));
    if (combinedParsed?.skills && Array.isArray(combinedParsed.skills)) {
      for (const skill of combinedParsed.skills) {
        if (!skill?.skill_name) continue;
        if (isBlocked(norm.domain, skill.skill_name)) {
          console.log("[MI] BLOCKED skill:", skill.skill_name);
          continue;
        }

        await supabase.from("skill_demand_trends").insert({
          user_id: user.id,
          skill_name: skill.skill_name,
          industry: norm.label,
          demand_score: skill.demand_score ?? 50,
          growth_rate: skill.growth_rate ?? 0,
          market_saturation: skill.market_saturation ?? 0.5,
          average_salary: skill.average_salary ?? 0,
          trend_direction: skill.trend_direction ?? "stable",
          related_skills: skill.related_skills ?? [],
        });

        insertedSkills++;
      }
    }

    // Insert market trends
    if (combinedParsed?.job_demand || combinedParsed?.salary_trends || combinedParsed?.disruptions) {
      const hotRoles = (combinedParsed.job_demand?.hot_roles || []).filter((r: string) => !isBlocked(norm.domain, r));
      const decliningRoles = (combinedParsed.job_demand?.declining_roles || []).filter(
        (r: string) => !isBlocked(norm.domain, r),
      );

      if (combinedParsed.job_demand) {
        await supabase.from("market_trends").insert({
          user_id: user.id,
          industry: norm.label,
          location: location || "Global",
          trend_type: "job_demand",
          trend_data: {
            ...combinedParsed.job_demand,
            hot_roles: hotRoles,
            declining_roles: decliningRoles,
          },
        });
      }

      if (combinedParsed.salary_trends) {
        await supabase.from("market_trends").insert({
          user_id: user.id,
          industry: norm.label,
          location: location || "Global",
          trend_type: "salary",
          trend_data: combinedParsed.salary_trends,
        });
      }

      if (combinedParsed.disruptions) {
        await supabase.from("market_trends").insert({
          user_id: user.id,
          industry: norm.label,
          location: location || "Global",
          trend_type: "disruption",
          trend_data: combinedParsed.disruptions,
        });
      }
    }


    /** ---------------------------------------------------
     *  2) Career Positioning Recommendations (PERSONALIZED)
     *  --------------------------------------------------- */
    const recommendationPrompt = `
Generate PERSONALIZED career recommendations for this specific job seeker.

=== USER'S ACTUAL JOB SEARCH DATA ===
Jobs They're Applying For: ${uniqueJobTitles.join(", ") || "Not specified"}
Companies They're Targeting: ${uniqueCompanies.join(", ") || "Not specified"}
Their Current Skills: ${userSkillNames.join(", ") || "None listed"}
Target Industry: ${norm.label}

=== MARKET CONTEXT ===
In-Demand Skills: ${combinedParsed?.skills?.map((s: any) => s.skill_name).join(", ") || "industry skills"}
Hot Roles: ${combinedParsed?.job_demand?.hot_roles?.join(", ") || "various roles"}

=== PERSONALIZATION REQUIREMENTS ===
1. Each recommendation MUST directly reference their target jobs (${uniqueJobTitles.slice(0, 3).join(", ") || "target roles"})
2. Identify SKILL GAPS between what they have and what their target jobs need
3. Suggest specific actions to improve their chances at companies like: ${uniqueCompanies.slice(0, 5).join(", ") || "their targets"}
4. Prioritize recommendations that will have the biggest impact on their specific job search
5. Include timing advice (when to apply, when to skill up, etc.)

${norm.domain !== "technology" ? "Do NOT mention programming languages or tech frameworks." : ""}

Return JSON:
{
  "recommendations": [
    {
      "title": "specific recommendation for their job search",
      "description": "detailed explanation referencing their specific situation",
      "priority": "low|medium|high|critical",
      "timeframe": "immediate|short_term|long_term",
      "action_items": ["specific action 1", "specific action 2"],
      "impact": "How this will improve their chances at their target jobs"
    }
  ]
}
`;

    const recParsed = await callGemini(
      GEMINI_API_KEY,
      recommendationPrompt,
      "You are a career strategist. Base recommendations on the skills and roles already identified for this industry.",
    );

    const insights: any[] = [];
    if (recParsed?.recommendations && Array.isArray(recParsed.recommendations)) {
      for (const rec of recParsed.recommendations) {
        if (!rec?.title) continue;
        if (isBlocked(norm.domain, rec.title)) continue;

        insights.push({
          user_id: user.id,
          insight_type: "career_positioning",
          industry: norm.label,
          insight_title: rec.title,
          insight_description: rec.description,
          priority_level: rec.priority ?? "medium",
          timeframe: rec.timeframe ?? "short_term",
          action_items: rec.action_items ?? [],
          impact_assessment: rec.impact ?? "",
        });
      }
    }

    if (insights.length > 0) {
      await supabase.from("market_insights").insert(insights);
    }

    /** ---------------------------------------------------
     *  3) Company Growth Tracking (PERSONALIZED)
     *  --------------------------------------------------- */
    const companyPrompt = `
Generate a PERSONALIZED list of companies for this job seeker to target.

=== USER'S TARGET COMPANIES (MUST INCLUDE THESE IF RELEVANT) ===
Companies They're Already Applying To: ${uniqueCompanies.join(", ") || "None specified"}
Jobs They're Targeting: ${uniqueJobTitles.join(", ") || "Not specified"}
Target Industry: ${norm.label}
Location: ${location || "Global"}

=== REQUIREMENTS ===
1. If they have existing target companies, INCLUDE those first with real data
2. Then add 5-8 SIMILAR companies they should also consider
3. Companies should be hiring for roles like: ${uniqueJobTitles.slice(0, 5).join(", ") || "roles in " + norm.label}
4. Prioritize companies with HIGH hiring activity
5. Include competitors of their target companies

Return JSON:
{
  "companies": [
    {
      "company_name": "company name",
      "growth_indicators": {
        "revenue_growth": number (percentage),
        "employee_growth": number (percentage),
        "funding_raised": number (in millions USD, 0 if bootstrapped/public)
      },
      "hiring_activity": "high|moderate|low|declining",
      "opportunity_score": 0-1,
      "why_relevant": "Why this company is relevant to their job search",
      "recent_news": [
        { "title": "headline", "summary": "short summary", "date": "YYYY-MM-DD" }
      ]
    }
  ]
}
`;

    const companiesParsed = await callGemini(
      GEMINI_API_KEY,
      companyPrompt,
      "You are a market intelligence analyst tracking high-growth companies.",
    );

    if (companiesParsed?.companies && Array.isArray(companiesParsed.companies)) {
      for (const company of companiesParsed.companies) {
        if (!company?.company_name) continue;
        if (isBlocked(norm.domain, company.company_name)) continue;

        // Format funding_raised as a proper number or string with "$" prefix
        const growthIndicators = company.growth_indicators ?? {};
        if (typeof growthIndicators.funding_raised === "number") {
          growthIndicators.funding_raised = growthIndicators.funding_raised === 0 
            ? "Bootstrapped/Public" 
            : `$${growthIndicators.funding_raised}M`;
        }

        await supabase.from("company_growth_tracking").insert({
          user_id: user.id,
          company_name: company.company_name,
          industry: norm.label,
          growth_indicators: growthIndicators,
          hiring_activity: company.hiring_activity ?? "moderate",
          opportunity_score: company.opportunity_score ?? 0.5,
          recent_news: company.recent_news ?? [],
        });
      }
    }

    console.log(`[MI] Done. skills_inserted=${insertedSkills}, insights=${insights.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        industry: norm.label,
        domain: norm.domain,
        skills_inserted: insertedSkills,
        insights_count: insights.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in generate-market-intelligence:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
