import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Building2, TrendingUp, Users, Newspaper, Lightbulb, HelpCircle, Download, Loader2, ExternalLink, Share2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyNewsSection } from "./CompanyNewsSection";
import { LinkedMaterialsSection } from "./LinkedMaterialsSection";

interface CompanyResearchProps {
  jobId: string;
  interviewId?: string;
  onManageMaterials?: () => void;
}

export const CompanyResearch = ({ jobId, interviewId, onManageMaterials }: CompanyResearchProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch existing research
  const { data: research, isLoading } = useQuery({
    queryKey: ['company-research', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_research')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch job details for company name
  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('company_name')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Generate research mutation
  const generateResearch = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const { data, error } = await supabase.functions.invoke('generate-company-research', {
        body: { jobId, interviewId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-research', jobId] });
      queryClient.invalidateQueries({ queryKey: ['application-package', jobId] });
      queryClient.invalidateQueries({ queryKey: ['linked-resume-for-job', jobId] });
      toast({
        title: "Research Generated",
        description: "Company research has been successfully generated.",
      });
      // Remind user to regenerate predictions
      setTimeout(() => {
        toast({
          title: "📊 Update Your Interview Predictions",
          description: "Company research completed! Regenerate interview success predictions to see your updated Research Score.",
          duration: 7000,
        });
      }, 2000);
      setIsGenerating(false);
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });

  // Export research
  const handleExport = () => {
    if (!research) return;

    const exportData = {
      companyProfile: research.company_profile,
      leadership: research.leadership_info,
      competitiveLandscape: research.competitive_landscape,
      recentNews: research.recent_news,
      talkingPoints: research.talking_points,
      questionsToAsk: research.questions_to_ask,
      generatedAt: new Date(research.created_at).toLocaleString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `company-research-${jobId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Research Exported",
      description: "Company research has been exported successfully.",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!research) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Company Research</CardTitle>
          <CardDescription>
            Generate comprehensive company research to prepare for your interview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => generateResearch.mutate()}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Research...
              </>
            ) : (
              <>
                <Building2 className="mr-2 h-4 w-4" />
                Generate Company Research
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const profile = research.company_profile as any;
  const leadership = research.leadership_info as any[];
  const news = research.recent_news as any[];
  const talkingPoints = research.talking_points as string[];
  const questions = research.questions_to_ask as string[];
  const socialMedia = (research as any).social_media;
  const marketPosition = (research as any).market_position;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Company Research</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateResearch.mutate()}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              'Regenerate'
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="profile">
            <Building2 className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="market">
            <TrendingUp className="h-4 w-4 mr-2" />
            Market
          </TabsTrigger>
          <TabsTrigger value="leadership">
            <Users className="h-4 w-4 mr-2" />
            Leadership
          </TabsTrigger>
          <TabsTrigger value="news">
            <Newspaper className="h-4 w-4 mr-2" />
            News
          </TabsTrigger>
          <TabsTrigger value="talking-points">
            <Lightbulb className="h-4 w-4 mr-2" />
            Points
          </TabsTrigger>
          <TabsTrigger value="questions">
            <HelpCircle className="h-4 w-4 mr-2" />
            Questions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <LinkedMaterialsSection jobId={jobId} onManageMaterials={onManageMaterials} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Executive Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile?.summary && (
                <p className="text-sm leading-relaxed tracking-normal">{profile.summary}</p>
              )}
              
              {socialMedia && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Social Media Presence
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {socialMedia.linkedin && (
                      <a 
                        href={socialMedia.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm"
                      >
                        LinkedIn
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {socialMedia.twitter && (
                      <a 
                        href={socialMedia.twitter} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors text-sm"
                      >
                        Twitter/X
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {socialMedia.facebook && (
                      <a 
                        href={socialMedia.facebook} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors text-sm"
                      >
                        Facebook
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {socialMedia.instagram && (
                      <a 
                        href={socialMedia.instagram} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-pink-50 text-pink-700 hover:bg-pink-100 transition-colors text-sm"
                      >
                        Instagram
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {socialMedia.youtube && (
                      <a 
                        href={socialMedia.youtube} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-colors text-sm"
                      >
                        YouTube
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {research.competitive_landscape && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Competitive Landscape
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed tracking-normal">{research.competitive_landscape}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="market" className="space-y-4">
          {marketPosition ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Market Position Analysis</CardTitle>
                <CardDescription>Understanding the company's position in the market</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {marketPosition.market_standing && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Market Standing
                      </h4>
                      <Badge variant="secondary" className="text-sm">
                        {marketPosition.market_standing}
                      </Badge>
                    </div>
                  )}
                  {marketPosition.market_share_estimate && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Market Share</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed tracking-normal">
                        {marketPosition.market_share_estimate}
                      </p>
                    </div>
                  )}
                  {marketPosition.growth_stage && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Growth Stage</h4>
                      <Badge variant="outline" className="text-sm">
                        {marketPosition.growth_stage}
                      </Badge>
                    </div>
                  )}
                </div>

                {marketPosition.target_segments && marketPosition.target_segments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Target Market Segments</h4>
                    <div className="flex flex-wrap gap-2">
                      {marketPosition.target_segments.map((segment: string, idx: number) => (
                        <Badge key={idx} variant="secondary">{segment}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {marketPosition.competitive_advantages && marketPosition.competitive_advantages.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Competitive Advantages</h4>
                    <ul className="space-y-2">
                      {marketPosition.competitive_advantages.map((advantage: string, idx: number) => (
                        <li key={idx} className="flex gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-1">•</span>
                          <span className="leading-relaxed tracking-normal">{advantage}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {marketPosition.differentiators && marketPosition.differentiators.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Key Differentiators</h4>
                    <ul className="space-y-2">
                      {marketPosition.differentiators.map((diff: string, idx: number) => (
                        <li key={idx} className="flex gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-1">•</span>
                          <span className="leading-relaxed tracking-normal">{diff}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {marketPosition.market_trends && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Market Trends</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed tracking-normal">
                      {marketPosition.market_trends}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">No market position data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile?.history && (
                <div>
                  <h4 className="font-medium mb-2">History</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed tracking-normal">{profile.history}</p>
                </div>
              )}
              {profile?.mission && (
                <div>
                  <h4 className="font-medium mb-2">Mission</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed tracking-normal">{profile.mission}</p>
                </div>
              )}
              {profile?.values && (
                <div>
                  <h4 className="font-medium mb-2">Values</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.values.map((value: string, idx: number) => (
                      <Badge key={idx} variant="secondary">{value}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {profile?.recent_developments && (
                <div>
                  <h4 className="font-medium mb-2">Recent Developments</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {profile.recent_developments.map((dev: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground leading-relaxed tracking-normal">{dev}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leadership" className="space-y-4">
          {leadership && leadership.length > 0 ? (
            leadership.map((leader, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="text-base">{leader.name}</CardTitle>
                  <CardDescription>{leader.role}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed tracking-normal">{leader.background}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">No leadership information available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="news" className="space-y-4">
          {news && news.length > 0 && job ? (
            <CompanyNewsSection 
              jobId={jobId} 
              companyName={job.company_name}
              news={news} 
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">No recent news available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="talking-points">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Key Talking Points</CardTitle>
              <CardDescription>Important points to mention during your interview</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {talkingPoints && talkingPoints.length > 0 ? (
                  talkingPoints.map((point, idx) => (
                    <li key={idx} className="flex gap-3">
                      <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm leading-relaxed tracking-normal">{point}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No talking points available</p>
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Questions to Ask</CardTitle>
              <CardDescription>Intelligent questions to demonstrate your interest</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {questions && questions.length > 0 ? (
                  questions.map((question, idx) => (
                    <li key={idx} className="flex gap-3">
                      <HelpCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm leading-relaxed tracking-normal">{question}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No questions available</p>
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};