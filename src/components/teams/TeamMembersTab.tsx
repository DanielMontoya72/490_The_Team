import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Trash2, Mail, MoreVertical, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { TeamMemberProfileDialog } from "./TeamMemberProfileDialog";

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user_profiles: {
    email: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string | null;
  };
}

interface TeamMembersTabProps {
  teamId: string;
  onUpdate: () => void;
}

export const TeamMembersTab = ({ teamId, onUpdate }: TeamMembersTabProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [loading, setLoading] = useState(false);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    fetchMembers();
    fetchCurrentUserRole();
  }, [teamId]);

  const fetchCurrentUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    setCurrentUserRole(data?.role || null);
  };

  const fetchMembers = async () => {
    try {
      // Get team members first
      const { data: teamMembersData, error: teamMembersError } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", teamId)
        .order("joined_at", { ascending: false });

      if (teamMembersError) {
        console.error("Team members error:", teamMembersError);
        throw teamMembersError;
      }

      if (!teamMembersData || teamMembersData.length === 0) {
        setMembers([]);
        return;
      }

      // Get user profiles for these members
      const userIds = teamMembersData.map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("user_profiles")
        .select("user_id, email, first_name, last_name, profile_picture_url")
        .in("user_id", userIds);

      if (profilesError) {
        console.error("Profiles error:", profilesError);
        throw profilesError;
      }

      // Combine the data
      const membersWithProfiles = teamMembersData.map(member => ({
        ...member,
        user_profiles: profilesData?.find(p => p.user_id === member.user_id) || {
          email: "",
          first_name: "",
          last_name: ""
        }
      }));

      console.log("Members with profiles:", membersWithProfiles);
      setMembers(membersWithProfiles);
    } catch (error: any) {
      console.error("Failed to load members:", error);
      toast.error("Failed to load team members");
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Email is required");
      return;
    }

    setLoading(true);
    try {
      // Find user by email
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("email", inviteEmail.trim())
        .single();

      if (profileError || !profileData) {
        toast.error("User not found. They need to create an account first.");
        return;
      }

      // Add to team
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("team_members").insert([{
        team_id: teamId,
        user_id: profileData.user_id,
        role: inviteRole as "owner" | "admin" | "member" | "viewer" | "mentor" | "candidate",
        invited_by: user?.id || null,
      }]);

      if (error) {
        if (error.code === "23505") {
          toast.error("User is already a member of this team");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Member added successfully");
      setInviteEmail("");
      setInviteRole("member");
      fetchMembers();
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to add member");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Member removed successfully");
      fetchMembers();
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to remove member");
      console.error(error);
    } finally {
      setRemoveMemberId(null);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: "owner" | "admin" | "member" | "viewer" | "mentor" | "candidate") => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Member role updated");
      fetchMembers();
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to update role");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const canManageRoles = currentUserRole === "owner" || currentUserRole === "admin";

  return (
    <div className="space-y-6">
      <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
        <h3 className="font-medium">Invite New Member</h3>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="candidate">Candidate - Person being coached/mentored</SelectItem>
                <SelectItem value="mentor">Mentor - Career coach who supports candidates</SelectItem>
                <SelectItem value="admin">Admin - Can manage team and members</SelectItem>
                <SelectItem value="viewer">Viewer - Can view templates (legacy)</SelectItem>
                <SelectItem value="member">Member - Can use and edit templates (legacy)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleInvite} disabled={loading}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium">Team Members ({members.length})</h3>
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {member.user_profiles?.profile_picture_url ? (
                  <img 
                    src={member.user_profiles.profile_picture_url} 
                    alt={`${member.user_profiles?.first_name || ''} ${member.user_profiles?.last_name || ''}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-medium">
                    {(member.user_profiles?.first_name?.[0] || '?')}{(member.user_profiles?.last_name?.[0] || '')}
                  </span>
                )}
              </div>
              <div>
                <p className="font-medium">
                  {member.user_profiles?.first_name || ''} {member.user_profiles?.last_name || ''}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {member.user_profiles?.email || 'No email'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={member.role === "owner" ? "default" : "secondary"} className="capitalize">
                {member.role}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      setSelectedMember({
                        id: member.user_id,
                        name: `${member.user_profiles?.first_name} ${member.user_profiles?.last_name}`,
                      })
                    }
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Profile
                  </DropdownMenuItem>
                  {member.role !== "owner" && canManageRoles && (
                    <>
                      <DropdownMenuItem onClick={() => handleChangeRole(member.id, "admin")}>
                        Change to Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleChangeRole(member.id, "mentor")}>
                        Change to Mentor
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleChangeRole(member.id, "candidate")}>
                        Change to Candidate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleChangeRole(member.id, "member")}>
                        Change to Member (legacy)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleChangeRole(member.id, "viewer")}>
                        Change to Viewer (legacy)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setRemoveMemberId(member.id)}
                      >
                        Remove from Team
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={removeMemberId !== null} onOpenChange={() => setRemoveMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the team? They will lose access to all team templates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => removeMemberId && handleRemoveMember(removeMemberId)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedMember && (
        <TeamMemberProfileDialog
          open={!!selectedMember}
          onOpenChange={(open) => !open && setSelectedMember(null)}
          memberId={selectedMember.id}
          memberName={selectedMember.name}
        />
      )}
    </div>
  );
};
