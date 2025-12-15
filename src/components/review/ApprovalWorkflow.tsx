import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, RotateCcw, Clock, Shield, AlertTriangle } from "lucide-react";

interface ApprovalWorkflowProps {
  shareId: string;
  materialType: "resume" | "cover_letter";
  approvalStatus: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  isOwner?: boolean;
  isReviewer?: boolean;
  onStatusChange?: () => void;
}

const STATUS_CONFIG = {
  pending: { 
    icon: Clock, 
    color: "bg-yellow-500", 
    label: "Pending Review",
    description: "Awaiting reviewer feedback"
  },
  approved: { 
    icon: CheckCircle2, 
    color: "bg-green-500", 
    label: "Approved",
    description: "Ready for submission"
  },
  revision_requested: { 
    icon: RotateCcw, 
    color: "bg-orange-500", 
    label: "Revision Requested",
    description: "Changes needed before approval"
  },
  rejected: { 
    icon: XCircle, 
    color: "bg-red-500", 
    label: "Rejected",
    description: "Does not meet requirements"
  },
};

export function ApprovalWorkflow({
  shareId,
  materialType,
  approvalStatus,
  approvedBy,
  approvedAt,
  approvalNotes,
  isOwner = false,
  isReviewer = false,
  onStatusChange,
}: ApprovalWorkflowProps) {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>("");
  const { toast } = useToast();

  const statusConfig = STATUS_CONFIG[approvalStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  const tableName = materialType === "resume" ? "resume_shares" : "cover_letter_shares";

  const updateApprovalStatus = async (newStatus: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await (supabase as any)
        .from(tableName)
        .update({
          approval_status: newStatus,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          approval_notes: notes || null,
        })
        .eq("id", shareId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Material has been marked as ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label || newStatus}`,
      });

      setDialogOpen(false);
      setNotes("");
      onStatusChange?.();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openApprovalDialog = (action: string) => {
    setSelectedAction(action);
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Approval Status
        </CardTitle>
        <CardDescription>
          Track the review and approval workflow for this {materialType === "resume" ? "resume" : "cover letter"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status Display */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className={`p-3 rounded-full ${statusConfig.color}`}>
            <StatusIcon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">{statusConfig.label}</p>
            <p className="text-sm text-muted-foreground">{statusConfig.description}</p>
            {approvedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Updated: {new Date(approvedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Approval Notes */}
        {approvalNotes && (
          <div className="p-3 border rounded-lg">
            <p className="text-sm font-medium mb-1">Reviewer Notes:</p>
            <p className="text-sm text-muted-foreground">{approvalNotes}</p>
          </div>
        )}

        {/* Workflow Timeline */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Workflow Progress</p>
          <div className="flex items-center gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, config], index) => {
              const Icon = config.icon;
              const isActive = key === approvalStatus;
              const isPast = Object.keys(STATUS_CONFIG).indexOf(approvalStatus) > index;
              
              return (
                <div key={key} className="flex items-center gap-1">
                  <div className={`p-1.5 rounded-full ${
                    isActive ? config.color : isPast ? 'bg-green-200' : 'bg-muted'
                  }`}>
                    <Icon className={`h-3 w-3 ${isActive ? 'text-white' : isPast ? 'text-green-600' : 'text-muted-foreground'}`} />
                  </div>
                  {index < Object.keys(STATUS_CONFIG).length - 1 && (
                    <div className={`w-8 h-0.5 ${isPast ? 'bg-green-200' : 'bg-muted'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviewer Actions */}
        {isReviewer && approvalStatus !== "approved" && (
          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-medium">Reviewer Actions</p>
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => openApprovalDialog("approved")}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
                onClick={() => openApprovalDialog("revision_requested")}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Request Revision
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50"
                onClick={() => openApprovalDialog("rejected")}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        )}

        {/* Owner Actions */}
        {isOwner && approvalStatus === "revision_requested" && (
          <div className="pt-4 border-t">
            <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800">Revision Requested</p>
                <p className="text-sm text-orange-700">
                  Please address the reviewer's feedback and resubmit for approval.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {approvalStatus === "approved" && (
          <div className="pt-4 border-t">
            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Approved for Submission</p>
                <p className="text-sm text-green-700">
                  This {materialType === "resume" ? "resume" : "cover letter"} has been approved and is ready for job applications.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Approval Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAction === "approved" && "Approve Material"}
              {selectedAction === "revision_requested" && "Request Revision"}
              {selectedAction === "rejected" && "Reject Material"}
            </DialogTitle>
            <DialogDescription>
              {selectedAction === "approved" && "Confirm that this material is ready for job applications."}
              {selectedAction === "revision_requested" && "Provide feedback on what changes are needed."}
              {selectedAction === "rejected" && "Explain why this material cannot be approved."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">
                {selectedAction === "approved" ? "Comments (optional)" : "Feedback (required)"}
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  selectedAction === "approved" 
                    ? "Any additional comments..."
                    : "Describe the changes needed or reasons for rejection..."
                }
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => updateApprovalStatus(selectedAction)}
              disabled={loading || (selectedAction !== "approved" && !notes.trim())}
              className={
                selectedAction === "approved" ? "bg-green-600 hover:bg-green-700" :
                selectedAction === "revision_requested" ? "bg-orange-600 hover:bg-orange-700" :
                "bg-red-600 hover:bg-red-700"
              }
            >
              {loading ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
