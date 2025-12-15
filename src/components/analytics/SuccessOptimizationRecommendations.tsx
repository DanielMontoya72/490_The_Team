import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Sparkles, 
  Lightbulb, 
  Target, 
  TrendingUp, 
  Clock, 
  FileText, 
  Building2,
  Loader2,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

interface Recommendation {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  category: string;
  action: string;
}

export function SuccessOptimizationRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["optimization-jobs"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("user_id", session.user.id);
      
      if (error) throw error;
      return data || [];
    },
  });

  const successfulStatuses = ["Offer Received", "Accepted"];
  const interviewStatuses = ["Interview Scheduled", "Interviewing", "Offer Received", "Accepted"];

  // Generate data-driven recommendations locally
  const generateRecommendations = () => {
    setIsGenerating(true);
    
    const newRecommendations: Recommendation[] = [];
    const totalApps = jobs.filter(j => j.status !== "Interested").length;
    const interviewCount = jobs.filter(j => interviewStatuses.includes(j.status)).length;
    const successCount = jobs.filter(j => successfulStatuses.includes(j.status)).length;
    
    // Calculate rates
    const interviewRate = totalApps > 0 ? (interviewCount / totalApps) * 100 : 0;
    const successRate = totalApps > 0 ? (successCount / totalApps) * 100 : 0;

    // Recommendation 1: Low interview rate
    if (interviewRate < 20 && totalApps >= 5) {
      newRecommendations.push({
        title: "Boost Your Interview Rate",
        description: `Your interview rate of ${interviewRate.toFixed(1)}% is below average. Focus on tailoring your resume to each job's keywords and requirements.`,
        impact: "high",
        category: "Resume",
        action: "Review and customize resume for top 5 target jobs this week",
      });
    }

    // Recommendation 2: Check application source effectiveness
    const linkedinJobs = jobs.filter(j => j.job_url?.includes("linkedin"));
    const directJobs = jobs.filter(j => !j.job_url || !j.job_url.includes("linkedin"));
    const linkedinInterviews = linkedinJobs.filter(j => interviewStatuses.includes(j.status)).length;
    const directInterviews = directJobs.filter(j => interviewStatuses.includes(j.status)).length;
    
    if (linkedinJobs.length >= 3 && directJobs.length >= 3) {
      const linkedinRate = (linkedinInterviews / linkedinJobs.length) * 100;
      const directRate = (directInterviews / directJobs.length) * 100;
      
      if (linkedinRate > directRate + 10) {
        newRecommendations.push({
          title: "Focus on LinkedIn Applications",
          description: `LinkedIn applications show a ${(linkedinRate - directRate).toFixed(0)}% higher interview rate. Prioritize LinkedIn job listings.`,
          impact: "medium",
          category: "Strategy",
          action: "Set up LinkedIn job alerts for target roles",
        });
      } else if (directRate > linkedinRate + 10) {
        newRecommendations.push({
          title: "Direct Applications Work Better For You",
          description: `Direct applications outperform LinkedIn by ${(directRate - linkedinRate).toFixed(0)}%. Focus on company career pages.`,
          impact: "medium",
          category: "Strategy",
          action: "Build a list of target companies and apply directly",
        });
      }
    }

    // Recommendation 3: Industry focus
    const industryStats = jobs.reduce((acc: any, job) => {
      const industry = job.industry || "Unknown";
      if (!acc[industry]) acc[industry] = { total: 0, interviews: 0 };
      if (job.status !== "Interested") {
        acc[industry].total++;
        if (interviewStatuses.includes(job.status)) acc[industry].interviews++;
      }
      return acc;
    }, {});

    const topIndustry = Object.entries(industryStats)
      .filter(([_, stats]: any) => stats.total >= 3)
      .sort((a: any, b: any) => (b[1].interviews / b[1].total) - (a[1].interviews / a[1].total))[0];

    if (topIndustry) {
      const [industry, stats]: any = topIndustry;
      const rate = (stats.interviews / stats.total) * 100;
      if (rate > interviewRate + 5) {
        newRecommendations.push({
          title: `Double Down on ${industry}`,
          description: `You have a ${rate.toFixed(0)}% interview rate in ${industry}, which is ${(rate - interviewRate).toFixed(0)}% above your average.`,
          impact: "high",
          category: "Industry",
          action: `Apply to 5 more ${industry} positions this week`,
        });
      }
    }

    // Recommendation 4: Timing analysis
    const morningApps = jobs.filter(j => {
      const hour = new Date(j.created_at).getHours();
      return hour >= 8 && hour < 12;
    });
    const afternoonApps = jobs.filter(j => {
      const hour = new Date(j.created_at).getHours();
      return hour >= 12 && hour < 18;
    });
    
    if (morningApps.length >= 3 && afternoonApps.length >= 3) {
      const morningInterviews = morningApps.filter(j => interviewStatuses.includes(j.status)).length;
      const afternoonInterviews = afternoonApps.filter(j => interviewStatuses.includes(j.status)).length;
      const morningRate = (morningInterviews / morningApps.length) * 100;
      const afternoonRate = (afternoonInterviews / afternoonApps.length) * 100;
      
      if (morningRate > afternoonRate + 10) {
        newRecommendations.push({
          title: "Apply in the Morning",
          description: `Your morning applications have a ${(morningRate - afternoonRate).toFixed(0)}% higher success rate. Schedule application time between 8-11 AM.`,
          impact: "medium",
          category: "Timing",
          action: "Block 9-11 AM daily for job applications",
        });
      }
    }

    // Recommendation 5: Notes/research correlation
    const detailedApps = jobs.filter(j => j.notes && j.notes.length > 100);
    const quickApps = jobs.filter(j => !j.notes || j.notes.length < 50);
    
    if (detailedApps.length >= 3 && quickApps.length >= 3) {
      const detailedInterviews = detailedApps.filter(j => interviewStatuses.includes(j.status)).length;
      const quickInterviews = quickApps.filter(j => interviewStatuses.includes(j.status)).length;
      const detailedRate = (detailedInterviews / detailedApps.length) * 100;
      const quickRate = (quickInterviews / quickApps.length) * 100;
      
      if (detailedRate > quickRate + 15) {
        newRecommendations.push({
          title: "Quality Over Quantity",
          description: `Applications with detailed research notes have a ${(detailedRate - quickRate).toFixed(0)}% higher success rate. Take time to research each company.`,
          impact: "high",
          category: "Preparation",
          action: "Add detailed notes for your next 5 applications",
        });
      }
    }

    // Recommendation 6: Generic recommendations if no specific ones
    if (newRecommendations.length === 0) {
      if (totalApps < 10) {
        newRecommendations.push({
          title: "Increase Application Volume",
          description: "You need more applications to identify patterns. Aim for at least 10-15 applications to generate meaningful insights.",
          impact: "high",
          category: "Volume",
          action: "Apply to 5 jobs this week to build data for analysis",
        });
      } else {
        newRecommendations.push({
          title: "Experiment with Different Strategies",
          description: "Try varying your application approach - different resume versions, application sources, and timing to identify what works best.",
          impact: "medium",
          category: "Strategy",
          action: "Create two resume versions and track which performs better",
        });
      }
    }

    setRecommendations(newRecommendations);
    setIsGenerating(false);
    toast.success("Recommendations generated!");
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Resume": return <FileText className="h-4 w-4" />;
      case "Strategy": return <Target className="h-4 w-4" />;
      case "Industry": return <Building2 className="h-4 w-4" />;
      case "Timing": return <Clock className="h-4 w-4" />;
      case "Preparation": return <Lightbulb className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Actionable Recommendations
              </CardTitle>
              <CardDescription>
                Data-driven suggestions to improve your success rate
              </CardDescription>
            </div>
            <Button onClick={generateRecommendations} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate Recommendations
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div 
                  key={index} 
                  className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-muted rounded-lg">
                        {getCategoryIcon(rec.category)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{rec.title}</h4>
                          <Badge className={getImpactColor(rec.impact)}>
                            {rec.impact} impact
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="font-medium">Action:</span>
                          <span>{rec.action}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                Click "Generate Recommendations" to get personalized suggestions based on your application data.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
