import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Settings, UserPlus } from "lucide-react";
import { TeamSettingsDialog } from "./TeamSettingsDialog";

interface TeamCardProps {
  team: {
    id: string;
    name: string;
    description: string;
    created_at: string;
    team_members: Array<{ role: string }>;
    member_count?: number;
  };
  onUpdate: () => void;
}

export const TeamCard = ({ team, onUpdate }: TeamCardProps) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // team_members now only contains current user's membership
  const userRole = team.team_members[0]?.role || "member";
  const isAdmin = userRole === "admin" || userRole === "owner";
  const memberCount = team.member_count || team.team_members.length;

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {team.name}
              </CardTitle>
              <CardDescription className="mt-2">
                {team.description || "No description"}
              </CardDescription>
            </div>
            <Badge variant="secondary">{userRole}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4 mr-1" />
                Manage
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <TeamSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        team={team}
        onUpdate={onUpdate}
      />
    </>
  );
};
