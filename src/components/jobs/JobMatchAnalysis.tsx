import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, AlertCircle, TrendingUp, Award, BookOpen, Briefcase, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { JobMatchScore } from "./JobMatchScore";

interface JobMatchAnalysisProps {
  jobId: string;
}

export function JobMatchAnalysis({ jobId }: JobMatchAnalysisProps) {
  const { data: analysis, isLoading } = useQuery({
    queryKey: ['job-match-analysis', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_match_analyses')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Job Match Analysis
          </CardTitle>
          <CardDescription>
            Calculate your match score to see how well you fit this role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JobMatchScore jobId={jobId} compact={false} />
        </CardContent>
      </Card>
    );
  }

  const matchDetails = analysis.match_details as any;
  const strengths = analysis.strengths as any[];
  const gaps = analysis.gaps as any[];
  const suggestions = analysis.improvement_suggestions as any[];

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'low': return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Job Match Analysis
            </CardTitle>
            <CardDescription>
              Detailed breakdown of how well you match this opportunity
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <JobMatchScore jobId={jobId} />

        {/* Summary */}
        {matchDetails?.summary && (
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm">{matchDetails.summary}</p>
            {matchDetails.recommendation && (
              <Badge variant="outline" className="mt-2">
                {matchDetails.recommendation.replace('_', ' ')}
              </Badge>
            )}
          </div>
        )}

        <Tabs defaultValue="breakdown" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="strengths">Strengths</TabsTrigger>
            <TabsTrigger value="gaps">Gaps</TabsTrigger>
            <TabsTrigger value="suggestions">Improve</TabsTrigger>
          </TabsList>

          {/* Score Breakdown */}
          <TabsContent value="breakdown" className="space-y-4">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Skills Match</span>
                  </div>
                  <span className="text-sm font-semibold">{analysis.skills_score || 0}%</span>
                </div>
                <Progress value={analysis.skills_score || 0} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Experience Match</span>
                  </div>
                  <span className="text-sm font-semibold">{analysis.experience_score || 0}%</span>
                </div>
                <Progress value={analysis.experience_score || 0} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Education Match</span>
                  </div>
                  <span className="text-sm font-semibold">{analysis.education_score || 0}%</span>
                </div>
                <Progress value={analysis.education_score || 0} className="h-2" />
              </div>
            </div>

            {matchDetails?.weights_used && (
              <div className="text-xs text-muted-foreground p-4 rounded-lg bg-muted space-y-2">
                <p className="font-medium">Weights Used:</p>
                <p>Skills: {matchDetails.weights_used.skills_weight}%  •  Experience: {matchDetails.weights_used.experience_weight}%  •  Education: {matchDetails.weights_used.education_weight}%</p>
              </div>
            )}
          </TabsContent>

          {/* Strengths */}
          <TabsContent value="strengths" className="space-y-3">
            {strengths && strengths.length > 0 ? (
              strengths.map((strength, idx) => (
                <div key={idx} className="flex gap-3 p-3 rounded-lg border bg-card">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <Badge variant="secondary" className="mb-2">
                      {strength.category}
                    </Badge>
                    <p className="text-sm">{strength.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No strengths identified yet</p>
              </div>
            )}
          </TabsContent>

          {/* Gaps */}
          <TabsContent value="gaps" className="space-y-3">
            {gaps && gaps.length > 0 ? (
              gaps.map((gap, idx) => (
                <div key={idx} className="flex gap-3 p-3 rounded-lg border bg-card">
                  {getSeverityIcon(gap.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{gap.category}</Badge>
                      <Badge variant="outline">{gap.severity} severity</Badge>
                    </div>
                    <p className="text-sm">{gap.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30 text-green-500" />
                <p className="text-sm">No gaps identified - excellent match!</p>
              </div>
            )}
          </TabsContent>

          {/* Suggestions */}
          <TabsContent value="suggestions" className="space-y-3">
            {suggestions && suggestions.length > 0 ? (
              suggestions.map((suggestion, idx) => (
                <div key={idx} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityColor(suggestion.priority) as any}>
                          {suggestion.priority} priority
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{suggestion.suggestion}</p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Impact:</strong> {suggestion.impact}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No improvement suggestions available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
