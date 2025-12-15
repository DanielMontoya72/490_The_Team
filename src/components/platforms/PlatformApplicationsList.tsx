import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Linkedin, 
  FileText, 
  Building2, 
  Globe,
  Search,
  ExternalLink,
  Loader2,
  Filter
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="h-4 w-4 text-blue-500" />,
  indeed: <FileText className="h-4 w-4 text-purple-500" />,
  glassdoor: <Building2 className="h-4 w-4 text-green-500" />,
  ziprecruiter: <Globe className="h-4 w-4 text-orange-500" />,
  company_site: <Building2 className="h-4 w-4 text-gray-500" />,
  other: <Globe className="h-4 w-4" />
};

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-blue-500/10 text-blue-600",
  phone_screen: "bg-purple-500/10 text-purple-600",
  interview: "bg-amber-500/10 text-amber-600",
  offer: "bg-green-500/10 text-green-600",
  rejected: "bg-red-500/10 text-red-600",
  accepted: "bg-emerald-500/10 text-emerald-600",
};

export function PlatformApplicationsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: applications, isLoading } = useQuery({
    queryKey: ["platform-applications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: jobs, error } = await supabase
        .from("jobs")
        .select(`
          id,
          job_title,
          company_name,
          location,
          status,
          created_at,
          primary_platform,
          platform_count,
          application_platforms (
            id,
            platform_name,
            platform_status,
            is_primary,
            applied_via_url,
            created_at
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return jobs;
    }
  });

  const filteredApplications = applications?.filter(app => {
    const matchesSearch = 
      app.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPlatform = platformFilter === "all" || 
      app.primary_platform === platformFilter ||
      app.application_platforms?.some((p: any) => p.platform_name === platformFilter);
    
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;

    return matchesSearch && matchesPlatform && matchesStatus;
  });

  const uniquePlatforms = [...new Set(
    applications?.flatMap(a => 
      [a.primary_platform, ...((a.application_platforms as any[])?.map(p => p.platform_name) || [])]
    ).filter(Boolean) || []
  )];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Applications</CardTitle>
        <CardDescription>
          Unified view of applications across all platforms
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by job title or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {uniquePlatforms.map(p => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p?.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="phone_screen">Phone Screen</SelectItem>
              <SelectItem value="interview">Interview</SelectItem>
              <SelectItem value="offer">Offer</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Applications List */}
        <div className="space-y-3">
          {filteredApplications?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No applications found matching your filters
            </div>
          ) : (
            filteredApplications?.map(app => (
              <div 
                key={app.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{app.job_title}</h4>
                    <Badge 
                      variant="secondary"
                      className={STATUS_COLORS[app.status || "applied"]}
                    >
                      {app.status?.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {app.company_name}
                    {app.location && ` • ${app.location}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Applied {format(new Date(app.created_at), "MMM d, yyyy")}
                  </p>
                </div>

                {/* Platforms */}
                <div className="flex items-center gap-2">
                  {(app.platform_count || 1) > 1 && (
                    <Badge variant="outline" className="text-xs">
                      {app.platform_count} platforms
                    </Badge>
                  )}
                  <div className="flex -space-x-1">
                    {app.primary_platform && (
                      <div className="p-1.5 rounded-full bg-muted border-2 border-background">
                        {PLATFORM_ICONS[app.primary_platform] || PLATFORM_ICONS.other}
                      </div>
                    )}
                    {(app.application_platforms as any[])?.slice(0, 3).map((p: any) => (
                      p.platform_name !== app.primary_platform && (
                        <div 
                          key={p.id}
                          className="p-1.5 rounded-full bg-muted border-2 border-background"
                        >
                          {PLATFORM_ICONS[p.platform_name] || PLATFORM_ICONS.other}
                        </div>
                      )
                    ))}
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`/jobs?id=${app.id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
