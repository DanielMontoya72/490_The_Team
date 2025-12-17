import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UserPlus, Users, Calendar, MessageSquare, Star, TrendingUp, DollarSign, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InviteAdvisorDialog } from "./InviteAdvisorDialog";
import { AdvisorList } from "./AdvisorList";
import { AdvisorSessions } from "./AdvisorSessions";
import { AdvisorRecommendations } from "./AdvisorRecommendations";
import { AdvisorMessages } from "./AdvisorMessages";
import { AdvisorEvaluations } from "./AdvisorEvaluations";
import { AdvisorImpact } from "./AdvisorImpact";
import { AdvisorBilling } from "./AdvisorBilling";
import { SharedMaterials } from "./SharedMaterials";

export function ExternalAdvisorsDashboard() {
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string | null>(null);

  useEffect(() => {
    fetchAdvisors();
  }, []);

  const fetchAdvisors = async () => {
    try {
      const { data, error } = await supabase
        .from("external_advisors")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAdvisors(data || []);
    } catch (error: any) {
      toast.error("Failed to load advisors");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const activeAdvisors = advisors.filter(a => a.status === 'active');
  const pendingAdvisors = advisors.filter(a => a.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            External Advisors & Coaches
          </h1>
          <p className="text-muted-foreground mt-1">
            Centralize all your career support relationships in one place
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeAdvisors.length}</p>
                <p className="text-sm text-muted-foreground">Active Advisors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <UserPlus className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingAdvisors.length}</p>
                <p className="text-sm text-muted-foreground">Pending Invites</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Calendar className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">Sessions This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <ClipboardList className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">Recommendations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="advisors" className="space-y-6">
            <TabsList className="w-full h-auto grid grid-cols-4 lg:grid-cols-8 gap-1.5 bg-muted/30 p-2 rounded-lg">
              <TabsTrigger value="advisors" className="text-xs lg:text-sm">
                <Users className="h-4 w-4 mr-1" />
                Advisors
              </TabsTrigger>
              <TabsTrigger value="sessions" className="text-xs lg:text-sm">
                <Calendar className="h-4 w-4 mr-1" />
                Sessions
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="text-xs lg:text-sm">
                <ClipboardList className="h-4 w-4 mr-1" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="messages" className="text-xs lg:text-sm">
                <MessageSquare className="h-4 w-4 mr-1" />
                Messages
              </TabsTrigger>
              <TabsTrigger value="materials" className="text-xs lg:text-sm">
                <TrendingUp className="h-4 w-4 mr-1" />
                Shared
              </TabsTrigger>
              <TabsTrigger value="evaluations" className="text-xs lg:text-sm">
                <Star className="h-4 w-4 mr-1" />
                Reviews
              </TabsTrigger>
              <TabsTrigger value="billing" className="text-xs lg:text-sm">
                <DollarSign className="h-4 w-4 mr-1" />
                Billing
              </TabsTrigger>
              <TabsTrigger value="impact" className="text-xs lg:text-sm">
                <TrendingUp className="h-4 w-4 mr-1" />
                Impact
              </TabsTrigger>
            </TabsList>

            <TabsContent value="advisors">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">My Advisors</h2>
                    <p className="text-sm text-muted-foreground">Manage your advisor relationships</p>
                  </div>
                  <Button onClick={() => setInviteDialogOpen(true)} size="default">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Advisor
                  </Button>
                </div>
                <AdvisorList 
                  advisors={advisors} 
                  loading={loading} 
                  onRefresh={fetchAdvisors}
                  onSelectAdvisor={setSelectedAdvisorId}
                />
              </div>
            </TabsContent>

            <TabsContent value="sessions">
              <AdvisorSessions advisors={advisors} />
            </TabsContent>

            <TabsContent value="recommendations">
              <AdvisorRecommendations advisors={advisors} />
            </TabsContent>

            <TabsContent value="messages">
              <AdvisorMessages advisors={advisors} selectedAdvisorId={selectedAdvisorId} />
            </TabsContent>

            <TabsContent value="materials">
              <SharedMaterials advisors={advisors} />
            </TabsContent>

            <TabsContent value="evaluations">
              <AdvisorEvaluations advisors={advisors} />
            </TabsContent>

            <TabsContent value="billing">
              <AdvisorBilling advisors={advisors} />
            </TabsContent>

            <TabsContent value="impact">
              <AdvisorImpact advisors={advisors} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <InviteAdvisorDialog 
        open={inviteDialogOpen} 
        onOpenChange={setInviteDialogOpen}
        onSuccess={fetchAdvisors}
      />
    </div>
  );
}
