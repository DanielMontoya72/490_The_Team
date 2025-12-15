import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, BookOpen, Users, Briefcase, ArrowRight, Loader2, TrendingUp, MessageSquare, FileText, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PersonalizedRecommendationsProps {
  data: any;
  metrics?: {
    totalApplications: number;
    responseRate: number;
    interviewRate: number;
    offerRate: number;
    avgResponseDays: number;
    avgInterviewDays: number;
  };
}

export function PersonalizedRecommendations({ data, metrics }: PersonalizedRecommendationsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const predictions = data?.predictions || [];
  const mockSessions = data?.mockSessions || [];
  const questionResponses = data?.questionResponses || [];
  
  // Fetch AI-generated recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!metrics) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const { data: result, error: funcError } = await supabase.functions.invoke(
          'generate-job-search-recommendations',
          {
            body: {
              metrics: {
                totalApplications: metrics.totalApplications,
                responseRate: metrics.responseRate,
                interviewRate: metrics.interviewRate,
                offerRate: metrics.offerRate,
                avgResponseDays: metrics.avgResponseDays,
                avgInterviewDays: metrics.avgInterviewDays,
                predictionCount: predictions.length,
                mockSessionCount: mockSessions.length,
                questionResponseCount: questionResponses.length,
              }
            }
          }
        );
        
        if (funcError) throw funcError;
        
        if (result?.recommendations) {
          setAiRecommendations(result.recommendations);
        }
      } catch (err: any) {
        console.error('Error fetching AI recommendations:', err);
        setError(err.message || 'Failed to generate recommendations');
        
        if (err.message?.includes('Rate limit')) {
          toast({
            title: "Rate Limit Reached",
            description: "Too many requests. Please try again in a moment.",
            variant: "destructive",
          });
        } else if (err.message?.includes('credits')) {
          toast({
            title: "AI Credits Exhausted",
            description: "Please add credits to continue using AI features.",
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [metrics, predictions.length, mockSessions.length, questionResponses.length, toast]);
  
  const recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    title: string;
    description: string;
    action: string;
    actionPath?: string;
    icon: any;
  }> = [];
  
  // Analyze weak areas from predictions
  if (predictions.length > 0) {
    const avgScores = {
      preparation: predictions.reduce((sum: number, p: any) => sum + (p.preparation_score || 0), 0) / predictions.length,
      companyResearch: predictions.reduce((sum: number, p: any) => sum + (p.company_research_score || 0), 0) / predictions.length,
      practiceHours: predictions.reduce((sum: number, p: any) => sum + (p.practice_hours_score || 0), 0) / predictions.length,
    };
    
    if (avgScores.preparation < 60) {
      recommendations.push({
        priority: 'high',
        category: 'Preparation',
        title: 'Improve Interview Preparation',
        description: 'Your preparation scores are below optimal. Spend more time reviewing company information and role requirements before interviews.',
        action: 'Start Mock Interview',
        actionPath: '/technical-prep',
        icon: BookOpen
      });
    }
    
    if (avgScores.companyResearch < 65) {
      recommendations.push({
        priority: 'high',
        category: 'Research',
        title: 'Enhance Company Research',
        description: 'Deeper company research correlates with higher success rates. Use the company research tool for each interview.',
        action: 'Research Companies',
        actionPath: '/jobs',
        icon: Briefcase
      });
    }
    
    if (avgScores.practiceHours < 50) {
      recommendations.push({
        priority: 'medium',
        category: 'Practice',
        title: 'Increase Practice Sessions',
        description: 'More practice leads to better performance. Aim for at least 5 mock interviews before your next real interview.',
        action: 'Practice Now',
        actionPath: '/technical-prep',
        icon: Target
      });
    }
  }
  
  // Check practice frequency
  if (mockSessions.length < 3) {
    recommendations.push({
      priority: 'high',
      category: 'Practice',
      title: 'Build Interview Confidence',
      description: 'Candidates with 5+ practice sessions show 40% higher success rates. Regular practice builds confidence and reduces anxiety.',
      action: 'Start Practicing',
      actionPath: '/technical-prep',
      icon: Target
    });
  }
  
  // Question response analysis
  if (questionResponses.length < 10) {
    recommendations.push({
      priority: 'medium',
      category: 'Behavioral',
      title: 'Expand Question Bank',
      description: 'Having prepared responses for common questions improves interview performance. Practice behavioral questions using the STAR method.',
      action: 'Practice Questions',
      actionPath: '/technical-prep',
      icon: BookOpen
    });
  }
  
  // Network recommendations
  const interviews = data?.interviews || [];
  const hasNetworkingInterviews = interviews.some((i: any) => 
    i.jobs?.company_name && interviews.filter((j: any) => j.jobs?.company_name === i.jobs?.company_name).length > 1
  );
  
  if (!hasNetworkingInterviews && interviews.length > 5) {
    recommendations.push({
      priority: 'low',
      category: 'Networking',
      title: 'Leverage Professional Network',
      description: 'Referrals increase interview success rates by 50%. Build connections at target companies.',
      action: 'View Contacts',
      actionPath: '/contacts',
      icon: Users
    });
  }
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'low',
      category: 'General',
      title: 'Maintain Consistent Performance',
      description: 'You\'re doing well! Continue your current preparation routine and keep tracking your progress.',
      action: 'View Dashboard',
      actionPath: '/jobs',
      icon: Target
    });
  }
  
  // Map category to icon
  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, any> = {
      'Applications': Briefcase,
      'Networking': Users,
      'Interview Prep': Target,
      'Materials': FileText,
      'Follow-up': Clock,
      'Preparation': BookOpen,
      'Research': Briefcase,
      'Practice': Target,
      'Behavioral': MessageSquare,
      'General': TrendingUp,
    };
    return iconMap[category] || Target;
  };
  
  // Use AI recommendations if available, otherwise fall back to rule-based
  const displayRecommendations = aiRecommendations.length > 0 
    ? aiRecommendations.map(rec => ({
        ...rec,
        icon: getCategoryIcon(rec.category),
        actionPath: rec.category === 'Interview Prep' || rec.category === 'Practice' 
          ? '/technical-prep' 
          : rec.category === 'Networking' 
          ? '/contacts' 
          : '/jobs'
      }))
    : recommendations;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Personalized Recommendations
          {aiRecommendations.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              AI-Powered
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {aiRecommendations.length > 0 
            ? "Custom insights generated based on your performance metrics"
            : "AI-powered suggestions to improve your interview success rate"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Generating personalized recommendations...
            </span>
          </div>
        )}
        
        {error && !isLoading && (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Using standard recommendations. AI insights temporarily unavailable.
          </div>
        )}
        
        {!isLoading && displayRecommendations.map((rec, index) => {
          const Icon = rec.icon;
          const priorityColor = rec.priority === 'high' 
            ? 'bg-red-500/10 text-red-500 border-red-500/20'
            : rec.priority === 'medium'
            ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
            : 'bg-blue-500/10 text-blue-500 border-blue-500/20';
          
          return (
            <div key={index} className="p-4 rounded-lg border bg-card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${priorityColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{rec.title}</span>
                      <Badge variant="outline" className={priorityColor}>
                        {rec.priority} priority
                      </Badge>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {rec.category}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      {rec.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
