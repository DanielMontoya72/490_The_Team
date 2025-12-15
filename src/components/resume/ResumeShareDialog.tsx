import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Share2, Copy, Mail, Trash2, Users, Calendar as CalendarIcon, Clock } from "lucide-react";
import { ResumeShare, ResumeSharePermission } from "@/types/resume-collaboration";
import { format } from "date-fns";

interface ResumeShareDialogProps {
  resumeId: string;
  resumeName: string;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ResumeShareDialog({ resumeId, resumeName, children, open: externalOpen, onOpenChange }: ResumeShareDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [activeShare, setActiveShare] = useState<ResumeShare | null>(null);
  const [permissions, setPermissions] = useState<ResumeSharePermission[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [permissionLevel, setPermissionLevel] = useState<"view" | "comment" | "edit">("comment");
  const [allowComments, setAllowComments] = useState(true);
  const [expiresInDays, setExpiresInDays] = useState<string>("30");
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [reviewDeadline, setReviewDeadline] = useState<Date | undefined>();
  const [deadlineCalendarOpen, setDeadlineCalendarOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadShare();
      fetchTeams();
    }
  }, [open, resumeId]);

  const fetchTeams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          team_members!inner(role)
        `)
        .eq("team_members.user_id", user.id);

      if (error) throw error;

      // Filter teams where user is admin or owner
      const adminTeams = data?.filter(team => 
        team.team_members.some((m: any) => m.role === "admin" || m.role === "owner")
      ) || [];

      setTeams(adminTeams);
    } catch (error) {
      console.error("Failed to load teams:", error);
    }
  };

  const shareWithTeam = async () => {
    if (!selectedTeamId) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get the resume data to create a template
      const { data: resume, error: resumeError } = await supabase
        .from("resumes")
        .select("*")
        .eq("id", resumeId)
        .single();

      if (resumeError) throw resumeError;

      // Get the team name
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("name")
        .eq("id", selectedTeamId)
        .single();

      if (teamError) throw teamError;

      // Create a template from the resume and share it with the team
      const templateType = "hybrid";
      // Ensure template_type is one of the allowed values
      const validTemplateType = ['chronological', 'functional', 'hybrid'].includes(templateType) 
        ? templateType 
        : 'hybrid';

      const { error: templateError } = await supabase
        .from("resume_templates")
        .insert({
          template_name: `${resumeName} (Shared with ${team.name})`,
          template_type: validTemplateType,
          user_id: user.id,
          team_id: selectedTeamId,
          is_system_template: false,
          is_default: false,
          customization_settings: resume.customization_overrides || {},
        });

      if (templateError) throw templateError;

      // Also share via resume_shares for commenting
      // Get all team members
      const { data: members, error: membersError } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", selectedTeamId);

      if (membersError) throw membersError;

      // Get user profiles for the team members
      const memberIds = members?.map(m => m.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("user_id, email")
        .in("user_id", memberIds);

      if (profilesError) throw profilesError;

      // Create or get active share
      let shareId = activeShare?.id;
      if (!activeShare) {
        const shareToken = crypto.randomUUID();
        const expiresAt = expiresInDays !== "never" 
          ? new Date(Date.now() + parseInt(expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
          : null;

        const { data: newShare, error: shareError } = await (supabase as any)
          .from("resume_shares")
          .insert({
            resume_id: resumeId,
            user_id: user.id,
            share_token: shareToken,
            allow_comments: allowComments,
            expires_at: expiresAt,
          })
          .select()
          .single();

        if (shareError) throw shareError;
        shareId = newShare.id;
        setActiveShare(newShare);
      }

      // Add permissions for each team member
      const permissionsToAdd = profiles
        ?.filter((p: any) => p.user_id !== user.id && p.email)
        .map((p: any) => ({
          share_id: shareId,
          reviewer_email: p.email,
          permission_level: "comment",
        })) || [];

      if (permissionsToAdd.length > 0) {
        const { error: permError } = await (supabase as any)
          .from("resume_share_permissions")
          .insert(permissionsToAdd);

        if (permError) throw permError;
      }

      await loadPermissions(shareId);
      
      toast({
        title: "Shared with team",
        description: `Resume shared as template with ${team.name} and ${permissionsToAdd.length} team member${permissionsToAdd.length !== 1 ? 's' : ''} can comment.`,
      });

      setSelectedTeamId("");
    } catch (error: any) {
      console.error("Error sharing with team:", error);
      toast({
        title: "Error sharing with team",
        description: error.message || "Failed to share with team",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadShare = async () => {
    try {
      const { data: share, error } = await (supabase as any)
        .from("resume_shares")
        .select("*")
        .eq("resume_id", resumeId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (share) {
        setActiveShare(share as ResumeShare);
        setAllowComments(share.allow_comments);
        await loadPermissions(share.id);
      }
    } catch (error) {
      console.error("Error loading share:", error);
    }
  };

  const loadPermissions = async (shareId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from("resume_share_permissions")
        .select("*")
        .eq("share_id", shareId);

      if (error) throw error;
      setPermissions(data as ResumeSharePermission[] || []);
    } catch (error) {
      console.error("Error loading permissions:", error);
    }
  };

  const createShare = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const shareToken = crypto.randomUUID();
      const expiresAt = expiresInDays !== "never" 
        ? new Date(Date.now() + parseInt(expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await (supabase as any)
        .from("resume_shares")
        .insert({
          resume_id: resumeId,
          user_id: user.id,
          share_token: shareToken,
          privacy_level: "anyone_with_link",
          allow_comments: allowComments,
          is_active: true,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;

      setActiveShare(data as ResumeShare);
      toast({
        title: "Share link created",
        description: "Your resume can now be shared with others.",
      });
    } catch (error: any) {
      toast({
        title: "Error creating share",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateShareSettings = async (newAllowComments?: boolean) => {
    if (!activeShare) return;

    const commentsValue = newAllowComments !== undefined ? newAllowComments : allowComments;

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("resume_shares")
        .update({ allow_comments: commentsValue })
        .eq("id", activeShare.id);

      if (error) throw error;

      toast({
        title: "Settings updated",
        description: "Share settings have been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addPermission = async () => {
    if (!activeShare || !newEmail) return;

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("resume_share_permissions")
        .insert({
          share_id: activeShare.id,
          reviewer_email: newEmail,
          permission_level: permissionLevel,
        });

      if (error) throw error;

      await loadPermissions(activeShare.id);
      setNewEmail("");
      toast({
        title: "Permission added",
        description: `${newEmail} can now access your resume.`,
      });
    } catch (error: any) {
      toast({
        title: "Error adding permission",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removePermission = async (permissionId: string) => {
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("resume_share_permissions")
        .delete()
        .eq("id", permissionId);

      if (error) throw error;

      if (activeShare) {
        await loadPermissions(activeShare.id);
      }
      toast({
        title: "Permission removed",
        description: "Access has been revoked.",
      });
    } catch (error: any) {
      toast({
        title: "Error removing permission",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = () => {
    if (!activeShare) return;
    const link = `${window.location.origin}/resume/shared/${activeShare.share_token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied",
      description: "Share link has been copied to clipboard.",
    });
  };

  const deactivateShare = async () => {
    if (!activeShare) return;

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("resume_shares")
        .update({ is_active: false })
        .eq("id", activeShare.id);

      if (error) throw error;

      setActiveShare(null);
      setPermissions([]);
      toast({
        title: "Share deactivated",
        description: "The share link has been deactivated.",
      });
    } catch (error: any) {
      toast({
        title: "Error deactivating share",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Resume: {resumeName}</DialogTitle>
          <DialogDescription>
            Share your resume with others and manage access permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!activeShare ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="allow-comments">Allow comments and feedback</Label>
                <Switch
                  id="allow-comments"
                  checked={allowComments}
                  onCheckedChange={setAllowComments}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires">Link expires in</Label>
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger id="expires">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={createShare} disabled={loading} className="w-full">
                <Share2 className="h-4 w-4 mr-2" />
                Create Share Link
              </Button>

              {teams.length > 0 && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="team-select">Share with Team</Label>
                    <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                      <SelectTrigger id="team-select">
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={shareWithTeam} disabled={loading || !selectedTeamId} className="w-full">
                      <Users className="h-4 w-4 mr-2" />
                      Share with Team
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      All team members will receive comment access
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Share Link</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyShareLink}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button variant="destructive" size="sm" onClick={deactivateShare} disabled={loading}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deactivate
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="allow-comments-update">Allow comments</Label>
                  <Switch
                    id="allow-comments-update"
                    checked={allowComments}
                    onCheckedChange={(checked) => {
                      setAllowComments(checked);
                      updateShareSettings(checked);
                    }}
                  />
                </div>

                {activeShare.expires_at && (
                  <p className="text-sm text-muted-foreground">
                    Expires: {new Date(activeShare.expires_at).toLocaleDateString()}
                  </p>
                )}

                {/* Review Deadline */}
                <div className="pt-4 border-t space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Review Deadline
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Set a deadline for reviewers to complete their feedback
                  </p>
                  <Popover open={deadlineCalendarOpen} onOpenChange={setDeadlineCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {(activeShare as any).review_deadline 
                          ? format(new Date((activeShare as any).review_deadline), "PPP")
                          : "Set deadline (optional)"
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={(activeShare as any).review_deadline ? new Date((activeShare as any).review_deadline) : undefined}
                        onSelect={async (date) => {
                          try {
                            const { error } = await (supabase as any)
                              .from("resume_shares")
                              .update({ review_deadline: date?.toISOString() || null })
                              .eq("id", activeShare.id);
                            if (error) throw error;
                            setActiveShare({ ...activeShare, review_deadline: date?.toISOString() || null } as any);
                            setDeadlineCalendarOpen(false);
                            toast({
                              title: date ? "Deadline set" : "Deadline removed",
                              description: date ? `Review deadline set to ${format(date, "PPP")}` : "Review deadline removed",
                            });
                          } catch (error: any) {
                            toast({
                              title: "Error",
                              description: error.message,
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Specific People (Optional)</h4>
                <p className="text-sm text-muted-foreground">
                  Add specific people who can access this resume. Anyone with the link can view it by default.
                </p>

                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newEmail) {
                        e.preventDefault();
                        addPermission();
                      }
                    }}
                  />
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <Select value={permissionLevel} onValueChange={(value: any) => setPermissionLevel(value)}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">View Only</SelectItem>
                        <SelectItem value="comment">Can Comment</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={addPermission} disabled={loading || !newEmail} className="h-10">
                      <Mail className="h-4 w-4 mr-2" />
                      Add Person
                    </Button>
                  </div>
                </div>

                {permissions.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium">People with access</h5>
                    {permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{permission.reviewer_email}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {permission.permission_level === 'view' ? 'View Only' : 'Can Comment'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePermission(permission.id)}
                          disabled={loading}
                          className="ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
