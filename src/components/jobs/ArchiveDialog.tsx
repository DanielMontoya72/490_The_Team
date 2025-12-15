import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  jobTitle?: string;
}

const ARCHIVE_REASONS = [
  { value: "position_filled", label: "Position was filled" },
  { value: "not_interested", label: "No longer interested" },
  { value: "no_response", label: "No response from company" },
  { value: "rejected", label: "Application rejected" },
  { value: "offer_declined", label: "Declined offer" },
  { value: "other", label: "Other (specify below)" },
];

export function ArchiveDialog({ open, onOpenChange, onConfirm, jobTitle }: ArchiveDialogProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const handleConfirm = () => {
    const reason = selectedReason === "other" ? customReason : selectedReason;
    onConfirm(reason);
    setSelectedReason("");
    setCustomReason("");
  };

  const isValid = selectedReason && (selectedReason !== "other" || customReason.trim());

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive Job Application</AlertDialogTitle>
          <AlertDialogDescription>
            {jobTitle ? `Archive "${jobTitle}"? ` : "Archive this job? "}
            This will move it to the archived section.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="mb-3 block">Reason for archiving</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {ARCHIVE_REASONS.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label htmlFor={reason.value} className="font-normal cursor-pointer">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {selectedReason === "other" && (
            <div>
              <Label htmlFor="customReason">Specify reason</Label>
              <Textarea
                id="customReason"
                placeholder="Enter your reason for archiving..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="mt-2"
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={!isValid}>
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
