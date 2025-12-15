import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";

interface EditResponseDialogProps {
  response: {
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
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditResponseDialog({ response, open, onOpenChange }: EditResponseDialogProps) {
  const [question, setQuestion] = useState(response.question);
  const [questionType, setQuestionType] = useState(response.question_type);
  const [responseText, setResponseText] = useState(response.current_response || "");
  const [skills, setSkills] = useState(response.skills?.join(", ") || "");
  const [tags, setTags] = useState(response.tags?.join(", ") || "");
  const [companies, setCompanies] = useState(response.companies_used_for?.join(", ") || "");
  const [experiences, setExperiences] = useState(response.experiences_referenced?.join(", ") || "");
  const [outcome, setOutcome] = useState<string>("");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: jobs } = useQuery({
    queryKey: ['jobs-for-outcomes'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_title, company_name, status')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: latestVersion } = useQuery({
    queryKey: ['response-latest-version', response.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_response_versions')
        .select('version_number')
        .eq('response_id', response.id)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.version_number || 0;
    },
  });

  useEffect(() => {
    setQuestion(response.question);
    setQuestionType(response.question_type);
    setResponseText(response.current_response || "");
    setSkills(response.skills?.join(", ") || "");
    setTags(response.tags?.join(", ") || "");
    setCompanies(response.companies_used_for?.join(", ") || "");
    setExperiences(response.experiences_referenced?.join(", ") || "");
  }, [response]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const hasResponseChanged = responseText !== response.current_response;
      
      // Update main record
      const updateData: any = {
        question,
        question_type: questionType,
        current_response: responseText,
        skills: skills.split(',').map(s => s.trim()).filter(Boolean),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        companies_used_for: companies.split(',').map(c => c.trim()).filter(Boolean),
        experiences_referenced: experiences.split(',').map(e => e.trim()).filter(Boolean),
      };

      if (outcome) {
        if (outcome === 'offer' || outcome === 'next_round') {
          updateData.success_count = (response.success_count || 0) + 1;
        }
        updateData.usage_count = (response.usage_count || 0) + 1;
        updateData.last_used_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('interview_response_library')
        .update(updateData)
        .eq('id', response.id);

      if (updateError) throw updateError;

      // Create new version if response changed
      if (hasResponseChanged && responseText) {
        const newVersionNumber = (latestVersion || 0) + 1;
        const { error: versionError } = await supabase
          .from('interview_response_versions')
          .insert({
            response_id: response.id,
            version_number: newVersionNumber,
            response_text: responseText,
            outcome: outcome || null,
            job_id: selectedJobId || null,
          });
        if (versionError) throw versionError;
      } else if (outcome) {
        // Just update the latest version with outcome
        const { error: versionError } = await supabase
          .from('interview_response_versions')
          .update({ outcome, job_id: selectedJobId || null })
          .eq('response_id', response.id)
          .eq('version_number', latestVersion || 1);
        if (versionError) console.error('Version update error:', versionError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['response-library'] });
      queryClient.invalidateQueries({ queryKey: ['response-versions'] });
      toast.success('Response updated');
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to update response'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Response</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Question</Label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Question Type</Label>
            <Select value={questionType} onValueChange={setQuestionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="behavioral">Behavioral</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="situational">Situational</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Your Response</Label>
            <Textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              rows={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Skills (comma-separated)</Label>
              <Input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Companies Used For</Label>
              <Input
                value={companies}
                onChange={(e) => setCompanies(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Experiences Referenced</Label>
              <Input
                value={experiences}
                onChange={(e) => setExperiences(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Track Outcome (Optional)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Interview Outcome</Label>
                <Select value={outcome} onValueChange={setOutcome}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offer">Received Offer</SelectItem>
                    <SelectItem value="next_round">Advanced to Next Round</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Link to Job</Label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select job..." />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs?.map(job => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.job_title} at {job.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => updateMutation.mutate()}
              disabled={!question || updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
