import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddResponseDialog({ open, onOpenChange }: AddResponseDialogProps) {
  const [question, setQuestion] = useState("");
  const [questionType, setQuestionType] = useState<string>("behavioral");
  const [response, setResponse] = useState("");
  const [skills, setSkills] = useState("");
  const [tags, setTags] = useState("");
  const [companies, setCompanies] = useState("");
  const [experiences, setExperiences] = useState("");
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: libraryEntry, error: libraryError } = await supabase
        .from('interview_response_library')
        .insert({
          user_id: user.id,
          question,
          question_type: questionType,
          current_response: response,
          skills: skills.split(',').map(s => s.trim()).filter(Boolean),
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          companies_used_for: companies.split(',').map(c => c.trim()).filter(Boolean),
          experiences_referenced: experiences.split(',').map(e => e.trim()).filter(Boolean),
        })
        .select()
        .single();

      if (libraryError) throw libraryError;

      // Create initial version
      if (response) {
        const { error: versionError } = await supabase
          .from('interview_response_versions')
          .insert({
            response_id: libraryEntry.id,
            version_number: 1,
            response_text: response,
          });
        if (versionError) throw versionError;
      }

      return libraryEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['response-library'] });
      toast.success('Response added to library');
      resetForm();
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to add response'),
  });

  const resetForm = () => {
    setQuestion("");
    setQuestionType("behavioral");
    setResponse("");
    setSkills("");
    setTags("");
    setCompanies("");
    setExperiences("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Interview Response</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Question *</Label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Tell me about a time you led a team through a difficult project"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Question Type *</Label>
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
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Write your best response using the STAR method..."
              rows={6}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Skills (comma-separated)</Label>
              <Input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="leadership, communication, problem-solving"
              />
            </div>

            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="conflict resolution, teamwork"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Companies Used For</Label>
              <Input
                value={companies}
                onChange={(e) => setCompanies(e.target.value)}
                placeholder="Google, Microsoft, Amazon"
              />
            </div>

            <div className="space-y-2">
              <Label>Experiences Referenced</Label>
              <Input
                value={experiences}
                onChange={(e) => setExperiences(e.target.value)}
                placeholder="Project X leadership, Team restructuring"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => addMutation.mutate()}
              disabled={!question || addMutation.isPending}
            >
              {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Response
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
