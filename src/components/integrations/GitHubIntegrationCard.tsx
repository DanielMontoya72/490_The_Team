import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Github, RefreshCw, Star, GitFork, Clock, Activity, ExternalLink } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export const GitHubIntegrationCard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Handle OAuth callback
  useEffect(() => {
    if (searchParams.get("github_success") === "true") {
      toast.success("GitHub connected successfully!");
      searchParams.delete("github_success");
      setSearchParams(searchParams);
      queryClient.invalidateQueries({ queryKey: ["github-integration"] });
      queryClient.invalidateQueries({ queryKey: ["github-repos"] });
    }
    if (searchParams.get("github_error")) {
      toast.error(`GitHub connection failed: ${searchParams.get("github_error")}`);
      searchParams.delete("github_error");
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams, queryClient]);

  // Fetch integration status
  const { data: integration, isLoading: integrationLoading } = useQuery({
    queryKey: ["github-integration"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("github_integrations")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch repositories
  const { data: repos, isLoading: reposLoading } = useQuery({
    queryKey: ["github-repos"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("github_repositories")
        .select("*")
        .eq("user_id", user.id)
        .order("stargazers_count", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!integration,
  });

  // Fetch user's skills to link with repos
  const { data: userSkills } = useQuery({
    queryKey: ["user-skills-for-github"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("skills")
        .select("skill_name")
        .eq("user_id", user.id);

      if (error) throw error;
      return data?.map(s => s.skill_name.toLowerCase()) || [];
    },
  });

  // Connect GitHub
  const connectGitHub = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in first");
        return;
      }

      const { data, error } = await supabase.functions.invoke("github-oauth-start", {
        body: { userId: user.id },
      });

      if (error) throw error;
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start GitHub connection");
    }
  };

  // Disconnect GitHub
  const disconnectGitHub = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("github_repositories").delete().eq("user_id", user.id);
      await supabase.from("github_integrations").delete().eq("user_id", user.id);

      queryClient.invalidateQueries({ queryKey: ["github-integration"] });
      queryClient.invalidateQueries({ queryKey: ["github-repos"] });
      toast.success("GitHub disconnected");
    } catch (error: any) {
      toast.error(error.message || "Failed to disconnect GitHub");
    }
  };

  // Sync repos
  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { data, error } = await supabase.functions.invoke("sync-github-repos", {
        body: { userId: user.id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["github-repos"] });
      queryClient.invalidateQueries({ queryKey: ["github-integration"] });
      toast.success(`Synced ${data?.count || 0} repositories`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to sync repositories");
    },
  });

  // Toggle featured
  const toggleFeatured = async (repoId: string, isFeatured: boolean) => {
    const { error } = await supabase
      .from("github_repositories")
      .update({ is_featured: !isFeatured })
      .eq("id", repoId);

    if (error) {
      toast.error("Failed to update featured status");
    } else {
      queryClient.invalidateQueries({ queryKey: ["github-repos"] });
    }
  };

  // Check if repo language matches user skills
  const getMatchingSkills = (repo: any) => {
    if (!userSkills || !repo.language) return [];
    const repoLang = repo.language.toLowerCase();
    const topics = (repo.topics || []).map((t: string) => t.toLowerCase());
    
    return userSkills.filter(skill => 
      skill === repoLang || 
      topics.includes(skill) ||
      skill.includes(repoLang) ||
      repoLang.includes(skill)
    );
  };

  if (integrationLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const featuredRepos = repos?.filter(r => r.is_featured) || [];
  const contributionData = integration?.contribution_data as { total_commits?: number; recent_activity?: any[] } | null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            <CardTitle className="text-lg">GitHub Integration</CardTitle>
          </div>
          {integration && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              Connected
            </Badge>
          )}
        </div>
        <CardDescription>
          Showcase your GitHub repositories and contributions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!integration ? (
          <Button onClick={connectGitHub} className="w-full">
            <Github className="h-4 w-4 mr-2" />
            Connect GitHub Account
          </Button>
        ) : (
          <>
            {/* Profile Info */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                {integration.github_avatar_url && (
                  <img 
                    src={integration.github_avatar_url} 
                    alt="GitHub avatar" 
                    className="h-10 w-10 rounded-full"
                  />
                )}
                <div>
                  <a 
                    href={`https://github.com/${integration.github_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline flex items-center gap-1"
                  >
                    @{integration.github_username}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="text-sm text-muted-foreground">
                    {repos?.length || 0} public repositories
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                Sync
              </Button>
            </div>

            {/* Contribution Activity */}
            {contributionData && (contributionData.total_commits || 0) > 0 && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Recent Activity</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{contributionData.total_commits} commits (last 100 events)</span>
                  <span>•</span>
                  <span>{contributionData.recent_activity?.length || 0} events in last 30 days</span>
                </div>
              </div>
            )}

            {/* Last Sync Info */}
            {integration.last_sync_at && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last synced {formatDistanceToNow(new Date(integration.last_sync_at), { addSuffix: true })}
              </div>
            )}

            {/* Featured Repos */}
            <div>
              <h4 className="font-medium mb-2">Featured Repositories ({featuredRepos.length})</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Toggle repositories to feature them on your profile
              </p>
              
              {reposLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {repos?.slice(0, 15).map((repo) => {
                    const matchingSkills = getMatchingSkills(repo);
                    return (
                      <div 
                        key={repo.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          repo.is_featured ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <a 
                              href={repo.html_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="font-medium hover:underline truncate"
                            >
                              {repo.name}
                            </a>
                            {repo.language && (
                              <Badge variant="secondary" className="text-xs">
                                {repo.language}
                              </Badge>
                            )}
                            {matchingSkills.length > 0 && (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                                Matches skills
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {repo.description || "No description"}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3" /> {repo.stargazers_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <GitFork className="h-3 w-3" /> {repo.forks_count}
                            </span>
                            {repo.pushed_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> 
                                Updated {formatDistanceToNow(new Date(repo.pushed_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                          {repo.topics && repo.topics.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {repo.topics.slice(0, 5).map((topic: string) => (
                                <Badge key={topic} variant="outline" className="text-xs">
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Switch
                          checked={repo.is_featured || false}
                          onCheckedChange={() => toggleFeatured(repo.id, repo.is_featured)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button variant="outline" onClick={disconnectGitHub} className="w-full">
              Disconnect GitHub
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};