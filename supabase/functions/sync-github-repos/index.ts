import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the user's GitHub integration
    const { data: integration, error: integrationError } = await supabaseClient
      .from("github_integrations")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (integrationError || !integration) {
      throw new Error("GitHub not connected");
    }

    const headers = {
      "Authorization": `Bearer ${integration.access_token}`,
      "Accept": "application/vnd.github.v3+json",
    };

    // Fetch user's public repositories
    const reposResponse = await fetch("https://api.github.com/user/repos?type=owner&sort=updated&per_page=100", {
      headers,
    });

    if (!reposResponse.ok) {
      throw new Error("Failed to fetch repositories");
    }

    const repos = await reposResponse.json();

    // Fetch contribution activity (events)
    let contributionData = { total_commits: 0, recent_activity: [] as any[] };
    try {
      const eventsResponse = await fetch(`https://api.github.com/users/${integration.github_username}/events?per_page=100`, {
        headers,
      });
      if (eventsResponse.ok) {
        const events = await eventsResponse.json();
        const pushEvents = events.filter((e: any) => e.type === "PushEvent");
        const totalCommits = pushEvents.reduce((sum: number, e: any) => sum + (e.payload?.commits?.length || 0), 0);
        
        // Get recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentEvents = events.filter((e: any) => new Date(e.created_at) > thirtyDaysAgo);
        
        contributionData = {
          total_commits: totalCommits,
          recent_activity: recentEvents.slice(0, 20).map((e: any) => ({
            type: e.type,
            repo: e.repo?.name,
            created_at: e.created_at,
            commits: e.payload?.commits?.length || 0,
          })),
        };
      }
    } catch (e) {
      console.log("Could not fetch contribution data:", e);
    }

    // Get existing featured repos to preserve is_featured status
    const { data: existingRepos } = await supabaseClient
      .from("github_repositories")
      .select("repo_id, is_featured")
      .eq("user_id", userId);

    const featuredMap = new Map(existingRepos?.map(r => [r.repo_id, r.is_featured]) || []);

    // Delete old repos and insert new ones
    await supabaseClient
      .from("github_repositories")
      .delete()
      .eq("user_id", userId);

    // Insert/update repositories
    const repoRecords = repos
      .filter((repo: any) => !repo.private)
      .map((repo: any) => ({
        user_id: userId,
        repo_id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        watchers_count: repo.watchers_count,
        open_issues_count: repo.open_issues_count,
        is_fork: repo.fork,
        is_featured: featuredMap.get(repo.id) || false,
        topics: repo.topics || [],
        pushed_at: repo.pushed_at,
        updated_at: new Date().toISOString(),
      }));

    if (repoRecords.length > 0) {
      const { error: insertError } = await supabaseClient
        .from("github_repositories")
        .insert(repoRecords);

      if (insertError) {
        console.error("Error inserting repos:", insertError);
        throw insertError;
      }
    }

    // Update integration with last sync time and contribution data
    await supabaseClient
      .from("github_integrations")
      .update({ 
        last_sync_at: new Date().toISOString(),
        contribution_data: contributionData,
      })
      .eq("user_id", userId);

    console.log(`Synced ${repoRecords.length} repositories for user:`, userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: repoRecords.length,
        repos: repoRecords,
        contributions: contributionData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in sync-github-repos:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to sync repos" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});