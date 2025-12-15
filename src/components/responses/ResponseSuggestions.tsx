import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Star, CheckCircle, Copy } from "lucide-react";
import { toast } from "sonner";

interface ResponseItem {
  id: string;
  question: string;
  question_type: string;
  current_response: string | null;
  tags: string[];
  skills: string[];
  companies_used_for: string[];
  experiences_referenced: string[];
  success_count: number;
  usage_count: number;
  effectiveness_score: number;
  is_favorite: boolean;
}

interface Job {
  id: string;
  job_title: string;
  company_name: string;
  job_description: string | null;
  industry: string | null;
}

export function ResponseSuggestions() {
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  const { data: jobs } = useQuery({
    queryKey: ['jobs-for-suggestions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_title, company_name, job_description, industry')
        .eq('user_id', user.id)
        .not('status', 'eq', 'rejected')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as Job[];
    },
  });

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
      return data as ResponseItem[];
    },
  });

  const selectedJob = jobs?.find(j => j.id === selectedJobId);

  // Calculate relevance score for each response based on job requirements
  const getSuggestedResponses = () => {
    if (!selectedJob || !responses) return [];

    const jobDescription = (selectedJob.job_description || '').toLowerCase();
    const jobTitle = selectedJob.job_title.toLowerCase();
    const industry = (selectedJob.industry || '').toLowerCase();

    return responses
      .map(response => {
        let score = 0;
        const matchedSkills: string[] = [];

        // Check skill matches against job description
        response.skills?.forEach(skill => {
          const skillLower = skill.toLowerCase();
          if (jobDescription.includes(skillLower) || jobTitle.includes(skillLower)) {
            score += 20;
            matchedSkills.push(skill);
          }
        });

        // Check tag matches
        response.tags?.forEach(tag => {
          const tagLower = tag.toLowerCase();
          if (jobDescription.includes(tagLower) || jobTitle.includes(tagLower) || industry.includes(tagLower)) {
            score += 10;
          }
        });

        // Check company matches
        response.companies_used_for?.forEach(company => {
          if (company.toLowerCase() === selectedJob.company_name.toLowerCase()) {
            score += 25;
          }
        });

        // Boost for success count
        score += response.success_count * 15;

        // Boost for favorites
        if (response.is_favorite) score += 10;

        // Boost for effectiveness
        score += (response.effectiveness_score || 0) * 0.5;

        return {
          ...response,
          relevanceScore: Math.min(score, 100),
          matchedSkills,
        };
      })
      .filter(r => r.relevanceScore > 0 || r.is_favorite)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  };

  const suggestedResponses = getSuggestedResponses();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'behavioral': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'technical': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'situational': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-100 dark:bg-green-900/50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/50';
    return 'text-muted-foreground bg-muted';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Smart Response Suggestions
          </CardTitle>
          <CardDescription>
            Get the best responses from your library matched to specific job requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select a job to prepare for</label>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a job application..." />
              </SelectTrigger>
              <SelectContent>
                {jobs?.map(job => (
                  <SelectItem key={job.id} value={job.id}>
                    <span className="font-medium">{job.job_title}</span>
                    <span className="text-muted-foreground ml-2">at {job.company_name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedJob && jobs?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No active job applications found.</p>
              <p className="text-sm mt-1">Add job applications to get personalized suggestions.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedJob && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Preparing for: {selectedJob.job_title} at {selectedJob.company_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {selectedJob.industry && (
                  <Badge variant="secondary">{selectedJob.industry}</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {suggestedResponses.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>No matching responses found in your library.</p>
                <p className="text-sm mt-1">Add responses with skills that match this job to get suggestions.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h3 className="font-medium text-lg">
                Suggested Responses ({suggestedResponses.length})
              </h3>
              
              {suggestedResponses.map((response) => (
                <Card key={response.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getTypeColor(response.question_type)}>
                            {response.question_type}
                          </Badge>
                          <Badge className={getScoreColor(response.relevanceScore)}>
                            {response.relevanceScore}% match
                          </Badge>
                          {response.is_favorite && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                          {response.success_count > 0 && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {response.success_count} success
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-base">{response.question}</CardTitle>
                      </div>
                      {response.current_response && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => copyToClipboard(response.current_response!)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {response.current_response && (
                      <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                        {response.current_response}
                      </p>
                    )}
                    
                    {response.matchedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-xs text-muted-foreground mr-1">Matched skills:</span>
                        {response.matchedSkills.map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs text-green-600 border-green-600">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
