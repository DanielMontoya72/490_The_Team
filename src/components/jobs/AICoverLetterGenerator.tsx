import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sparkles, Copy, Download, RefreshCw, TrendingUp, Edit, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { CoverLetterEditor } from './CoverLetterEditor';
import { CoverLetterExport } from './CoverLetterExport';

interface Job {
  id: string;
  job_title: string;
  company_name: string;
  job_description: string | null;
  company_description: string | null;
  company_website: string | null;
  industry: string | null;
  company_size: string | null;
}

interface HighlightedExperience {
  experience: string;
  relevanceScore: number;
  matchedRequirements?: string[];
  narrative: string;
  keyAchievements: string[];
  alternativePresentations?: {
    achievementFocused?: string;
    skillsFocused?: string;
    impactFocused?: string;
  };
}

interface CoverLetterVariation {
  opening: string;
  body1: string;
  body2: string;
  closing: string;
  tone: string;
  keyStrengths: string[];
  highlightedExperiences?: HighlightedExperience[];
  toneConsistency?: {
    score: number;
    analysis: string;
    suggestions: string[];
  };
}

interface GeneratedContent {
  variations: CoverLetterVariation[];
  companyResearch: {
    recentNews: string;
    culturalAlignment: string;
    valueProposition: string;
  };
  improvementSuggestions: string[];
  experienceAnalysis?: {
    jobRequirements?: {
      hardSkills: string[];
      softSkills: string[];
      yearsExperience?: string;
      mustHave: string[];
      niceToHave: string[];
    };
    candidateStrengths?: {
      topMatches: Array<{
        experience: string;
        score: number;
        matchedRequirements: string[];
      }>;
      overallFitScore: number;
      strengthAreas: string[];
      gapAreas: string[];
    };
    suggestedAdditions?: Array<{
      experience: string;
      reason: string;
      score: number;
    }>;
  };
}

interface AICoverLetterGeneratorProps {
  job: Job;
  templateType?: string;
}

export function AICoverLetterGenerator({ job, templateType = 'formal' }: AICoverLetterGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedVariation, setSelectedVariation] = useState(0);
  
  // UC-058: Tone and Style Customization
  const [tone, setTone] = useState('formal');
  const [length, setLength] = useState('standard');
  const [style, setStyle] = useState('direct');
  const [companyCulture, setCompanyCulture] = useState('professional');
  const [customInstructions, setCustomInstructions] = useState('');

  // UC-060: Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  // UC-061: Export State
  const [showExport, setShowExport] = useState(false);
  const [companyResearch, setCompanyResearch] = useState<any>(null);

  useEffect(() => {
    fetchUserProfile();
    fetchCompanyResearch();
  }, [job.id]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user profile with related data
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const { data: employment } = await supabase
        .from('employment_history')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      const { data: skills } = await supabase
        .from('skills')
        .select('*')
        .eq('user_id', user.id);

      const { data: education } = await supabase
        .from('education')
        .select('*')
        .eq('user_id', user.id)
        .order('graduation_date', { ascending: false });

      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id);

      const { data: certifications } = await supabase
        .from('certifications')
        .select('*')
        .eq('user_id', user.id);

      setUserProfile({
        ...profile,
        employment_history: employment,
        skills,
        education,
        projects,
        certifications
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchCompanyResearch = async () => {
    try {
      const { data, error } = await supabase
        .from('company_research')
        .select('*')
        .eq('job_id', job.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setCompanyResearch(data);
      }
    } catch (error) {
      console.error('Error fetching company research:', error);
    }
  };

  const generateCoverLetter = async () => {
    if (!userProfile) {
      toast.error('Please complete your profile first');
      return;
    }

    if (!job.job_description) {
      toast.error('Job description is required');
      return;
    }

    setLoading(true);
    try {
      // Prepare company research data if available
      const companyResearchData = companyResearch ? {
        profile: companyResearch.company_profile,
        leadership: companyResearch.leadership_info,
        marketPosition: companyResearch.market_position,
        recentNews: companyResearch.recent_news,
        competitiveLandscape: companyResearch.competitive_landscape,
        talkingPoints: companyResearch.talking_points
      } : null;

      const { data, error } = await supabase.functions.invoke('generate-cover-letter', {
        body: {
          jobDescription: job.job_description,
          userProfile,
          companyInfo: {
            company_name: job.company_name,
            company_description: job.company_description,
            company_website: job.company_website,
            job_title: job.job_title,
            industry: job.industry,
            company_size: job.company_size
          },
          companyResearch: companyResearchData,
          templateType,
          // UC-058: Pass tone and style preferences
          tonePreferences: {
            tone,
            length,
            style,
            companyCulture,
            customInstructions
          }
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      setGeneratedContent(data);
      setSelectedVariation(0);
      toast.success('Cover letter generated successfully!');
    } catch (error: any) {
      console.error('Error generating cover letter:', error);
      const errorMessage = error?.message || error?.error || 'Failed to generate cover letter. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getFullText = (variation: CoverLetterVariation) => {
    const header = (variation as any).header || '';
    return header 
      ? `${header}\n\n${variation.opening}\n\n${variation.body1}\n\n${variation.body2}\n\n${variation.closing}`
      : `${variation.opening}\n\n${variation.body1}\n\n${variation.body2}\n\n${variation.closing}`;
  };

  const copyToClipboard = (variation: CoverLetterVariation) => {
    const fullText = getFullText(variation);
    navigator.clipboard.writeText(fullText);
    toast.success('Cover letter copied to clipboard');
  };

  const downloadAsText = (variation: CoverLetterVariation) => {
    const fullText = getFullText(variation);
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover_letter_${job.company_name}_${job.job_title}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Cover letter downloaded');
  };

  const handleEdit = (variation: CoverLetterVariation) => {
    setEditedContent(getFullText(variation));
    setIsEditing(true);
  };

  const handleSaveEdit = (content: string) => {
    setEditedContent(content);
    toast.success('Changes saved');
  };

  const handleExport = (variation: CoverLetterVariation) => {
    setEditedContent(getFullText(variation));
    setShowExport(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Cover Letter Generator
          </CardTitle>
          <CardDescription>
            Generate personalized cover letter content based on your profile and the job posting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* UC-058: Tone and Style Customization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger id="tone">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                  <SelectItem value="analytical">Analytical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companyCulture">Company Culture</Label>
              <Select value={companyCulture} onValueChange={setCompanyCulture}>
                <SelectTrigger id="companyCulture">
                  <SelectValue placeholder="Select culture" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional/Corporate</SelectItem>
                  <SelectItem value="startup">Startup/Fast-paced</SelectItem>
                  <SelectItem value="creative">Creative/Agency</SelectItem>
                  <SelectItem value="academic">Academic/Research</SelectItem>
                  <SelectItem value="nonprofit">Nonprofit/Mission-driven</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="length">Length</Label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger id="length">
                  <SelectValue placeholder="Select length" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brief">Brief (200-250 words)</SelectItem>
                  <SelectItem value="standard">Standard (300-400 words)</SelectItem>
                  <SelectItem value="detailed">Detailed (400-500 words)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="style">Writing Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger id="style">
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct & Action-oriented</SelectItem>
                  <SelectItem value="narrative">Narrative Storytelling</SelectItem>
                  <SelectItem value="bullet">Mixed with Bullet Points</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customInstructions">Custom Tone Instructions (Optional)</Label>
            <Textarea
              id="customInstructions"
              placeholder="Add specific instructions about tone, personality, or style you want reflected in the cover letter..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Example: "Use more humor", "Reference my international experience", "Emphasize leadership skills"
            </p>
          </div>
          
          <Button
            onClick={generateCoverLetter}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Cover Letter
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedContent && (
        <div className="space-y-6">
          <Tabs value={selectedVariation.toString()} onValueChange={(v) => setSelectedVariation(parseInt(v))}>
            <TabsList>
              {generatedContent.variations.map((_, index) => (
                <TabsTrigger key={index} value={index.toString()}>
                  Variation {index + 1}
                </TabsTrigger>
              ))}
            </TabsList>

            {generatedContent.variations.map((variation, index) => (
              <TabsContent key={index} value={index.toString()} className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Variation {index + 1}</CardTitle>
                        <CardDescription>Tone: {variation.tone}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(variation)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(variation)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExport(variation)}
                        >
                          <FileDown className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="font-semibold mb-2">Opening</div>
                      <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                        {variation.opening}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold mb-2">Body - Part 1</div>
                      <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                        {variation.body1}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold mb-2">Body - Part 2</div>
                      <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                        {variation.body2}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold mb-2">Closing</div>
                      <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                        {variation.closing}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold mb-2">Key Strengths Highlighted</div>
                      <div className="flex flex-wrap gap-2">
                        {variation.keyStrengths.map((strength, i) => (
                          <Badge key={i} variant="secondary">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {strength}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* UC-059: Experience Highlighting */}
                    {variation.highlightedExperiences && variation.highlightedExperiences.length > 0 && (
                      <div className="space-y-4">
                        <div className="font-semibold">Highlighted Experiences (Relevance Analysis)</div>
                        <div className="space-y-4">
                          {variation.highlightedExperiences.map((exp, i) => (
                            <Card key={i}>
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-base">{exp.experience}</CardTitle>
                                  <Badge variant={
                                    exp.relevanceScore >= 90 ? 'default' : 
                                    exp.relevanceScore >= 75 ? 'secondary' : 
                                    'outline'
                                  } className="text-sm">
                                    {exp.relevanceScore}% Match
                                  </Badge>
                                </div>
                                {exp.matchedRequirements && exp.matchedRequirements.length > 0 && (
                                  <CardDescription className="flex flex-wrap gap-1 mt-2">
                                    <span className="text-xs font-medium">Matches:</span>
                                    {exp.matchedRequirements.map((req, j) => (
                                      <Badge key={j} variant="outline" className="text-xs">
                                        {req}
                                      </Badge>
                                    ))}
                                  </CardDescription>
                                )}
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div>
                                  <div className="text-sm font-medium mb-1">Narrative</div>
                                  <div className="text-sm text-muted-foreground">{exp.narrative}</div>
                                </div>
                                
                                <div>
                                  <div className="text-sm font-medium mb-1">Key Achievements</div>
                                  <div className="space-y-1">
                                    {exp.keyAchievements.map((achievement, j) => (
                                      <div key={j} className="text-sm flex gap-2">
                                        <span className="text-primary">✓</span>
                                        <span>{achievement}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {exp.alternativePresentations && (
                                  <div>
                                    <div className="text-sm font-medium mb-2">Alternative Presentations</div>
                                    <Tabs defaultValue="achievement" className="w-full">
                                      <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="achievement" className="text-xs">Achievement</TabsTrigger>
                                        <TabsTrigger value="skills" className="text-xs">Skills</TabsTrigger>
                                        <TabsTrigger value="impact" className="text-xs">Impact</TabsTrigger>
                                      </TabsList>
                                      {exp.alternativePresentations.achievementFocused && (
                                        <TabsContent value="achievement" className="mt-2">
                                          <div className="text-sm p-3 bg-muted rounded-lg">
                                            {exp.alternativePresentations.achievementFocused}
                                          </div>
                                        </TabsContent>
                                      )}
                                      {exp.alternativePresentations.skillsFocused && (
                                        <TabsContent value="skills" className="mt-2">
                                          <div className="text-sm p-3 bg-muted rounded-lg">
                                            {exp.alternativePresentations.skillsFocused}
                                          </div>
                                        </TabsContent>
                                      )}
                                      {exp.alternativePresentations.impactFocused && (
                                        <TabsContent value="impact" className="mt-2">
                                          <div className="text-sm p-3 bg-muted rounded-lg">
                                            {exp.alternativePresentations.impactFocused}
                                          </div>
                                        </TabsContent>
                                      )}
                                    </Tabs>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* UC-058: Tone Consistency Validation */}
                    {variation.toneConsistency && (
                      <div>
                        <div className="font-semibold mb-2">Tone Consistency Analysis</div>
                        <div className="p-4 bg-muted rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Consistency Score</span>
                            <Badge variant={
                              variation.toneConsistency.score >= 80 ? 'default' : 
                              variation.toneConsistency.score >= 60 ? 'secondary' : 
                              'destructive'
                            }>
                              {variation.toneConsistency.score}%
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {variation.toneConsistency.analysis}
                          </div>
                          {variation.toneConsistency.suggestions.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-sm font-medium">Suggestions:</div>
                              {variation.toneConsistency.suggestions.map((suggestion, i) => (
                                <div key={i} className="text-sm text-muted-foreground flex gap-2">
                                  <span className="text-primary">→</span>
                                  <span>{suggestion}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          {/* UC-060: Cover Letter Editor */}
          {isEditing && (
            <CoverLetterEditor
              initialContent={editedContent}
              onSave={handleSaveEdit}
              jobTitle={job.job_title}
            />
          )}

          {/* UC-061: Cover Letter Export */}
          {showExport && editedContent && (
            <CoverLetterExport
              content={editedContent}
              jobTitle={job.job_title}
              companyName={job.company_name}
              applicantName={`${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim()}
            />
          )}

          {/* UC-059: Experience Analysis */}
          {generatedContent.experienceAnalysis && (
            <div className="space-y-4">
              {/* Job Requirements Analysis */}
              {generatedContent.experienceAnalysis.jobRequirements && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Job Requirements Analysis</CardTitle>
                    <CardDescription>Key qualifications extracted from the job posting</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium mb-2">Hard Skills Required</div>
                        <div className="flex flex-wrap gap-2">
                          {generatedContent.experienceAnalysis.jobRequirements.hardSkills.map((skill, i) => (
                            <Badge key={i} variant="default">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-2">Soft Skills Required</div>
                        <div className="flex flex-wrap gap-2">
                          {generatedContent.experienceAnalysis.jobRequirements.softSkills.map((skill, i) => (
                            <Badge key={i} variant="secondary">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {generatedContent.experienceAnalysis.jobRequirements.yearsExperience && (
                      <div>
                        <div className="text-sm font-medium mb-1">Experience Level</div>
                        <div className="text-sm text-muted-foreground">
                          {generatedContent.experienceAnalysis.jobRequirements.yearsExperience}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium mb-2">Must-Have Requirements</div>
                        <ul className="space-y-1">
                          {generatedContent.experienceAnalysis.jobRequirements.mustHave.map((req, i) => (
                            <li key={i} className="text-sm flex gap-2">
                              <span className="text-destructive font-bold">•</span>
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-2">Nice-to-Have Requirements</div>
                        <ul className="space-y-1">
                          {generatedContent.experienceAnalysis.jobRequirements.niceToHave.map((req, i) => (
                            <li key={i} className="text-sm flex gap-2">
                              <span className="text-muted-foreground">○</span>
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Candidate Strengths Analysis */}
              {generatedContent.experienceAnalysis.candidateStrengths && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Your Competitive Strengths</CardTitle>
                        <CardDescription>How your background matches the job requirements</CardDescription>
                      </div>
                      <Badge variant="default" className="text-lg px-3 py-1">
                        {generatedContent.experienceAnalysis.candidateStrengths.overallFitScore}% Overall Fit
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-sm font-medium mb-3">Top Matching Experiences</div>
                      <div className="space-y-2">
                        {generatedContent.experienceAnalysis.candidateStrengths.topMatches.map((match, i) => (
                          <div key={i} className="p-3 bg-muted rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium text-sm">{match.experience}</div>
                              <Badge variant={match.score >= 90 ? 'default' : match.score >= 75 ? 'secondary' : 'outline'}>
                                {match.score}%
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {match.matchedRequirements.map((req, j) => (
                                <Badge key={j} variant="outline" className="text-xs">
                                  {req}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium mb-2 text-green-600 dark:text-green-400">Strength Areas</div>
                        <ul className="space-y-1">
                          {generatedContent.experienceAnalysis.candidateStrengths.strengthAreas.map((area, i) => (
                            <li key={i} className="text-sm flex gap-2">
                              <span className="text-green-600 dark:text-green-400">✓</span>
                              <span>{area}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-2 text-amber-600 dark:text-amber-400">Areas to Emphasize</div>
                        <ul className="space-y-1">
                          {generatedContent.experienceAnalysis.candidateStrengths.gapAreas.map((area, i) => (
                            <li key={i} className="text-sm flex gap-2">
                              <span className="text-amber-600 dark:text-amber-400">→</span>
                              <span>{area}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Relevant Experiences */}
              {generatedContent.experienceAnalysis.suggestedAdditions && 
               generatedContent.experienceAnalysis.suggestedAdditions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Additional Relevant Experiences</CardTitle>
                    <CardDescription>Other experiences from your background worth considering</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {generatedContent.experienceAnalysis.suggestedAdditions.map((suggestion, i) => (
                        <div key={i} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-sm">{suggestion.experience}</div>
                            <Badge variant="outline">{suggestion.score}% Relevance</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">{suggestion.reason}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Company Research</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="font-semibold mb-1">Recent News</div>
                  <div className="text-muted-foreground">{generatedContent.companyResearch.recentNews}</div>
                </div>
                <div>
                  <div className="font-semibold mb-1">Cultural Alignment</div>
                  <div className="text-muted-foreground">{generatedContent.companyResearch.culturalAlignment}</div>
                </div>
                <div>
                  <div className="font-semibold mb-1">Value Proposition</div>
                  <div className="text-muted-foreground">{generatedContent.companyResearch.valueProposition}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Improvement Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {generatedContent.improvementSuggestions.map((suggestion, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span className="text-muted-foreground">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}