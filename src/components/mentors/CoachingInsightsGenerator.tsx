import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, TrendingUp, AlertTriangle, CheckCircle, Target, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CoachingInsight {
  id: string;
  insight_type: 'strength' | 'opportunity' | 'recommendation' | 'concern';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action_items: string[];
}

export function CoachingInsightsGenerator({ menteeId, relationshipId }: { menteeId: string; relationshipId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch mentee's comprehensive data for analysis
  const { data: menteeData } = useQuery({
    queryKey: ['mentee-coaching-data', menteeId],
    queryFn: async () => {
      const [jobs, interviews, goals, materials, skills, timeTracking] = await Promise.all([
        supabase.from('jobs').select('*').eq('user_id', menteeId).eq('is_archived', false),
        supabase.from('interviews').select('*').eq('user_id', menteeId),
        supabase.from('career_goals').select('*').eq('user_id', menteeId),
        supabase.from('application_materials').select('*').eq('user_id', menteeId),
        supabase.from('skills').select('*').eq('user_id', menteeId),
        supabase.from('time_tracking_entries').select('*').eq('user_id', menteeId).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      return {
        jobs: jobs.data || [],
        interviews: interviews.data || [],
        goals: goals.data || [],
        materials: materials.data || [],
        skills: skills.data || [],
        timeTracking: timeTracking.data || []
      };
    }
  });

  // Generate coaching insights
  const generateInsights = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);

      if (!menteeData) {
        throw new Error("Mentee data not available");
      }

      const insights: CoachingInsight[] = [];

      // Analyze job application patterns
      const jobsByStatus = menteeData.jobs.reduce((acc: any, job: any) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {});

      const totalJobs = menteeData.jobs.length;
      const appliedJobs = menteeData.jobs.filter((j: any) => ['Applied', 'Interview', 'Offer'].includes(j.status)).length;
      const interviewRate = totalJobs > 0 ? (menteeData.interviews.length / appliedJobs) * 100 : 0;

      // Insight 1: Application Volume
      if (totalJobs < 5) {
        insights.push({
          id: 'low-application-volume',
          insight_type: 'concern',
          title: 'Low Application Volume',
          description: `Your mentee has only ${totalJobs} active job${totalJobs !== 1 ? 's' : ''} tracked. Research shows job seekers who apply to 10-15 well-targeted positions per week have better outcomes.`,
          priority: 'high',
          action_items: [
            'Schedule a session to identify barriers to application volume',
            'Help create a systematic job search schedule',
            'Review target companies and expand job search criteria'
          ]
        });
      } else if (totalJobs > 20) {
        insights.push({
          id: 'high-application-volume',
          insight_type: 'strength',
          title: 'Strong Application Activity',
          description: `Excellent! Your mentee is actively tracking ${totalJobs} opportunities, showing strong commitment to their job search.`,
          priority: 'low',
          action_items: [
            'Ensure quality is maintained alongside quantity',
            'Review application materials for consistency',
            'Help prioritize top opportunities'
          ]
        });
      }

      // Insight 2: Interview Conversion Rate
      if (appliedJobs > 5 && interviewRate < 10) {
        insights.push({
          id: 'low-interview-rate',
          insight_type: 'opportunity',
          title: 'Low Interview Conversion Rate',
          description: `Interview rate is ${interviewRate.toFixed(1)}% (industry average: 10-20%). Resume and application materials may need optimization.`,
          priority: 'high',
          action_items: [
            'Review and provide feedback on resume and cover letters',
            'Analyze job descriptions to improve keyword matching',
            'Consider ATS optimization strategies',
            'Practice tailoring applications to specific roles'
          ]
        });
      } else if (interviewRate > 20) {
        insights.push({
          id: 'strong-interview-rate',
          insight_type: 'strength',
          title: 'Excellent Interview Conversion',
          description: `Outstanding ${interviewRate.toFixed(1)}% interview rate! Application materials are resonating with employers.`,
          priority: 'low',
          action_items: [
            'Focus coaching on interview preparation',
            'Develop salary negotiation strategies',
            'Share success patterns with other mentees'
          ]
        });
      }

      // Insight 3: Goal Progress Analysis
      const activeGoals = menteeData.goals.filter((g: any) => g.status === 'in_progress');
      const stuckGoals = activeGoals.filter((g: any) => {
        const daysSinceUpdate = (Date.now() - new Date(g.updated_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate > 14 && (g.progress_percentage || 0) < 50;
      });

      if (stuckGoals.length > 0) {
        insights.push({
          id: 'stagnant-goals',
          insight_type: 'concern',
          title: 'Goals Need Attention',
          description: `${stuckGoals.length} goal${stuckGoals.length !== 1 ? 's' : ''} haven't been updated in over 2 weeks. Regular progress tracking is essential for accountability.`,
          priority: 'medium',
          action_items: [
            'Review goal breakdown and create smaller milestones',
            'Identify and address blockers',
            'Set up weekly check-in rhythm',
            'Consider adjusting timeline or scope'
          ]
        });
      }

      // Insight 4: Application Materials Updates
      const recentMaterialUpdates = menteeData.materials.filter((m: any) => {
        const daysSinceUpdate = (Date.now() - new Date(m.updated_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate < 30;
      });

      if (recentMaterialUpdates.length === 0 && totalJobs > 5) {
        insights.push({
          id: 'stale-materials',
          insight_type: 'opportunity',
          title: 'Application Materials Need Refresh',
          description: 'No resume or cover letter updates in the past 30 days. Regular iterations based on feedback improve outcomes.',
          priority: 'medium',
          action_items: [
            'Schedule materials review session',
            'Gather feedback from recent applications',
            'Update with latest skills and accomplishments',
            'A/B test different approaches'
          ]
        });
      }

      // Insight 5: Skill Development
      const technicalSkills = menteeData.skills.filter((s: any) => s.category === 'Technical');
      if (technicalSkills.length < 3) {
        insights.push({
          id: 'limited-technical-skills',
          insight_type: 'recommendation',
          title: 'Expand Technical Skill Portfolio',
          description: `Only ${technicalSkills.length} technical skill${technicalSkills.length !== 1 ? 's' : ''} listed. Most roles require 5-10 technical competencies.`,
          priority: 'medium',
          action_items: [
            'Identify in-demand skills in target industry',
            'Create learning plan with certifications',
            'Update resume as new skills are acquired',
            'Find projects to demonstrate new competencies'
          ]
        });
      }

      // Insight 6: Time Investment Analysis
      const totalTimeTracked = menteeData.timeTracking.reduce((sum: number, entry: any) => sum + (entry.duration_minutes || 0), 0);
      const avgDailyTime = totalTimeTracked / 30;

      if (avgDailyTime < 30) {
        insights.push({
          id: 'low-time-investment',
          insight_type: 'concern',
          title: 'Insufficient Time Investment',
          description: `Average of ${Math.round(avgDailyTime)} minutes per day tracked. Research suggests 1-2 hours daily for effective job searching.`,
          priority: 'high',
          action_items: [
            'Help create daily job search routine',
            'Identify and remove time barriers',
            'Break activities into manageable chunks',
            'Set specific time blocks for different activities'
          ]
        });
      }

      // Insight 7: Interview Preparation
      const upcomingInterviews = menteeData.interviews.filter((i: any) => 
        new Date(i.interview_date) > new Date() && i.status === 'scheduled'
      );

      if (upcomingInterviews.length > 0) {
        insights.push({
          id: 'upcoming-interviews',
          insight_type: 'recommendation',
          title: `${upcomingInterviews.length} Upcoming Interview${upcomingInterviews.length !== 1 ? 's' : ''}`,
          description: 'Your mentee has interviews scheduled. This is a critical opportunity to provide targeted coaching.',
          priority: 'high',
          action_items: [
            'Schedule mock interview sessions',
            'Review company research and talking points',
            'Practice STAR method for behavioral questions',
            'Prepare thoughtful questions for interviewer',
            'Review salary expectations and negotiation strategy'
          ]
        });
      }

      // Insight 8: Application Status Distribution
      if (jobsByStatus['Researching'] > totalJobs * 0.5) {
        insights.push({
          id: 'research-to-action',
          insight_type: 'opportunity',
          title: 'Convert Research to Applications',
          description: `${jobsByStatus['Researching']} jobs in research phase. Help your mentee move from research to action.`,
          priority: 'medium',
          action_items: [
            'Review researched opportunities together',
            'Identify top 5 priorities to apply to this week',
            'Address any application anxiety or perfectionism',
            'Set deadline for completing applications'
          ]
        });
      }

      return insights;
    },
    onSuccess: (insights) => {
      setIsGenerating(false);
      queryClient.setQueryData(['coaching-insights', menteeId], insights);
      toast({
        title: "Insights generated",
        description: `Generated ${insights.length} coaching insights`
      });
    },
    onError: (error) => {
      setIsGenerating(false);
      toast({
        title: "Failed to generate insights",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const { data: insights } = useQuery<CoachingInsight[]>({
    queryKey: ['coaching-insights', menteeId],
    queryFn: () => [],
    enabled: false
  });

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'strength':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'opportunity':
        return <Target className="h-5 w-5 text-blue-500" />;
      case 'recommendation':
        return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      case 'concern':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <TrendingUp className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI-Powered Coaching Insights
          </CardTitle>
          <CardDescription>
            Generate personalized coaching recommendations based on your mentee's activity and progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => generateInsights.mutate()} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing mentee data...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Coaching Insights
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {insights && insights.length > 0 && (
        <div className="space-y-4">
          {insights.map((insight) => (
            <Card key={insight.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.insight_type)}
                    <div>
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {insight.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={getPriorityColor(insight.priority)}>
                    {insight.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Recommended Actions:</p>
                  <ul className="space-y-1">
                    {insight.action_items.map((action, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
