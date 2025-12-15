import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, TrendingUp, Copy, Check, Save, BookmarkCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { markChecklistItemComplete } from '@/lib/checklist-utils';

interface EmploymentEntry {
  id: string;
  job_title: string;
  company_name: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  job_description: string | null;
  location: string | null;
}

interface TailoredExperience {
  roleId: string;
  relevanceScore: number;
  variations: Array<{
    label: string;
    description: string;
  }>;
  actionVerbs: string[];
  quantifiedAccomplishments: string[];
  industryTerms: string[];
  keyResponsibilities: string[];
}

interface TailoringResult {
  tailoredExperiences: TailoredExperience[];
  overallRecommendations: string[];
}

interface ExperienceTailoringProps {
  userId: string;
  jobDescription?: string;
  jobId?: string;
  onVersionSaved?: () => void;
  autoTailor?: boolean;
}

export function ExperienceTailoring({ userId, jobDescription: initialJobDescription, jobId, onVersionSaved, autoTailor }: ExperienceTailoringProps) {
  const [employmentHistory, setEmploymentHistory] = useState<EmploymentEntry[]>([]);
  const [jobDescription, setJobDescription] = useState(initialJobDescription || '');
  const [tailoringResult, setTailoringResult] = useState<TailoringResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [savedVersions, setSavedVersions] = useState<Set<string>>(new Set());
  const [savingVersions, setSavingVersions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEmploymentHistory();
    fetchSavedVersions();
  }, [userId]);

  // Auto-tailor when autoTailor prop is true and job description changes
  useEffect(() => {
    if (autoTailor && jobDescription && employmentHistory.length > 0 && !tailoringResult) {
      handleTailorExperience();
    }
  }, [autoTailor, jobDescription, employmentHistory]);

  const fetchSavedVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('tailored_experience_versions')
        .select('employment_id, variation_label')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      const savedSet = new Set(
        data?.map(v => `${v.employment_id}-${v.variation_label}`) || []
      );
      setSavedVersions(savedSet);
    } catch (error) {
      console.error('Error fetching saved versions:', error);
    }
  };

  const fetchEmploymentHistory = async () => {
    const { data, error } = await supabase
      .from('employment_history')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching employment history:', error);
      toast.error('Failed to load employment history');
      return;
    }

    setEmploymentHistory(data || []);
  };

  const handleTailorExperience = async () => {
    if (!jobDescription.trim()) {
      toast.error('Please enter a job description');
      return;
    }

    if (employmentHistory.length === 0) {
      toast.error('No employment history found. Please add your work experience first.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('tailor-resume-experience', {
        body: {
          jobDescription,
          employmentHistory: employmentHistory.map(entry => ({
            id: entry.id,
            jobTitle: entry.job_title,
            companyName: entry.company_name,
            startDate: entry.start_date,
            endDate: entry.end_date,
            isCurrent: entry.is_current,
            description: entry.job_description,
            location: entry.location
          }))
        }
      });

      if (error) {
        console.error('Error tailoring experience:', error);
        toast.error('Failed to tailor experience. Please try again.');
        return;
      }

      setTailoringResult(data);
      toast.success('Experience tailored successfully!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while tailoring experience');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItems(prev => new Set(prev).add(id));
    toast.success('Copied to clipboard');
    setTimeout(() => {
      setCopiedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }, 2000);
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRelevanceLabel = (score: number) => {
    if (score >= 80) return 'Highly Relevant';
    if (score >= 60) return 'Moderately Relevant';
    return 'Less Relevant';
  };

  const handleSaveVersion = async (
    employmentId: string,
    tailored: TailoredExperience,
    variation: { label: string; description: string }
  ) => {
    const versionKey = `${employmentId}-${variation.label}`;
    
    if (savedVersions.has(versionKey)) {
      toast.info('This version is already saved');
      return;
    }

    setSavingVersions(prev => new Set(prev).add(versionKey));

    try {
      const { error } = await supabase
        .from('tailored_experience_versions')
        .insert({
          user_id: userId,
          employment_id: employmentId,
          job_id: jobId || null,
          variation_label: variation.label,
          tailored_description: variation.description,
          relevance_score: tailored.relevanceScore,
          action_verbs: tailored.actionVerbs,
          quantified_accomplishments: tailored.quantifiedAccomplishments,
          industry_terms: tailored.industryTerms,
          key_responsibilities: tailored.keyResponsibilities,
          job_description_excerpt: jobDescription.substring(0, 500),
        });

      if (error) throw error;

      setSavedVersions(prev => new Set(prev).add(versionKey));
      toast.success('Tailored version saved successfully!');
      
      // Auto-complete the "tailor resume" checklist item
      if (jobId) {
        await markChecklistItemComplete(jobId, 'resume');
      }
      
      // Notify parent component to refresh saved versions list
      if (onVersionSaved) {
        onVersionSaved();
      }
    } catch (error) {
      console.error('Error saving version:', error);
      toast.error('Failed to save version');
    } finally {
      setSavingVersions(prev => {
        const newSet = new Set(prev);
        newSet.delete(versionKey);
        return newSet;
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Experience Tailoring
          </CardTitle>
          <CardDescription className="leading-relaxed">
            Tailor your work experience descriptions to match specific job requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="job-description">Job Description</Label>
            <Textarea
              id="job-description"
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={6}
              className="resize-none leading-relaxed"
            />
          </div>
          <Button 
            onClick={handleTailorExperience} 
            disabled={isLoading || !jobDescription.trim()}
            className="w-full"
          >
            {isLoading ? 'Analyzing...' : 'Tailor My Experience'}
          </Button>
        </CardContent>
      </Card>

      {tailoringResult && (
        <>
          {tailoringResult.overallRecommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Overall Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {tailoringResult.overallRecommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <TrendingUp className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                      <span className="text-sm leading-relaxed">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {tailoringResult.tailoredExperiences.map((tailored) => {
              const employment = employmentHistory.find(e => e.id === tailored.roleId);
              if (!employment) return null;

              return (
                <Card key={tailored.roleId}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {employment.job_title} at {employment.company_name}
                        </CardTitle>
                        <CardDescription>
                          {new Date(employment.start_date).toLocaleDateString()} - {
                            employment.is_current ? 'Present' : 
                            employment.end_date ? new Date(employment.end_date).toLocaleDateString() : 'N/A'
                          }
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getRelevanceColor(tailored.relevanceScore)}>
                          {tailored.relevanceScore}%
                        </Badge>
                        <Badge variant="outline">
                          {getRelevanceLabel(tailored.relevanceScore)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="variations" className="w-full">
                      <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="variations">Variations</TabsTrigger>
                        <TabsTrigger value="verbs">Action Verbs</TabsTrigger>
                        <TabsTrigger value="accomplishments">Accomplishments</TabsTrigger>
                        <TabsTrigger value="terms">Industry Terms</TabsTrigger>
                        <TabsTrigger value="responsibilities">Key Duties</TabsTrigger>
                      </TabsList>

                      <TabsContent value="variations" className="space-y-4 mt-4">
                        {tailored.variations.map((variation, idx) => {
                          const versionKey = `${tailored.roleId}-${variation.label}`;
                          const isSaved = savedVersions.has(versionKey);
                          const isSaving = savingVersions.has(versionKey);
                          
                          return (
                            <Card key={idx}>
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-1">
                                    <CardTitle className="text-base">{variation.label}</CardTitle>
                                    {isSaved && (
                                      <Badge variant="secondary" className="text-xs">
                                        <BookmarkCheck className="h-3 w-3 mr-1" />
                                        Saved
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => copyToClipboard(variation.description, `${tailored.roleId}-var-${idx}`)}
                                    >
                                      {copiedItems.has(`${tailored.roleId}-var-${idx}`) ? (
                                        <Check className="h-4 w-4" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={isSaved ? "secondary" : "default"}
                                      onClick={() => handleSaveVersion(tailored.roleId, tailored, variation)}
                                      disabled={isSaving || isSaved}
                                    >
                                      <Save className="h-4 w-4 mr-1" />
                                      {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save'}
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <ScrollArea className="h-32">
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {variation.description}
                                  </p>
                                </ScrollArea>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </TabsContent>

                      <TabsContent value="verbs" className="mt-4">
                        <div className="flex flex-wrap gap-2">
                          {tailored.actionVerbs.map((verb, idx) => (
                            <Badge key={idx} variant="secondary">
                              {verb}
                            </Badge>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="accomplishments" className="mt-4">
                        <ScrollArea className="h-64">
                          <ul className="space-y-3">
                            {tailored.quantifiedAccomplishments.map((accomplishment, idx) => (
                              <li key={idx} className="flex items-start gap-3">
                                <span className="text-primary mt-1">•</span>
                                <span className="text-sm flex-1 leading-relaxed">{accomplishment}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(accomplishment, `${tailored.roleId}-acc-${idx}`)}
                                >
                                  {copiedItems.has(`${tailored.roleId}-acc-${idx}`) ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="terms" className="mt-4">
                        <div className="flex flex-wrap gap-2">
                          {tailored.industryTerms.map((term, idx) => (
                            <Badge key={idx} variant="outline">
                              {term}
                            </Badge>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="responsibilities" className="mt-4">
                        <ScrollArea className="h-64">
                          <ul className="space-y-3">
                            {tailored.keyResponsibilities.map((responsibility, idx) => (
                              <li key={idx} className="flex items-start gap-3">
                                <span className="text-primary mt-1">•</span>
                                <span className="text-sm flex-1 leading-relaxed">{responsibility}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(responsibility, `${tailored.roleId}-resp-${idx}`)}
                                >
                                  {copiedItems.has(`${tailored.roleId}-resp-${idx}`) ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
