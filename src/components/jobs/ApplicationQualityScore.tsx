import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle2, Target, TrendingUp, FileText, Linkedin, Award, RefreshCw, Loader2, ArrowUp, ArrowDown, Minus, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface ApplicationQualityScoreProps {
  jobId: string;
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
}

interface ImprovementSuggestion {
  priority: number;
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

interface FormattingIssue {
  type: string;
  location: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

interface QualityScore {
  id: string;
  overall_score: number;
  resume_score: number | null;
  cover_letter_score: number | null;
  linkedin_score: number | null;
  keyword_match_score: number | null;
  formatting_score: number | null;
  missing_keywords: string[];
  missing_skills: string[];
  missing_experiences: string[];
  formatting_issues: FormattingIssue[];
  improvement_suggestions: ImprovementSuggestion[];
  user_average_score: number | null;
  top_score: number | null;
  score_percentile: number | null;
  meets_threshold: boolean;
  threshold_value: number;
  analysis_details: Record<string, unknown>;
  updated_at: string;
}

export const ApplicationQualityScore: React.FC<ApplicationQualityScoreProps> = ({
  jobId,
  jobTitle,
  companyName,
  jobDescription
}) => {
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch existing quality score
  const { data: qualityScore, isLoading } = useQuery({
    queryKey: ['application-quality-score', jobId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('application_quality_scores')
        .select('*')
        .eq('job_id', jobId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        formatting_issues: (data.formatting_issues as unknown as FormattingIssue[]) || [],
        improvement_suggestions: (data.improvement_suggestions as unknown as ImprovementSuggestion[]) || [],
        analysis_details: (data.analysis_details as Record<string, unknown>) || {}
      } as QualityScore;
    }
  });

  // Fetch score history
  const { data: scoreHistory } = useQuery({
    queryKey: ['quality-score-history', jobId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('quality_score_history')
        .select('*')
        .eq('job_id', jobId)
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch user's application materials
  const fetchMaterials = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { resume: null, coverLetter: null, profile: null, skills: [] };

    // Fetch latest resume
    const { data: resumes } = await supabase
      .from('resumes')
      .select('content')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    // Fetch latest cover letter linked to this job
    const { data: packages } = await supabase
      .from('application_packages')
      .select('cover_letter_id')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .limit(1);

    let coverLetterContent = null;
    if (packages?.[0]?.cover_letter_id) {
      const { data: coverLetter } = await supabase
        .from('application_materials')
        .select('file_url')
        .eq('id', packages[0].cover_letter_id)
        .single();
      coverLetterContent = coverLetter?.file_url;
    }

    // Fetch user profile for LinkedIn
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('linkedin_profile_url, bio')
      .eq('user_id', user.id)
      .single();

    // Fetch user skills
    const { data: skills } = await supabase
      .from('skills')
      .select('skill_name')
      .eq('user_id', user.id);

    return {
      resume: resumes?.[0]?.content,
      coverLetter: coverLetterContent,
      profile: profile?.linkedin_profile_url ? `LinkedIn: ${profile.linkedin_profile_url}\nBio: ${profile.bio || ''}` : null,
      skills: skills?.map(s => s.skill_name) || []
    };
  };

  // Analyze application quality
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const materials = await fetchMaterials();
      
      const { data, error } = await supabase.functions.invoke('analyze-application-quality', {
        body: {
          jobDescription,
          jobTitle,
          companyName,
          resumeContent: materials.resume ? JSON.stringify(materials.resume) : null,
          coverLetterContent: materials.coverLetter,
          linkedInProfile: materials.profile,
          userSkills: materials.skills
        }
      });

      if (error) throw error;

      // Calculate user's average score and top score
      const { data: allScores } = await supabase
        .from('application_quality_scores')
        .select('overall_score')
        .eq('user_id', user.id);

      const scores = allScores?.map(s => s.overall_score) || [];
      const userAverage = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      const topScore = scores.length > 0 ? Math.max(...scores) : null;

      // Calculate percentile
      const percentile = scores.length > 0 
        ? Math.round((scores.filter(s => s < data.overall_score).length / scores.length) * 100)
        : null;

      // Save to database
      const scoreData = {
        user_id: user.id,
        job_id: jobId,
        overall_score: data.overall_score,
        resume_score: data.resume_score,
        cover_letter_score: data.cover_letter_score,
        linkedin_score: data.linkedin_score,
        keyword_match_score: data.keyword_match_score,
        formatting_score: data.formatting_score,
        missing_keywords: data.missing_keywords || [],
        missing_skills: data.missing_skills || [],
        missing_experiences: data.missing_experiences || [],
        formatting_issues: data.formatting_issues || [],
        improvement_suggestions: data.improvement_suggestions || [],
        user_average_score: userAverage,
        top_score: topScore,
        score_percentile: percentile,
        meets_threshold: data.overall_score >= 70,
        threshold_value: 70,
        analysis_details: {
          strengths: data.strengths || [],
          alignment_details: data.alignment_details || {}
        }
      };

      const { data: savedScore, error: saveError } = await supabase
        .from('application_quality_scores')
        .upsert(scoreData, { onConflict: 'user_id,job_id' })
        .select()
        .single();

      if (saveError) throw saveError;

      // Record in history
      await supabase.from('quality_score_history').insert({
        user_id: user.id,
        job_id: jobId,
        score: data.overall_score,
        change_type: qualityScore ? 'update' : 'initial',
        change_description: qualityScore 
          ? `Score changed from ${qualityScore.overall_score} to ${data.overall_score}`
          : 'Initial analysis'
      });

      return savedScore;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application-quality-score', jobId] });
      queryClient.invalidateQueries({ queryKey: ['quality-score-history', jobId] });
      toast.success('Application quality analyzed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to analyze application quality');
    }
  });

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await analyzeMutation.mutateAsync();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high': return <Badge variant="destructive">High Impact</Badge>;
      case 'medium': return <Badge variant="secondary">Medium Impact</Badge>;
      default: return <Badge variant="outline">Low Impact</Badge>;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!qualityScore) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Application Quality Score
          </CardTitle>
          <CardDescription>
            Get AI-powered analysis of your application package quality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Analyze your resume, cover letter, and profile alignment with this job
            </p>
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Target className="mr-2 h-4 w-4" />
                  Analyze Application Quality
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const analysisDetails = qualityScore.analysis_details as { 
    strengths?: string[]; 
    alignment_details?: { skills_matched?: string[]; experiences_matched?: string[]; keywords_matched?: string[] } 
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Application Quality Score
            </CardTitle>
            <CardDescription>
              Last analyzed: {new Date(qualityScore.updated_at).toLocaleDateString()}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center">
          <div className={`text-5xl font-bold ${getScoreColor(qualityScore.overall_score)}`}>
            {qualityScore.overall_score}
          </div>
          <p className="text-muted-foreground">Overall Quality Score</p>
          <Progress value={qualityScore.overall_score} className="mt-2 h-3" />
          
          {!qualityScore.meets_threshold && (
            <div className="flex items-center justify-center gap-2 mt-3 text-destructive">
              <ShieldAlert className="h-4 w-4" />
              <span className="text-sm">Below minimum threshold ({qualityScore.threshold_value})</span>
            </div>
          )}
          
          {qualityScore.meets_threshold && (
            <div className="flex items-center justify-center gap-2 mt-3 text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Ready for submission</span>
            </div>
          )}
        </div>

        {/* Comparison Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Your Average</p>
            <p className="text-lg font-semibold">
              {qualityScore.user_average_score?.toFixed(0) || '-'}
            </p>
            {qualityScore.user_average_score && (
              <div className="flex items-center justify-center gap-1 text-xs">
                {qualityScore.overall_score > qualityScore.user_average_score ? (
                  <><ArrowUp className="h-3 w-3 text-green-500" /><span className="text-green-500">Above avg</span></>
                ) : qualityScore.overall_score < qualityScore.user_average_score ? (
                  <><ArrowDown className="h-3 w-3 text-red-500" /><span className="text-red-500">Below avg</span></>
                ) : (
                  <><Minus className="h-3 w-3" /><span>At avg</span></>
                )}
              </div>
            )}
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Your Best</p>
            <p className="text-lg font-semibold">{qualityScore.top_score || '-'}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Percentile</p>
            <p className="text-lg font-semibold">{qualityScore.score_percentile || '-'}%</p>
          </div>
        </div>

        <Tabs defaultValue="scores" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scores">Scores</TabsTrigger>
            <TabsTrigger value="missing">Missing</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="suggestions">Improve</TabsTrigger>
          </TabsList>

          <TabsContent value="scores" className="space-y-4 mt-4">
            {/* Component Scores */}
            <div className="space-y-3">
              {qualityScore.resume_score !== null && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>Resume</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={qualityScore.resume_score} className="w-24 h-2" />
                    <span className={`font-medium ${getScoreColor(qualityScore.resume_score)}`}>
                      {qualityScore.resume_score}
                    </span>
                  </div>
                </div>
              )}
              
              {qualityScore.cover_letter_score !== null && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>Cover Letter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={qualityScore.cover_letter_score} className="w-24 h-2" />
                    <span className={`font-medium ${getScoreColor(qualityScore.cover_letter_score)}`}>
                      {qualityScore.cover_letter_score}
                    </span>
                  </div>
                </div>
              )}
              
              {qualityScore.linkedin_score !== null && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    <span>LinkedIn</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={qualityScore.linkedin_score} className="w-24 h-2" />
                    <span className={`font-medium ${getScoreColor(qualityScore.linkedin_score)}`}>
                      {qualityScore.linkedin_score}
                    </span>
                  </div>
                </div>
              )}
              
              {qualityScore.keyword_match_score !== null && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span>Keyword Match</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={qualityScore.keyword_match_score} className="w-24 h-2" />
                    <span className={`font-medium ${getScoreColor(qualityScore.keyword_match_score)}`}>
                      {qualityScore.keyword_match_score}
                    </span>
                  </div>
                </div>
              )}
              
              {qualityScore.formatting_score !== null && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <span>Formatting</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={qualityScore.formatting_score} className="w-24 h-2" />
                    <span className={`font-medium ${getScoreColor(qualityScore.formatting_score)}`}>
                      {qualityScore.formatting_score}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Strengths */}
            {analysisDetails?.strengths && analysisDetails.strengths.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Strengths
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysisDetails.strengths.map((strength, idx) => (
                    <Badge key={idx} variant="outline" className="bg-green-500/10 border-green-500/30">
                      {strength}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="missing" className="space-y-4 mt-4">
            {qualityScore.missing_keywords?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Missing Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {qualityScore.missing_keywords.map((keyword, idx) => (
                    <Badge key={idx} variant="outline" className="bg-red-500/10 border-red-500/30">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {qualityScore.missing_skills?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Missing Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {qualityScore.missing_skills.map((skill, idx) => (
                    <Badge key={idx} variant="outline" className="bg-yellow-500/10 border-yellow-500/30">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {qualityScore.missing_experiences?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Missing Experiences</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {qualityScore.missing_experiences.map((exp, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                      {exp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(!qualityScore.missing_keywords?.length && !qualityScore.missing_skills?.length && !qualityScore.missing_experiences?.length) && (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>No significant gaps identified!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="issues" className="space-y-4 mt-4">
            {qualityScore.formatting_issues?.length > 0 ? (
              <div className="space-y-3">
                {qualityScore.formatting_issues.map((issue, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="capitalize">{issue.type}</Badge>
                      <Badge variant="outline" className="capitalize">{issue.location}</Badge>
                      <span className={`text-xs ${getSeverityColor(issue.severity)}`}>
                        {issue.severity} severity
                      </span>
                    </div>
                    <p className="text-sm">{issue.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>No formatting issues detected!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-4 mt-4">
            {qualityScore.improvement_suggestions?.length > 0 ? (
              <div className="space-y-3">
                {qualityScore.improvement_suggestions
                  .sort((a, b) => a.priority - b.priority)
                  .map((suggestion, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                            #{suggestion.priority}
                          </span>
                          <Badge variant="outline" className="capitalize">{suggestion.category}</Badge>
                        </div>
                        {getImpactBadge(suggestion.impact)}
                      </div>
                      <h4 className="font-medium mb-1">{suggestion.title}</h4>
                      <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>Your application looks great!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Score History */}
        {scoreHistory && scoreHistory.length > 1 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Score History
            </h4>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {scoreHistory.slice(0, 5).map((history, idx) => (
                <div key={history.id} className="flex flex-col items-center p-2 rounded bg-muted/50 min-w-[60px]">
                  <span className={`font-medium ${getScoreColor(history.score)}`}>{history.score}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(history.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApplicationQualityScore;
