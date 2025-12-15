import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Send, FileText, MessageSquare, Target, Loader2 } from "lucide-react";

interface ReferenceRequest {
  id: string;
  company_name: string | null;
  role_title: string | null;
  request_type: string;
  preparation_materials: Record<string, unknown>;
  talking_points_sent: string[];
  professional_references?: {
    reference_name: string;
    reference_email: string | null;
    skills_they_can_speak_to: string[];
    talking_points: string[];
  };
}

interface Props {
  request: ReferenceRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReferencePreparationDialog({ request, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [preparationMaterials, setPreparationMaterials] = useState<{
    keyPoints: string[];
    suggestedQuestions: string[];
    roleContext: string;
    companyContext: string;
  } | null>(null);
  const [customTalkingPoints, setCustomTalkingPoints] = useState("");

  const generatePreparation = async () => {
    if (!request) return;
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-reference-preparation", {
        body: {
          referenceName: request.professional_references?.reference_name,
          companyName: request.company_name,
          roleTitle: request.role_title,
          requestType: request.request_type,
          referenceSkills: request.professional_references?.skills_they_can_speak_to || [],
          existingTalkingPoints: request.professional_references?.talking_points || [],
        },
      });

      if (error) throw error;
      setPreparationMaterials(data);
      setCustomTalkingPoints(data.keyPoints?.join("\n") || "");
    } catch (error: any) {
      toast.error("Failed to generate preparation: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!request) return;
      
      const talkingPoints = customTalkingPoints.split("\n").filter(p => p.trim());
      
      const { error } = await supabase
        .from("reference_requests")
        .update({
          preparation_materials: preparationMaterials || {},
          talking_points_sent: talkingPoints,
        })
        .eq("id", request.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reference-requests"] });
      toast.success("Preparation materials saved");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  const sendToReference = async () => {
    if (!request?.professional_references?.reference_email) {
      toast.error("Reference email not available");
      return;
    }

    try {
      const talkingPoints = customTalkingPoints.split("\n").filter(p => p.trim());
      
      const { error } = await supabase.functions.invoke("send-reference-preparation", {
        body: {
          requestId: request.id,
          recipientEmail: request.professional_references.reference_email,
          recipientName: request.professional_references.reference_name,
          companyName: request.company_name,
          roleTitle: request.role_title,
          talkingPoints,
          preparationMaterials,
        },
      });

      if (error) throw error;

      // Save the talking points sent
      await supabase
        .from("reference_requests")
        .update({
          preparation_materials: preparationMaterials || {},
          talking_points_sent: talkingPoints,
        })
        .eq("id", request.id);

      queryClient.invalidateQueries({ queryKey: ["reference-requests"] });
      toast.success("Preparation materials sent to reference!");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to send: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <div className="overflow-y-auto max-h-[75vh] pr-2">
        <DialogHeader>
          <DialogTitle>Reference Preparation Guidance</DialogTitle>
          <DialogDescription>
            Generate and share role-specific talking points with {request?.professional_references?.reference_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Request Context */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Request Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex gap-4">
                <span className="text-muted-foreground">Position:</span>
                <span className="font-medium">{request?.role_title || "Not specified"}</span>
              </div>
              <div className="flex gap-4">
                <span className="text-muted-foreground">Company:</span>
                <span className="font-medium">{request?.company_name || "Not specified"}</span>
              </div>
              <div className="flex gap-4">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="outline" className="capitalize">{request?.request_type?.replace("_", " ")}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          {!preparationMaterials && (
            <Button onClick={generatePreparation} disabled={isGenerating} className="w-full">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Guidance...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Preparation Guidance
                </>
              )}
            </Button>
          )}

          {/* Generated Materials */}
          {preparationMaterials && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Role Context
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{preparationMaterials.roleContext}</p>
                </CardContent>
              </Card>

              {preparationMaterials.companyContext && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Company Context
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{preparationMaterials.companyContext}</p>
                  </CardContent>
                </Card>
              )}

              {preparationMaterials.suggestedQuestions && preparationMaterials.suggestedQuestions.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Questions Reference May Be Asked
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {preparationMaterials.suggestedQuestions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label>Key Talking Points (edit as needed)</Label>
                <Textarea
                  value={customTalkingPoints}
                  onChange={(e) => setCustomTalkingPoints(e.target.value)}
                  rows={6}
                  placeholder="One talking point per line..."
                />
                <p className="text-xs text-muted-foreground">
                  These points help your reference speak to your qualifications for this role
                </p>
              </div>
            </>
          )}

          {/* Reference's Existing Skills */}
          {request?.professional_references?.skills_they_can_speak_to && 
           request.professional_references.skills_they_can_speak_to.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Skills They Can Speak To</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {request.professional_references.skills_they_can_speak_to.map((skill, i) => (
                    <Badge key={i} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {preparationMaterials && (
            <>
              <Button variant="outline" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                Save Only
              </Button>
              <Button 
                onClick={sendToReference} 
                disabled={!request?.professional_references?.reference_email}
              >
                <Send className="h-4 w-4 mr-2" />
                Send to Reference
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
