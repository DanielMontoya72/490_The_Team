import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface InviteAdvisorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function InviteAdvisorDialog({ open, onOpenChange, onSuccess }: InviteAdvisorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    advisor_name: "",
    advisor_email: "",
    advisor_type: "career_coach",
    specialization: "",
    company: "",
    bio: "",
    hourly_rate: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const inviteToken = crypto.randomUUID();

      const { error } = await supabase.from("external_advisors").insert({
        user_id: user.id,
        advisor_name: formData.advisor_name,
        advisor_email: formData.advisor_email,
        advisor_type: formData.advisor_type,
        specialization: formData.specialization || null,
        company: formData.company || null,
        bio: formData.bio || null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        invite_token: inviteToken,
        invited_at: new Date().toISOString(),
        status: "pending",
      });

      if (error) throw error;

      // Create default permissions
      const { data: advisor } = await supabase
        .from("external_advisors")
        .select("id")
        .eq("invite_token", inviteToken)
        .single();

      if (advisor) {
        await supabase.from("advisor_permissions").insert({
          advisor_id: advisor.id,
          view_profile: true,
          view_resume: false,
          view_cover_letters: false,
          view_jobs: false,
          view_interviews: false,
          view_goals: false,
          view_skills: false,
        });
      }

      toast.success("Advisor invited successfully!");
      onSuccess();
      onOpenChange(false);
      setFormData({
        advisor_name: "",
        advisor_email: "",
        advisor_type: "career_coach",
        specialization: "",
        company: "",
        bio: "",
        hourly_rate: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to invite advisor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite External Advisor</DialogTitle>
          <DialogDescription>
            Invite a career coach or advisor to access your profile and provide guidance
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="advisor_name">Name *</Label>
              <Input
                id="advisor_name"
                value={formData.advisor_name}
                onChange={(e) => setFormData({ ...formData, advisor_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="advisor_email">Email *</Label>
              <Input
                id="advisor_email"
                type="email"
                value={formData.advisor_email}
                onChange={(e) => setFormData({ ...formData, advisor_email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="advisor_type">Advisor Type *</Label>
              <Select
                value={formData.advisor_type}
                onValueChange={(value) => setFormData({ ...formData, advisor_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="career_coach">Career Coach</SelectItem>
                  <SelectItem value="resume_expert">Resume Expert</SelectItem>
                  <SelectItem value="interview_coach">Interview Coach</SelectItem>
                  <SelectItem value="industry_advisor">Industry Advisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                placeholder="e.g., Tech, Finance"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company/Organization</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
              <Input
                id="hourly_rate"
                type="number"
                min="0"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio/Notes</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Brief description of the advisor's background..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Invitation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
