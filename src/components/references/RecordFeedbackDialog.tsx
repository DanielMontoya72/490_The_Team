import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, HelpCircle } from "lucide-react";

interface ReferenceRequest {
  id: string;
  company_name: string | null;
  role_title: string | null;
  reference_feedback: string | null;
  outcome: string | null;
  outcome_notes: string | null;
  professional_references?: {
    reference_name: string;
  };
}

interface Props {
  request: ReferenceRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecordFeedbackDialog({ request, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState(request?.reference_feedback || "");
  const [outcome, setOutcome] = useState(request?.outcome || "");
  const [outcomeNotes, setOutcomeNotes] = useState(request?.outcome_notes || "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!request) return;
      
      const { error } = await supabase
        .from("reference_requests")
        .update({
          reference_feedback: feedback || null,
          outcome: outcome || null,
          outcome_notes: outcomeNotes || null,
          feedback_received_at: feedback ? new Date().toISOString() : null,
          request_status: outcome ? "completed" : request.reference_feedback ? "completed" : "confirmed",
        })
        .eq("id", request.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reference-requests"] });
      toast.success("Feedback recorded");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to save feedback: " + error.message);
    },
  });

  const outcomeOptions = [
    { value: "positive", label: "Positive - Got the job/opportunity", icon: CheckCircle, color: "text-green-600" },
    { value: "neutral", label: "Neutral - Still waiting", icon: Clock, color: "text-yellow-600" },
    { value: "negative", label: "Negative - Did not get it", icon: XCircle, color: "text-red-600" },
    { value: "unknown", label: "Unknown - No feedback received", icon: HelpCircle, color: "text-muted-foreground" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Reference Feedback</DialogTitle>
          <DialogDescription>
            Track the outcome and any feedback from {request?.professional_references?.reference_name}'s reference
            {request?.company_name && ` for ${request.company_name}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Reference Feedback</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Any feedback received about the reference (e.g., what the employer said, how the reference went)..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Record any information you received about how the reference call/check went
            </p>
          </div>

          <div className="space-y-2">
            <Label>Application Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger>
                <SelectValue placeholder="Select outcome..." />
              </SelectTrigger>
              <SelectContent>
                {outcomeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${option.color}`} />
                        {option.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Outcome Notes</Label>
            <Textarea
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              placeholder="Additional notes about the outcome..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
