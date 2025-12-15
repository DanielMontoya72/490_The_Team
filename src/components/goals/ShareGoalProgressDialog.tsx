import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Share2, Copy, Download } from "lucide-react";
import { toast } from "sonner";

interface ShareGoalProgressDialogProps {
  goals: any[];
  achievements: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareGoalProgressDialog({ 
  goals, 
  achievements, 
  open, 
  onOpenChange 
}: ShareGoalProgressDialogProps) {
  const activeGoals = goals?.filter(g => g.status === 'active' || g.status === 'in_progress') || [];
  const completedGoals = goals?.filter(g => g.status === 'completed') || [];
  
  const progressSummary = `
🎯 Career Goals Progress Report

📊 Summary:
• Active Goals: ${activeGoals.length}
• Completed Goals: ${completedGoals.length}
• Achievements: ${achievements?.length || 0}
• Success Rate: ${goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0}%

${activeGoals.length > 0 ? `🔥 Active Goals:
${activeGoals.map(g => `• ${g.goal_title} (${g.progress_percentage}% complete)`).join('\n')}` : ''}

${completedGoals.length > 0 ? `✅ Recent Achievements:
${completedGoals.slice(0, 3).map(g => `• ${g.goal_title}`).join('\n')}` : ''}

Keep pushing forward! 💪
  `.trim();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(progressSummary);
    toast.success("Progress summary copied to clipboard!");
  };

  const downloadAsText = () => {
    const blob = new Blob([progressSummary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `career-goals-progress-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Progress report downloaded!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Your Progress
          </DialogTitle>
          <DialogDescription>
            Share your career goals progress with mentors, accountability partners, or on social media
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Progress Summary</Label>
            <Textarea
              value={progressSummary}
              readOnly
              className="min-h-[300px] font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={copyToClipboard} className="flex-1">
              <Copy className="h-4 w-4 mr-2" />
              Copy to Clipboard
            </Button>
            <Button onClick={downloadAsText} variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download as Text
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            💡 Tip: Share your progress with accountability partners to stay motivated!
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
