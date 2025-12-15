import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { AppNav } from "@/components/layout/AppNav";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Users, Send, GraduationCap, UsersRound, Calendar, UserCircle, Sparkles, Bell, Linkedin, Coffee, Target, Share2, TrendingUp, PartyPopper, Shield, BookOpen, MessageSquare, ChevronRight, UserPlus, Zap, Network, Heart, FolderOpen, BarChart3, Search } from "lucide-react";
import { ProfessionalContactsManager } from "@/components/jobs/ProfessionalContactsManager";
import { NetworkingOpportunities } from "@/components/contacts/NetworkingOpportunities";
import { CampaignList } from "@/components/campaigns/CampaignList";
import { ContactDiscovery } from "@/components/contacts/ContactDiscovery";
import { RelationshipMaintenance } from "@/components/contacts/RelationshipMaintenance";
import LinkedInIntegration from "@/components/contacts/LinkedInIntegration";
import InformationalInterviewManager from "@/components/contacts/InformationalInterviewManager";
import { MentorDashboard } from "@/components/mentors/MentorDashboard";
import { TeamCard } from "@/components/teams/TeamCard";
import { CreateTeamDialog } from "@/components/teams/CreateTeamDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { SupportGroupBrowser } from "@/components/peer/SupportGroupBrowser";
import { GroupDetailsView } from "@/components/peer/GroupDetailsView";
import { PeerNetworkingMetrics } from "@/components/peer/PeerNetworkingMetrics";
import { ReferralRequestManager } from "@/components/contacts/ReferralRequestManager";
import { ShareGoalProgressDialog } from "@/components/goals/ShareGoalProgressDialog";
import { AccountabilityPartners } from "@/components/progress/AccountabilityPartners";
import { useQuery } from "@tanstack/react-query";

interface Team {
  id: string;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
  team_members: Array<{
    role: string;
  }>;
}

export default function Networking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("contacts");
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);
  const [referenceSubTab, setReferenceSubTab] = useState('references');
  const [familySubTab, setFamilySubTab] = useState('supporters');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Query for goals and achievements to share
  const { data: goals } = useQuery({
    queryKey: ['career-goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('career_goals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: achievements } = useQuery({
    queryKey: ['goal-achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goal_achievements')
        .select('*')
        .order('achievement_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Check for chat parameter to open chat directly
  const chatRelationshipId = searchParams.get('chat');

  // If there's a chat param, switch to mentors tab
  // If linkedin_connected, switch to linkedin tab
  useEffect(() => {
    if (chatRelationshipId) {
      setActiveTab("mentors");
    }
    if (searchParams.get('linkedin_connected') === 'true' || searchParams.get('linkedin_error') === 'true') {
      setActiveTab("linkedin");
      // Clear the params after handling
      searchParams.delete('linkedin_connected');
      searchParams.delete('linkedin_error');
      setSearchParams(searchParams);
    }
  }, [chatRelationshipId, searchParams]);

  // Clear chat param after handling
  const clearChatParam = () => {
    searchParams.delete('chat');
    setSearchParams(searchParams);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) fetchTeams();
    });
  }, []);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          team_members!inner(role)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTeams(data || []);
    } catch (error: any) {
      toast.error("Failed to load teams");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppNav />
      
      <div className="flex min-h-screen bg-background pt-16">
        {/* Networking Quick Actions Sidebar - Mobile Dropdown */}
        <aside className="lg:hidden fixed left-0 top-16 right-0 bg-card/80 backdrop-blur-md border-b z-40">
          <details className="group">
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-primary flex-shrink-0" />
                <h3 className="font-bold text-base text-white">Quick Actions</h3>
              </div>
              <svg className="h-5 w-5 transition-transform group-open:rotate-180 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-4 pb-4 space-y-0.5 border-t bg-background/80 backdrop-blur-md">
              <button
                onClick={() => setActiveTab('contacts')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <Users className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left">My Contacts</span>
              </button>
              <button
                onClick={() => setActiveTab('discovery')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <Sparkles className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left">Discover Contacts</span>
              </button>
              <button
                onClick={() => setActiveTab('campaigns')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <Send className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left">Outreach Campaigns</span>
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <Bell className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left">Relationship Maintenance</span>
              </button>
              <button
                onClick={() => setActiveTab('linkedin')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <Linkedin className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left">LinkedIn Integration</span>
              </button>
              <button
                onClick={() => setActiveTab('info-interviews')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <Coffee className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left">Informational Interviews</span>
              </button>
              <button
                onClick={() => setActiveTab('mentors')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <GraduationCap className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left">Mentors & Mentees</span>
              </button>
              <button
                onClick={() => setActiveTab('peer-groups')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <UsersRound className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left">Peer Support Groups</span>
              </button>
              <button
                onClick={() => setActiveTab('accountability')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <Target className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left">Accountability Partners</span>
              </button>
            </div>
          </details>
        </aside>

        {/* Networking Quick Actions Sidebar - Desktop */}
        <aside className="hidden lg:block w-52 bg-card border-r overflow-y-auto flex-shrink-0">
          <div className="p-3 sticky top-16">
            <div className="flex items-center gap-2 mb-3">
              <Network className="h-4 w-4 text-primary flex-shrink-0" />
              <h3 className="font-bold text-base text-white">Quick Actions</h3>
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => setActiveTab('contacts')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted transition-colors group"
              >
                <Users className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left">My Contacts</span>
              </button>
              <button
                onClick={() => setActiveTab('discovery')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted transition-colors group"
              >
                <Sparkles className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left">Discover Contacts</span>
              </button>
              <button
                onClick={() => setActiveTab('campaigns')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted transition-colors group"
              >
                <Send className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left">Outreach Campaigns</span>
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted transition-colors group"
              >
                <Bell className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left">Relationship Maintenance</span>
              </button>
              <button
                onClick={() => setActiveTab('linkedin')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted transition-colors group"
              >
                <Linkedin className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left">LinkedIn Integration</span>
              </button>
              <button
                onClick={() => setActiveTab('info-interviews')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted transition-colors group"
              >
                <Coffee className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left">Informational Interviews</span>
              </button>
              <button
                onClick={() => setActiveTab('mentors')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted transition-colors group"
              >
                <GraduationCap className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left">Mentors & Mentees</span>
              </button>
              <button
                onClick={() => setActiveTab('peer-groups')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted transition-colors group"
              >
                <UsersRound className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left">Peer Support Groups</span>
              </button>
              <button
                onClick={() => setActiveTab('accountability')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted transition-colors group"
              >
                <Target className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left">Accountability Partners</span>
              </button>
            </div>
          </div>
        </aside>
        
        {/* Main Content Area */}
        <main className="flex-1 w-full overflow-x-hidden lg:mt-0 mt-0">
          <div className="px-6 md:px-8 py-6 md:py-8 max-w-[1600px] mx-auto">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-[1920px]">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <h1 className="text-4xl font-bold">Contact Hub</h1>
              </div>
              <Button onClick={() => setShareDialogOpen(true)} size="lg">
                <Share2 className="h-5 w-5 mr-2" />
                Share Progress
              </Button>
            </div>
            <p className="text-muted-foreground text-lg">
              Your central hub for managing professional relationships and growing your network
            </p>
          </div>

          {/* Main Layout: Contacts + Action Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Area - Contacts */}
            <div className="lg:col-span-1 h-[calc(100vh-var(--nav-height,4.5rem)-12rem)] overflow-y-auto">
              <ProfessionalContactsManager />
            </div>

            {/* Right Content Area - Action Cards */}
            <div className="lg:col-span-1 space-y-4">
              {/* Quick Action Cards Grid */}
              <div className="grid grid-cols-1 gap-3">
                {/* Contact Discovery Card */}
                <div>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab(activeTab === 'discovery' ? '' : 'discovery')}>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-purple-500/10 rounded-lg">
                          <Sparkles className="h-4 w-4 text-purple-500" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold">Discover Contacts</h3>
                          <p className="text-xs text-muted-foreground">Find new connections</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        Find relevant professionals in your industry.
                      </p>
                      <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                        Start Discovering
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Outreach Campaigns Card */}
                <div>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab(activeTab === 'campaigns' ? '' : 'campaigns')}>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-500/10 rounded-lg">
                          <Send className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold">Outreach Campaigns</h3>
                          <p className="text-xs text-muted-foreground">Manage campaigns</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        Create and track outreach campaigns.
                      </p>
                      <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                        View Campaigns
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Relationship Maintenance Card */}
                <div>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab(activeTab === 'maintenance' ? '' : 'maintenance')}>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-orange-500/10 rounded-lg">
                          <Bell className="h-4 w-4 text-orange-500" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold">Maintenance</h3>
                          <p className="text-xs text-muted-foreground">Stay connected</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        Get reminders to follow up.
                      </p>
                      <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                        View Reminders
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* LinkedIn Integration Card */}
                <div>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab(activeTab === 'linkedin' ? '' : 'linkedin')}>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-700/10 rounded-lg">
                          <Linkedin className="h-4 w-4 text-blue-700" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold">LinkedIn</h3>
                          <p className="text-xs text-muted-foreground">Connect account</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        Sync your LinkedIn connections.
                      </p>
                      <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                        Connect LinkedIn
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>

          {/* Sheet Popouts for Action Cards */}
          <Sheet open={activeTab === 'discovery'} onOpenChange={(open) => !open && setActiveTab('')}>
            <SheetContent side="right" className="w-full sm:max-w-4xl lg:max-w-6xl overflow-y-auto pt-20">
              <div className="mt-6">
                <ContactDiscovery />
              </div>
            </SheetContent>
          </Sheet>

          <Sheet open={activeTab === 'campaigns'} onOpenChange={(open) => !open && setActiveTab('')}>
            <SheetContent side="right" className="w-full sm:max-w-4xl lg:max-w-6xl overflow-y-auto pt-20">
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-3">
                  <Send className="h-6 w-6 text-blue-500" />
                  Outreach Campaigns
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <CampaignList />
              </div>
            </SheetContent>
          </Sheet>

          <Sheet open={activeTab === 'maintenance'} onOpenChange={(open) => !open && setActiveTab('')}>
            <SheetContent side="right" className="w-full sm:max-w-4xl lg:max-w-6xl overflow-y-auto pt-20">
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-3">
                  <Bell className="h-6 w-6 text-orange-500" />
                  Relationship Maintenance
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <RelationshipMaintenance />
              </div>
            </SheetContent>
          </Sheet>

          <Sheet open={activeTab === 'linkedin'} onOpenChange={(open) => !open && setActiveTab('')}>
            <SheetContent side="right" className="w-full sm:max-w-4xl lg:max-w-6xl overflow-y-auto pt-20">
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-3">
                  <Linkedin className="h-6 w-6 text-blue-700" />
                  LinkedIn Integration
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <LinkedInIntegration />
              </div>
            </SheetContent>
          </Sheet>

          {/* Secondary Content - Shown for other tabs */}
          {activeTab === 'peer-groups' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UsersRound className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Peer Support Groups</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('')}>
                    Back to Hub
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedGroupId ? (
                  <GroupDetailsView
                    groupId={selectedGroupId}
                    onBack={() => setSelectedGroupId(null)}
                  />
                ) : (
                  <Tabs defaultValue="groups" className="space-y-6">
                    <TabsList className="bg-muted/50 p-1 rounded-lg">
                      <TabsTrigger value="groups" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Browse Groups</TabsTrigger>
                      <TabsTrigger value="metrics" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">My Impact</TabsTrigger>
                    </TabsList>

                    <TabsContent value="groups" className="mt-4">
                      <SupportGroupBrowser onSelectGroup={(id) => setSelectedGroupId(id)} />
                    </TabsContent>

                    <TabsContent value="metrics" className="mt-4">
                      <PeerNetworkingMetrics />
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'accountability' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Target className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Accountability Partners</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('')}>
                    Back to Hub
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <AccountabilityPartners />
              </CardContent>
            </Card>
          )}

          {activeTab === 'linkedin' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Linkedin className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">LinkedIn Integration</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('')}>
                    Back to Hub
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <LinkedInIntegration />
              </CardContent>
            </Card>
          )}

          {activeTab === 'info-interviews' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Coffee className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Informational Interviews</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('')}>
                    Back to Hub
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <InformationalInterviewManager />
              </CardContent>
            </Card>
          )}

          {activeTab === 'mentors' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Mentors</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('')}>
                    Back to Hub
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <MentorDashboard openChatId={chatRelationshipId} onChatOpened={clearChatParam} />
              </CardContent>
            </Card>
          )}

          {activeTab === 'opportunities' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Networking Events</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('')}>
                    Back to Hub
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <NetworkingOpportunities />
              </CardContent>
            </Card>
          )}

          {activeTab === 'referrals' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserCircle className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Referral Requests</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('')}>
                    Back to Hub
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ReferralRequestManager />
              </CardContent>
            </Card>
          )}

          {activeTab === 'teams' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Teams</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('')}>
                    Back to Hub
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Teams</h2>
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
                    <CardContent className="text-center py-12">
                      <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No Teams Yet</h3>
                      <p className="text-muted-foreground mb-6">
                        Create a team to collaborate with others and share resume templates
                      </p>
                      <Button onClick={() => setCreateDialogOpen(true)} size="lg">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Team
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teams.map((team) => (
                      <TeamCard key={team.id} team={team} onUpdate={fetchTeams} />
                    ))}
                  </div>
                )}
              </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
        </main>
      </div>

      <CreateTeamDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) fetchTeams();
        }}
        userId={user?.id || ''}
        onCreated={fetchTeams}
      />
      
      <ShareGoalProgressDialog 
        goals={goals || []} 
        achievements={achievements || []}
        open={shareDialogOpen} 
        onOpenChange={setShareDialogOpen} 
      />
    </>
  );
}
