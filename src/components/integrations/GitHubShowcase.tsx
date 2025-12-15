import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Github, Star, GitFork, Clock, ExternalLink, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface GitHubShowcaseProps {
  userId?: string;
}

export const GitHubShowcase = ({ userId }: GitHubShowcaseProps) => {
  // Fetch integration status
  const { data: integration, isLoading: integrationLoading } = useQuery({
    queryKey: ["github-showcase-integration", userId],
    queryFn: async () => {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from("github_integrations")
        .select("*")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch featured repositories
  const { data: featuredRepos, isLoading: reposLoading } = useQuery({
    queryKey: ["github-showcase-repos", userId],
    queryFn: async () => {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from("github_repositories")
        .select("*")
        .eq("user_id", targetUserId)
        .eq("is_featured", true)
        .order("stargazers_count", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!integration,
  });

  if (integrationLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Don't show anything if no GitHub connected or no featured repos
  if (!integration || !featuredRepos || featuredRepos.length === 0) {
    return null;
  }

  const contributionData = integration.contribution_data as { total_commits?: number; recent_activity?: any[] } | null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            <CardTitle className="text-lg">GitHub Projects</CardTitle>
          </div>
          <a 
            href={`https://github.com/${integration.github_username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            @{integration.github_username}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contribution Stats */}
        {contributionData && (contributionData.total_commits || 0) > 0 && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground pb-3 border-b">
            <div className="flex items-center gap-1">
              <Activity className="h-4 w-4" />
              <span>{contributionData.total_commits} recent commits</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{contributionData.recent_activity?.length || 0} events (30 days)</span>
            </div>
          </div>
        )}

        {/* Featured Repositories */}
        {reposLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {featuredRepos.map((repo) => (
              <a
                key={repo.id}
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{repo.name}</span>
                      {repo.language && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {repo.language}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {repo.description || "No description"}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" /> {repo.stargazers_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="h-3 w-3" /> {repo.forks_count}
                      </span>
                      {repo.pushed_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> 
                          {formatDistanceToNow(new Date(repo.pushed_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
                {repo.topics && repo.topics.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {repo.topics.slice(0, 4).map((topic: string) => (
                      <Badge key={topic} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};