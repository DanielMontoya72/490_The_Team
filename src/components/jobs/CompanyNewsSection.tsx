import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Newspaper, 
  ExternalLink, 
  Download, 
  Filter, 
  Star, 
  Bell, 
  BellOff,
  TrendingUp,
  Briefcase,
  Award,
  Users,
  Package
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NewsItem {
  title: string;
  date: string;
  summary: string;
  url: string;
  category?: string;
  relevance_score?: number;
  key_points?: string[];
  source?: string;
}

interface CompanyNewsSectionProps {
  jobId: string;
  companyName: string;
  news: NewsItem[];
}

const categoryIcons: Record<string, any> = {
  funding: TrendingUp,
  product_launch: Package,
  hiring: Users,
  partnership: Briefcase,
  award: Award,
  general: Newspaper,
};

const categoryColors: Record<string, string> = {
  funding: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  product_launch: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  hiring: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  partnership: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  award: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  general: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
};

export const CompanyNewsSection = ({ jobId, companyName, news }: CompanyNewsSectionProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "relevance">("relevance");

  // Check if company is followed
  const { data: isFollowing } = useQuery({
    queryKey: ['company-follow', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_follows')
        .select('id, is_active')
        .eq('job_id', jobId)
        .eq('company_name', companyName)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.is_active ?? false;
    },
  });

  // Toggle follow mutation
  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        await supabase
          .from('company_follows')
          .delete()
          .eq('job_id', jobId)
          .eq('company_name', companyName);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        await supabase
          .from('company_follows')
          .insert({
            user_id: user.id,
            job_id: jobId,
            company_name: companyName,
            is_active: true,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-follow', jobId] });
      toast({
        title: isFollowing ? "Unfollowed" : "Following",
        description: isFollowing 
          ? `You will no longer receive news alerts for ${companyName}` 
          : `You will now receive news alerts for ${companyName}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter and sort news
  const filteredNews = useMemo(() => {
    let filtered = news;
    
    if (categoryFilter !== "all") {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    return filtered.sort((a, b) => {
      if (sortBy === "relevance") {
        return (b.relevance_score || 0) - (a.relevance_score || 0);
      } else {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });
  }, [news, categoryFilter, sortBy]);

  // Export news
  const handleExport = () => {
    const exportData = {
      company: companyName,
      exportDate: new Date().toISOString(),
      newsItems: filteredNews.map(item => ({
        title: item.title,
        date: item.date,
        category: item.category || 'general',
        relevance: item.relevance_score || 0,
        summary: item.summary,
        keyPoints: item.key_points || [],
        source: item.source || 'Unknown',
        url: item.url
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${companyName.replace(/\s+/g, '-')}-news-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "News Exported",
      description: "Company news has been exported successfully.",
    });
  };

  const getCategoryIcon = (category?: string) => {
    const Icon = categoryIcons[category || 'general'] || Newspaper;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Recent News & Updates</h3>
          <Badge variant="secondary">{filteredNews.length}</Badge>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={isFollowing ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFollow.mutate()}
          >
            {isFollowing ? (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Following
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4 mr-2" />
                Follow
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="funding">Funding</SelectItem>
              <SelectItem value="product_launch">Product Launches</SelectItem>
              <SelectItem value="hiring">Hiring</SelectItem>
              <SelectItem value="partnership">Partnerships</SelectItem>
              <SelectItem value="award">Awards</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as "date" | "relevance")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Sort by Relevance</SelectItem>
            <SelectItem value="date">Sort by Date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredNews.length > 0 ? (
          filteredNews.map((item, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={categoryColors[item.category || 'general']}>
                        <span className="mr-1">{getCategoryIcon(item.category)}</span>
                        {item.category || 'general'}
                      </Badge>
                      {item.relevance_score && (
                        <Badge variant="outline" className="gap-1">
                          <Star className="h-3 w-3" />
                          {item.relevance_score}% relevant
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                      {item.source && (
                        <span className="text-xs text-muted-foreground">
                          • {item.source}
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </div>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap"
                    >
                      Read More
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </CardHeader>
                <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{item.summary}</p>
                {!item.url && (
                  <p className="text-xs text-muted-foreground italic">
                    Note: This is AI-generated research based on typical company activities. 
                    Verify current news through company website and news sources.
                  </p>
                )}
                {item.key_points && item.key_points.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Key Points:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {item.key_points.map((point, i) => (
                        <li key={i} className="text-sm text-muted-foreground">{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">
                No news articles found for this category
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
