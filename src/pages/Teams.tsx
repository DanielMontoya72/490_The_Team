import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Users, Plus, Settings } from "lucide-react";
import { CreateTeamDialog } from "@/components/teams/CreateTeamDialog";
import { TeamCard } from "@/components/teams/TeamCard";
import { User } from "@supabase/supabase-js";
import { AppNav } from "@/components/layout/AppNav";
import { ContactSidebar } from "@/components/layout/ContactSidebar";

interface Team {
  id: string;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
  team_members: Array<{
    role: string;
  }>;
  member_count?: number;
}

export default function Teams() {
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) fetchTeams();
    });
  }, []);

  const fetchTeams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get teams where user is a member, with their specific role
      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          team_members!inner(role, user_id)
        `)
        .eq("team_members.user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get member counts for each team
      const teamsWithCounts = await Promise.all(
        (data || []).map(async (team) => {
          const { count } = await supabase
            .from("team_members")
            .select("*", { count: "exact", head: true })
            .eq("team_id", team.id);
          return { ...team, member_count: count || 0 };
        })
      );

      setTeams(teamsWithCounts);
    } catch (error: any) {
      toast.error("Failed to load teams");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <AppNav />
        <div className="container mx-auto py-8">Loading teams...</div>
      </>
    );
  }

  return (
    <>
      <AppNav />
      
      <div className="flex min-h-screen bg-background pt-16">
        <ContactSidebar activeTab="teams" />
        
        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden lg:ml-56">
          <div className="h-full overflow-y-auto">
            <div className="container mx-auto px-4 py-8 max-w-7xl lg:pt-0 pt-16 space-y-6">
              <div className="text-center space-y-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2">Teams</h1>
                  <p className="text-muted-foreground">
                    Collaborate with your team members and share templates
                  </p>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)} size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team
                </Button>
              </div>

      {teams.length === 0 ? (
        <Card>
          <CardHeader className="text-center py-8 sm:py-12">
            <Users className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="text-lg sm:text-xl">No Teams Yet</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Create a team to collaborate with others and share resume templates
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-8 sm:pb-12">
            <Button onClick={() => setCreateDialogOpen(true)} size="lg" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} onUpdate={fetchTeams} />
          ))}
        </div>
      )}

      <CreateTeamDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={fetchTeams}
        userId={user?.id || ""}
      />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
