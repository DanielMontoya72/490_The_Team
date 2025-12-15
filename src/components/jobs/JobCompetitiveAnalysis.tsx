import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Lightbulb, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Loader2,
  Shield,
  ArrowUp,
  ArrowDown,
  Minus,
  Star,
  Zap
} from "lucide-react";
import { toast } from "sonner";

interface JobCompetitiveAnalysisProps {
  jobId: string;
}

export function JobCompetitiveAnalysis({ jobId }: JobCompetitiveAnalysisProps) {
  const queryClient = useQueryClient();

  const { data: analysis, isLoading } = useQuery({
    queryKey: ['job-competitive-analysis', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_competitive_analysis')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('analyze-job-competitiveness', {
        body: { jobId }
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-competitive-analysis', jobId] });
      toast.success('Competitive analysis complete');
    },
    onError: (error) => {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze competitiveness');
    }
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 border-green-300';
    if (score >= 60) return 'bg-yellow-100 border-yellow-300';
    if (score >= 40) return 'bg-orange-100 border-orange-300';
    return 'bg-red-100 border-red-300';
  };

  const getLikelihoodBadge = (likelihood: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      high: { color: 'bg-green-100 text-green-800', label: 'High' },
      medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
      low: { color: 'bg-red-100 text-red-800', label: 'Low' }
    };
    return variants[likelihood] || variants.medium;
  };

  const getStrengthIcon = (strength: string) => {
    if (strength === 'strong') return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (strength === 'moderate') return <Minus className="h-4 w-4 text-yellow-600" />;
    return <ArrowDown className="h-4 w-4 text-orange-600" />;
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      critical: 'bg-red-100 text-red-800',
      significant: 'bg-orange-100 text-orange-800',
      minor: 'bg-yellow-100 text-yellow-800'
    };
    return variants[severity] || variants.minor;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No Competitive Analysis Yet</h3>
          <p className="text-muted-foreground mb-4">
            Analyze how competitive you are for this role and get strategies to stand out.
          </p>
          <Button 
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Target className="mr-2 h-4 w-4" />
                Analyze Competitiveness
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const likelihoodInfo = getLikelihoodBadge(analysis.interview_likelihood || 'medium');
  const advantages = Array.isArray(analysis.competitive_advantages) ? analysis.competitive_advantages : [];
  const disadvantages = Array.isArray(analysis.competitive_disadvantages) ? analysis.competitive_disadvantages : [];
  const mitigations = Array.isArray(analysis.mitigation_strategies) ? analysis.mitigation_strategies : [];
  const strategies = Array.isArray(analysis.differentiating_strategies) ? analysis.differentiating_strategies : [];
  const typicalProfile = analysis.typical_hired_profile as Record<string, any> || {};
  const comparison = analysis.profile_comparison as Record<string, any> || {};

  return (
    <div className="space-y-4">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Target className="h-5 w-5" />
          Competitive Analysis
        </h3>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => analyzeMutation.mutate()}
          disabled={analyzeMutation.isPending}
        >
          {analyzeMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`border-2 ${getScoreBg(analysis.competitive_score || 0)}`}>
          <CardContent className="pt-4 text-center">
            <div className={`text-3xl font-bold ${getScoreColor(analysis.competitive_score || 0)}`}>
              {analysis.competitive_score || 0}
            </div>
            <div className="text-sm text-muted-foreground">Competitive Score</div>
            <Progress value={analysis.competitive_score || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Badge className={likelihoodInfo.color}>
                {likelihoodInfo.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ({analysis.interview_confidence || 0}% confidence)
              </span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">Interview Likelihood</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-xl font-semibold">~{analysis.estimated_applicants || '?'}</span>
            </div>
            <div className="text-sm text-muted-foreground">Est. Applicants</div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      {analysis.analysis_summary && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm">{analysis.analysis_summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Priority Indicator */}
      <Card className={`border-2 ${getScoreBg(analysis.priority_score || 0)}`}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              <span className="font-semibold">Application Priority</span>
            </div>
            <Badge className={getScoreColor(analysis.priority_score || 0)}>
              {analysis.priority_score || 0}/100
            </Badge>
          </div>
          {analysis.priority_reasoning && (
            <p className="text-sm text-muted-foreground mt-2">{analysis.priority_reasoning}</p>
          )}
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="advantages" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="advantages">Advantages</TabsTrigger>
          <TabsTrigger value="gaps">Gaps</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="advantages" className="space-y-3">
          {advantages.length > 0 ? (
            advantages.map((adv: any, idx: number) => (
              <Card key={idx}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    {getStrengthIcon(adv.strength)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{adv.advantage}</span>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {adv.strength}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{adv.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No advantages identified</p>
          )}
        </TabsContent>

        <TabsContent value="gaps" className="space-y-3">
          {disadvantages.length > 0 ? (
            disadvantages.map((dis: any, idx: number) => (
              <Card key={idx}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{dis.disadvantage}</span>
                        <Badge className={getSeverityBadge(dis.severity)}>
                          {dis.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{dis.description}</p>
                      
                      {/* Find mitigation for this disadvantage */}
                      {mitigations.filter((m: any) => 
                        m.for_disadvantage?.toLowerCase().includes(dis.disadvantage?.toLowerCase().slice(0, 10))
                      ).map((m: any, mIdx: number) => (
                        <div key={mIdx} className="mt-2 p-2 bg-muted rounded-md">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium">Mitigation Strategy</span>
                          </div>
                          <p className="text-sm mt-1">{m.strategy}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">Effort: {m.effort_level}</Badge>
                            <Badge variant="outline" className="text-xs">{m.timeline}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No significant gaps identified</p>
          )}
        </TabsContent>

        <TabsContent value="strategies" className="space-y-3">
          {strategies.length > 0 ? (
            strategies.map((strat: any, idx: number) => (
              <Card key={idx}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-purple-500 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{strat.strategy}</span>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {strat.impact} impact
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{strat.implementation}</p>
                      {strat.unique_angle && (
                        <p className="text-sm text-purple-600 mt-1">
                          <Lightbulb className="h-3 w-3 inline mr-1" />
                          {strat.unique_angle}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No strategies available</p>
          )}
        </TabsContent>

        <TabsContent value="profile" className="space-y-3">
          {/* Typical Hired Profile */}
          {Object.keys(typicalProfile).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Typical Hired Candidate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {typicalProfile.years_experience && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Experience</span>
                    <span className="text-sm">{typicalProfile.years_experience}</span>
                  </div>
                )}
                {typicalProfile.education_level && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Education</span>
                    <span className="text-sm">{typicalProfile.education_level}</span>
                  </div>
                )}
                {typicalProfile.key_skills && typicalProfile.key_skills.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Key Skills</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {typicalProfile.key_skills.map((skill: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Profile Comparison */}
          {Object.keys(comparison).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Your Profile vs. Typical Hire</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {comparison.experience_match && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Experience</span>
                    <Badge variant={comparison.experience_match === 'above' ? 'default' : comparison.experience_match === 'meets' ? 'secondary' : 'destructive'}>
                      {comparison.experience_match === 'above' ? <TrendingUp className="h-3 w-3 mr-1" /> : 
                       comparison.experience_match === 'below' ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
                      {comparison.experience_match}
                    </Badge>
                  </div>
                )}
                {comparison.skills_match && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Skills</span>
                    <Badge variant={comparison.skills_match === 'above' ? 'default' : comparison.skills_match === 'meets' ? 'secondary' : 'destructive'}>
                      {comparison.skills_match}
                    </Badge>
                  </div>
                )}
                {comparison.education_match && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Education</span>
                    <Badge variant={comparison.education_match === 'above' ? 'default' : comparison.education_match === 'meets' ? 'secondary' : 'destructive'}>
                      {comparison.education_match}
                    </Badge>
                  </div>
                )}
                {comparison.standout_factors && comparison.standout_factors.length > 0 && (
                  <div className="pt-2">
                    <span className="text-sm text-muted-foreground">Standout Factors</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {comparison.standout_factors.map((factor: string, idx: number) => (
                        <Badge key={idx} className="text-xs bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {factor}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground text-center">
        Last analyzed: {new Date(analysis.updated_at).toLocaleString()}
      </p>
    </div>
  );
}
