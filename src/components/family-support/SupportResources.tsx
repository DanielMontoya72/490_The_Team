import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BookOpen, ExternalLink, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

const categoryLabels: Record<string, { label: string; emoji: string }> = {
  understanding_job_search: { label: 'Understanding Job Search', emoji: '🔍' },
  emotional_support: { label: 'Emotional Support', emoji: '💙' },
  practical_help: { label: 'Practical Help', emoji: '🛠️' },
  communication_tips: { label: 'Communication Tips', emoji: '💬' },
};

const typeIcons: Record<string, string> = {
  guide: '📖',
  article: '📄',
  video: '🎬',
  tip: '💡',
};

export function SupportResources() {
  const { data: resources, isLoading } = useQuery({
    queryKey: ['family-support-resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_support_resources')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: supporters } = useQuery({
    queryKey: ['family-supporters'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('family_supporters')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data;
    },
  });

  const shareResourcesLink = () => {
    const resourcesUrl = `${window.location.origin}/family-resources`;
    navigator.clipboard.writeText(resourcesUrl);
    toast.success("Resources link copied!", {
      description: "Share this link with your supporters so they can learn how to help.",
    });
  };

  const groupedResources = resources?.reduce((acc, resource) => {
    if (!acc[resource.resource_category]) {
      acc[resource.resource_category] = [];
    }
    acc[resource.resource_category].push(resource);
    return acc;
  }, {} as Record<string, typeof resources>);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Support Resources for Family
              </CardTitle>
              <CardDescription>
                Educational resources to help your supporters understand the job search process
              </CardDescription>
            </div>
            <Button onClick={shareResourcesLink} variant="outline">
              <Share2 className="h-4 w-4 mr-2" />
              Share with Supporters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <h4 className="font-medium mb-2">📣 Share These Resources</h4>
            <p className="text-sm text-muted-foreground">
              These resources help your family and friends understand how to support you effectively. 
              Share the link with them or discuss specific articles together.
            </p>
            {supporters && supporters.length > 0 && (
              <p className="text-sm mt-2">
                You have <strong>{supporters.length}</strong> supporter(s) who could benefit from these resources.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {groupedResources && Object.entries(groupedResources).map(([category, categoryResources]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span>{categoryLabels[category]?.emoji || '📚'}</span>
              {categoryLabels[category]?.label || category}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryResources?.map((resource) => (
                <div
                  key={resource.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{typeIcons[resource.resource_type] || '📄'}</span>
                        <h4 className="font-semibold">{resource.resource_title}</h4>
                        <Badge variant="outline" className="text-xs capitalize">
                          {resource.resource_type}
                        </Badge>
                      </div>
                      {resource.resource_description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {resource.resource_description}
                        </p>
                      )}
                      {resource.resource_content && (
                        <div className="bg-muted/50 rounded-lg p-3 text-sm">
                          {resource.resource_content}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(resource.resource_content || resource.resource_title);
                          toast.success("Content copied!");
                        }}
                        title="Copy content"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {resource.resource_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(resource.resource_url, '_blank')}
                          title="Open link"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Additional Guidance Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">🤝 How to Use These Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p>
              <strong>1. Share Proactively:</strong> Send relevant resources to your supporters before 
              they need to ask questions.
            </p>
            <p>
              <strong>2. Start Conversations:</strong> Use these as starting points to discuss how 
              you'd like to be supported.
            </p>
            <p>
              <strong>3. Reference When Needed:</strong> If a well-meaning supporter says something 
              unhelpful, gently share the "What NOT to Say" resource.
            </p>
            <p>
              <strong>4. Revisit Together:</strong> As your job search progresses, different resources 
              may become more relevant.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
