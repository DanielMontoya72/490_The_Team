import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Copy, Check, Briefcase, BookmarkCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface SavedVersion {
  id: string;
  employment_id: string;
  job_id: string | null;
  variation_label: string;
  tailored_description: string;
  relevance_score: number;
  action_verbs: string[];
  quantified_accomplishments: string[];
  industry_terms: string[];
  key_responsibilities: string[];
  job_description_excerpt: string | null;
  created_at: string;
  employment_history?: {
    job_title: string;
    company_name: string;
  };
  jobs?: {
    job_title: string;
    company_name: string;
  };
}

interface SavedTailoredVersionsProps {
  userId: string;
  resumeId?: string | null;
  onRefresh?: (refreshFn: () => void) => void;
}

export function SavedTailoredVersions({ userId, resumeId, onRefresh }: SavedTailoredVersionsProps) {
  const [savedVersions, setSavedVersions] = useState<SavedVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSavedVersions();
    
    // Expose refresh function to parent
    if (onRefresh) {
      onRefresh(fetchSavedVersions);
    }
  }, [userId]);

  const fetchSavedVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('tailored_experience_versions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch related employment and job data
      const enrichedData = await Promise.all(
        (data || []).map(async (item) => {
          const [employmentRes, jobRes] = await Promise.all([
            supabase
              .from('employment_history')
              .select('job_title, company_name')
              .eq('id', item.employment_id)
              .single(),
            item.job_id
              ? supabase
                  .from('jobs')
                  .select('job_title, company_name')
                  .eq('id', item.job_id)
                  .single()
              : Promise.resolve({ data: null, error: null }),
          ]);

          return {
            ...item,
            action_verbs: (item.action_verbs as string[]) || [],
            quantified_accomplishments: (item.quantified_accomplishments as string[]) || [],
            industry_terms: (item.industry_terms as string[]) || [],
            key_responsibilities: (item.key_responsibilities as string[]) || [],
            employment_history: employmentRes.data || undefined,
            jobs: jobRes.data || undefined,
          } as SavedVersion;
        })
      );
      
      setSavedVersions(enrichedData);
    } catch (error) {
      console.error('Error fetching saved versions:', error);
      toast.error('Failed to load saved versions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tailored_experience_versions')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast.success('Version deleted successfully');
      fetchSavedVersions();
    } catch (error) {
      console.error('Error deleting version:', error);
      toast.error('Failed to delete version');
    } finally {
      setDeleteId(null);
    }
  };

  const handleApplyToResume = async (version: SavedVersion) => {
    try {
      // Update employment history
      const { error: empError } = await supabase
        .from('employment_history')
        .update({ job_description: version.tailored_description })
        .eq('id', version.employment_id);

      if (empError) throw empError;

      // If resumeId is provided, also update the resume content
      if (resumeId) {
        const { data: resume, error: resumeError } = await supabase
          .from('resumes')
          .select('content')
          .eq('id', resumeId)
          .single();

        if (resumeError) throw resumeError;

        // Update the experience entry in the resume content
        const currentContent = (resume.content as Record<string, any>) || {};
        const updatedContent = { ...currentContent };
        
        // Initialize experience array if it doesn't exist
        if (!updatedContent.experience || !Array.isArray(updatedContent.experience)) {
          updatedContent.experience = [];
        }

        // Find if experience entry already exists
        const expIndex = updatedContent.experience.findIndex((exp: any) =>
          exp.employment_id === version.employment_id ||
          (exp.company === version.employment_history?.company_name && 
           exp.position === version.employment_history?.job_title)
        );

        if (expIndex >= 0) {
          // Update existing entry
          updatedContent.experience[expIndex] = {
            ...updatedContent.experience[expIndex],
            description: version.tailored_description,
          };
        } else {
          // Add new entry if not found
          updatedContent.experience.push({
            employment_id: version.employment_id,
            position: version.employment_history?.job_title,
            company: version.employment_history?.company_name,
            description: version.tailored_description,
          });
        }

        const { error: updateError } = await supabase
          .from('resumes')
          .update({ content: updatedContent })
          .eq('id', resumeId);

        if (updateError) throw updateError;
      }

      toast.success('Applied tailored description to your resume!');
    } catch (error) {
      console.error('Error applying description:', error);
      toast.error('Failed to apply description');
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading saved versions...</p>
        </CardContent>
      </Card>
    );
  }

  if (savedVersions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5" />
            Saved Tailored Versions
          </CardTitle>
          <CardDescription>
            Save tailored experience variations for easy reuse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No saved versions yet. Tailor your experience for a job and save variations you like!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5" />
            Saved Tailored Versions ({savedVersions.length})
          </CardTitle>
          <CardDescription>
            Your saved experience variations ready to use
          </CardDescription>
        </CardHeader>
      </Card>

      {savedVersions.map((version) => (
        <Card key={version.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-lg">
                    {version.employment_history?.job_title} at {version.employment_history?.company_name}
                  </CardTitle>
                  <Badge variant="secondary">{version.variation_label}</Badge>
                </div>
                {version.jobs && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>Tailored for: {version.jobs.job_title} at {version.jobs.company_name}</span>
                  </div>
                )}
                <CardDescription className="text-xs">
                  Saved {new Date(version.created_at).toLocaleDateString()}
                </CardDescription>
              </div>
              <Badge className={getRelevanceColor(version.relevance_score)}>
                {version.relevance_score}% Match
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Tailored Description:</h4>
              <ScrollArea className="h-32 rounded border bg-muted/50 p-3">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{version.tailored_description}</p>
              </ScrollArea>
            </div>

            {version.quantified_accomplishments && version.quantified_accomplishments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Quantified Accomplishments:</h4>
                <ul className="space-y-1.5">
                  {version.quantified_accomplishments.map((acc, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2 leading-relaxed">
                      <span className="text-primary mt-1">•</span>
                      <span className="flex-1">{acc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {version.action_verbs && version.action_verbs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Action Verbs:</h4>
                <div className="flex flex-wrap gap-1">
                  {version.action_verbs.map((verb, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {verb}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(version.tailored_description, version.id)}
              >
                {copiedItems.has(version.id) ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDeleteId(version.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Saved Version</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this saved version? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
