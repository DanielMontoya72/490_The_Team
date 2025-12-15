import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Lightbulb, TrendingUp } from "lucide-react";

const COMMON_BEHAVIORAL_QUESTIONS = [
  "Tell me about yourself",
  "What is your greatest strength?",
  "What is your greatest weakness?",
  "Tell me about a time you showed leadership",
  "Describe a conflict at work and how you resolved it",
  "Tell me about a time you failed",
  "Why do you want to work here?",
  "Where do you see yourself in 5 years?",
  "Tell me about a time you worked in a team",
  "Describe a challenging project you completed",
];

const COMMON_TECHNICAL_QUESTIONS = [
  "Explain your technical background",
  "Describe your experience with [technology]",
  "How do you stay updated with technology trends?",
  "Walk me through a technical problem you solved",
  "Explain a complex technical concept simply",
];

const COMMON_SITUATIONAL_QUESTIONS = [
  "What would you do if you disagreed with your manager?",
  "How would you handle a tight deadline?",
  "What would you do if a team member wasn't contributing?",
  "How would you prioritize multiple urgent tasks?",
  "What would you do if you made a mistake?",
];

export function ResponseGapAnalysis() {
  const { data: responses } = useQuery({
    queryKey: ['response-library'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('interview_response_library')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
  });

  const { data: practiceSessions } = useQuery({
    queryKey: ['practice-sessions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('response_practice_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const behavioralResponses = responses?.filter(r => r.question_type === 'behavioral') || [];
  const technicalResponses = responses?.filter(r => r.question_type === 'technical') || [];
  const situationalResponses = responses?.filter(r => r.question_type === 'situational') || [];

  const calculateCoverage = (userResponses: any[], commonQuestions: string[]) => {
    const coveredTopics = new Set<string>();
    
    userResponses.forEach(response => {
      const questionLower = response.question.toLowerCase();
      commonQuestions.forEach(common => {
        const keywords = common.toLowerCase().split(' ').filter(w => w.length > 3);
        if (keywords.some(kw => questionLower.includes(kw))) {
          coveredTopics.add(common);
        }
      });
    });
    
    return {
      covered: coveredTopics.size,
      total: commonQuestions.length,
      percentage: Math.round((coveredTopics.size / commonQuestions.length) * 100),
      missing: commonQuestions.filter(q => !coveredTopics.has(q)),
    };
  };

  const behavioralCoverage = calculateCoverage(behavioralResponses, COMMON_BEHAVIORAL_QUESTIONS);
  const technicalCoverage = calculateCoverage(technicalResponses, COMMON_TECHNICAL_QUESTIONS);
  const situationalCoverage = calculateCoverage(situationalResponses, COMMON_SITUATIONAL_QUESTIONS);

  const totalResponses = responses?.length || 0;
  const responsesWithContent = responses?.filter(r => r.current_response)?.length || 0;
  const practicedResponses = practiceSessions?.length || 0;

  const getStatusColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{totalResponses}</p>
            <p className="text-sm text-muted-foreground">Total Questions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{responsesWithContent}</p>
            <p className="text-sm text-muted-foreground">With Responses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{practicedResponses}</p>
            <p className="text-sm text-muted-foreground">Practice Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">
              {responses?.filter(r => r.success_count > 0).length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Successful Outcomes</p>
          </CardContent>
        </Card>
      </div>

      {/* Coverage by Type */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Behavioral', coverage: behavioralCoverage, count: behavioralResponses.length },
          { title: 'Technical', coverage: technicalCoverage, count: technicalResponses.length },
          { title: 'Situational', coverage: situationalCoverage, count: situationalResponses.length },
        ].map(({ title, coverage, count }) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{title}</CardTitle>
                <Badge variant="outline">{count} responses</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Coverage</span>
                  <span className={getStatusColor(coverage.percentage)}>
                    {coverage.percentage}%
                  </span>
                </div>
                <Progress value={coverage.percentage} className="h-2" />
              </div>
              
              {coverage.missing.length > 0 && (
                <div>
                  <p className="text-sm font-medium flex items-center gap-1 mb-2">
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    Missing Topics
                  </p>
                  <div className="space-y-1">
                    {coverage.missing.slice(0, 3).map((topic, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground">
                        • {topic}
                      </p>
                    ))}
                    {coverage.missing.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{coverage.missing.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Recommendations
          </CardTitle>
          <CardDescription>
            Based on your response library analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {behavioralCoverage.percentage < 50 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium">Improve Behavioral Coverage</p>
                  <p className="text-sm text-muted-foreground">
                    Add responses for common behavioral questions like leadership and conflict resolution.
                  </p>
                </div>
              </div>
            )}

            {responsesWithContent < totalResponses && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Complete Your Responses</p>
                  <p className="text-sm text-muted-foreground">
                    {totalResponses - responsesWithContent} questions don't have responses yet. Add your best answers.
                  </p>
                </div>
              </div>
            )}

            {practicedResponses === 0 && totalResponses > 0 && (
              <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium">Start Practicing</p>
                  <p className="text-sm text-muted-foreground">
                    Use Practice Mode to rehearse your responses and get AI feedback.
                  </p>
                </div>
              </div>
            )}

            {behavioralCoverage.percentage >= 80 && technicalCoverage.percentage >= 80 && situationalCoverage.percentage >= 80 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Great Coverage!</p>
                  <p className="text-sm text-muted-foreground">
                    Your response library covers most common interview questions. Keep practicing!
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
