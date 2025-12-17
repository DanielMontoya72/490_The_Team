import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { AppNav } from "@/components/layout/AppNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Send, GraduationCap, UsersRound, Calendar, UserCircle, Sparkles, Bell, Linkedin, Coffee, Target, Share2, TrendingUp, ChevronRight, UserPlus, Zap, Network, Heart, Building2, Plus } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { SupportGroupBrowser } from "@/components/peer/SupportGroupBrowser";
import { GroupDetailsView } from "@/components/peer/GroupDetailsView";
import { PeerNetworkingMetrics } from "@/components/peer/PeerNetworkingMetrics";
import { ReferralRequestManager } from "@/components/contacts/ReferralRequestManager";
import { ShareGoalProgressDialog } from "@/components/goals/ShareGoalProgressDialog";
import Events from "@/pages/Events";
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

  // Query for user's peer groups
  const { data: userPeerGroups } = useQuery({
    queryKey: ['user-peer-groups'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('peer_support_group_members')
        .select(`
          *,
          peer_support_groups (
            id,
            group_name,
            group_description,
            member_count
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Query for user's accountability partners
  const { data: userAccountabilityPartners } = useQuery({
    queryKey: ['user-accountability-partners'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('accountability_partners')
        .select('*')
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for partners
      const partnerIds = data.map(p => 
        p.user_id === user.id ? p.partner_id : p.user_id
      );

      if (partnerIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', partnerIds);

      return data.map(p => {
        const partnerId = p.user_id === user.id ? p.partner_id : p.user_id;
        const profile = profiles?.find(pr => pr.user_id === partnerId);
        return {
          ...p,
          partner_name: profile 
            ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email
            : 'Unknown Partner',
          partner_initials: profile?.first_name && profile?.last_name 
            ? `${profile.first_name[0]}${profile.last_name[0]}` 
            : profile?.email?.[0]?.toUpperCase() || 'U'
        };
      });
    },
    enabled: !!user
  });

  // Check for chat parameter to open chat directly
  const chatRelationshipId = searchParams.get('chat');
  const tabParam = searchParams.get('tab');

  // If there's a chat param, switch to mentors tab
  // If linkedin_connected, switch to linkedin tab
  // If tab param, switch to that tab
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
    if (tabParam) {
      setActiveTab(tabParam);
      // Clear the tab param after handling
      searchParams.delete('tab');
      setSearchParams(searchParams);
    }
  }, [chatRelationshipId, searchParams, tabParam]);

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
      {/* Skip Links for Screen Readers */}
      <div className="sr-only focus-within:not-sr-only">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:p-4 focus:underline focus:outline-none focus:ring-2 focus:ring-primary-foreground"
          tabIndex={0}
        >
          Skip to main content
        </a>
        <a
          href="#networking-nav"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-20 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:p-4 focus:underline focus:outline-none focus:ring-2 focus:ring-primary-foreground"
          tabIndex={0}
        >
          Skip to networking navigation
        </a>
        <a
          href="#networking-tabs"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-40 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:p-4 focus:underline focus:outline-none focus:ring-2 focus:ring-primary-foreground"
          tabIndex={0}
        >
          Skip to networking tabs
        </a>
      </div>
      
      <AppNav />
      
      <div className="flex min-h-screen bg-background pt-16 lg:pt-16">
        {/* Networking Quick Actions Sidebar - Mobile Dropdown */}
        <aside className="lg:hidden fixed left-0 top-16 right-0 bg-background/80 backdrop-blur-xl border-b border-yellow-400 z-40 shadow-lg">
          <details className="group">
            <summary className="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-white/10 transition-all duration-200 min-h-[56px]">
              <div className="flex items-center gap-3">
                <Network className="h-5 w-5 text-primary flex-shrink-0 drop-shadow-sm" />
                <h3 className="font-bold text-lg text-white drop-shadow-sm">Quick Actions</h3>
              </div>
              <svg className="h-5 w-5 transition-transform group-open:rotate-180 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-4 pb-4 space-y-1 border-t border-white/10 bg-background/60 backdrop-blur-xl">
              <button
                onClick={() => setActiveTab('contacts')}
                className="w-full flex items-center gap-3 px-3 py-4 rounded-lg hover:bg-white/10 transition-all duration-200 group min-h-[52px] backdrop-blur-sm"
              >
                <Users className="h-5 w-5 text-white transition-colors flex-shrink-0 drop-shadow-sm" />
                <span className="text-base font-medium text-white group-hover:text-primary transition-colors truncate text-left drop-shadow-sm">My Contacts</span>
              </button>
              <Link
                to="/enterprise"
                className="w-full flex items-center gap-3 px-3 py-4 rounded-lg hover:bg-muted/50 transition-colors group min-h-[52px]"
              >
                <Building2 className="h-5 w-5 text-white transition-colors flex-shrink-0" />
                <span className="text-base font-medium text-white group-hover:text-primary transition-colors truncate text-left">Enterprise</span>
              </Link>
              <Link
                to="/references-and-referrals"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <UserPlus className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">References & Referrals</span>
              </Link>
              <button
                onClick={() => setActiveTab('events')}
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Calendar className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Events</span>
              </button>
              <button
                onClick={() => setActiveTab('discovery')}
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Sparkles className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Discover</span>
              </button>
              <button
                onClick={() => setActiveTab('campaigns')}
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Send className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Campaigns</span>
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Bell className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Maintenance</span>
              </button>
              <button
                onClick={() => setActiveTab('linkedin')}
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Linkedin className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">LinkedIn</span>
              </button>
              <button
                onClick={() => setActiveTab('info-interviews')}
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Coffee className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Interviews</span>
              </button>
              <Link 
                to="/external-advisors"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Target className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Advisors</span>
              </Link>
              <button
                onClick={() => setActiveTab('peer-groups')}
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <UsersRound className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Community</span>
              </button>
              <Link 
                to="/external-advisors"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Target className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Advisors</span>
              </Link>
            </div>
          </details>
        </aside>

        {/* Networking Quick Actions Sidebar - Desktop */}
        <aside id="networking-nav" className="hidden lg:block w-64 xl:w-72 bg-background/80 backdrop-blur-xl border-r border-yellow-400 overflow-y-auto flex-shrink-0 shadow-lg">
          <div className="p-4 sticky top-16">
            <div className="flex items-center gap-3 mb-4">
              <Network className="h-5 w-5 text-primary flex-shrink-0 drop-shadow-sm" />
              <h3 className="font-bold text-lg text-white drop-shadow-sm">Quick Actions</h3>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('contacts')}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/10 transition-all duration-200 group min-h-[44px] backdrop-blur-sm"
              >
                <Users className="h-5 w-5 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left drop-shadow-sm">My Contacts</span>
              </button>
              <Link
                to="/enterprise"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Building2 className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Enterprise</span>
              </Link>
              <Link
                to="/references-and-referrals"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <UserPlus className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">References & Referrals</span>
              </Link>
              <button
                onClick={() => setActiveTab('events')}
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Calendar className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Events</span>
              </button>
              <button
                onClick={() => setActiveTab('discovery')}
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Sparkles className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Find Contacts</span>
              </button>
              <button
                onClick={() => setActiveTab('campaigns')}
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Send className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Campaigns</span>
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Bell className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Maintenance</span>
              </button>
              <button
                onClick={() => setActiveTab('linkedin')}
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Linkedin className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">LinkedIn</span>
              </button>
              <button
                onClick={() => setActiveTab('info-interviews')}
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Coffee className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Info Interviews</span>
              </button>
              
              {/* Divider */}
              <div className="mx-2.5 border-t border-white/20"></div>
              
              <button
                onClick={() => setActiveTab('teams')}
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Users className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Teams Hub</span>
              </button>
              <button
                onClick={() => setActiveTab('peer-groups')}
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <UsersRound className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Community</span>
              </button>
              <Link 
                to="/external-advisors"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Target className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Advisors</span>
              </Link>
            </div>
          </div>
        </aside>
        
        {/* Main Content Area */}
        <main id="main-content" className="flex-1 w-full min-w-0 overflow-x-hidden" tabIndex={-1}>
          <div className="w-full px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 lg:pt-24 pb-6 lg:pb-8 max-w-[1600px] mx-auto">
            <div className="w-full max-w-[1920px] mx-auto">
          {/* Header */}
          {!activeTab || activeTab === 'maintenance' || activeTab === 'linkedin' || activeTab === 'contacts' ? (
            <div className="mb-6 lg:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Contact Hub</h1>
                </div>
                <Button onClick={() => setShareDialogOpen(true)} size="default" className="w-full sm:w-auto">
                  <Share2 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Share Progress</span>
                  <span className="sm:hidden">Share</span>
                </Button>
              </div>
              <p className="text-muted-foreground text-base lg:text-lg">
                Your central hub for managing professional relationships and growing your network
              </p>
            </div>
          ) : null}

          {/* Action Content Above Grid for non-sheet actions */}
          {(activeTab === 'peer-groups' || activeTab === 'info-interviews' || activeTab === 'opportunities' || activeTab === 'referrals' || activeTab === 'teams' ||
            activeTab === 'discovery' || activeTab === 'campaigns') && (
            <div className="mb-6">
              {activeTab === 'discovery' && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-6 w-6 text-primary" />
                        <h2 className="text-2xl font-bold">Discover Contacts</h2>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab('')}>
                        Back to Hub
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ContactDiscovery />
                  </CardContent>
                </Card>
              )}

              {activeTab === 'campaigns' && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Send className="h-6 w-6 text-primary" />
                        <h2 className="text-2xl font-bold">Outreach Campaigns</h2>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab('')}>
                        Back to Hub
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CampaignList />
                  </CardContent>
                </Card>
              )}

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
                          <TabsTrigger value="family" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Family Support</TabsTrigger>
                          <TabsTrigger value="metrics" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">My Impact</TabsTrigger>
                        </TabsList>

                        <TabsContent value="groups" className="mt-4">
                          <SupportGroupBrowser onSelectGroup={(id) => setSelectedGroupId(id)} />
                        </TabsContent>

                        <TabsContent value="family" className="mt-4">
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <Heart className="h-5 w-5 text-primary" />
                                Family Support Network
                              </CardTitle>
                              <CardDescription>
                                Connect with family members and get support during your job search journey
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid gap-4">
                                <div className="p-4 border rounded-lg">
                                  <h4 className="font-medium mb-2">Share Your Progress</h4>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    Keep family members updated on your job search milestones and achievements
                                  </p>
                                  <Button variant="outline" size="sm">
                                    Share Update
                                  </Button>
                                </div>
                                
                                <div className="p-4 border rounded-lg">
                                  <h4 className="font-medium mb-2">Family Check-ins</h4>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    Schedule regular check-ins with family members for emotional support
                                  </p>
                                  <Button variant="outline" size="sm">
                                    Schedule Check-in
                                  </Button>
                                </div>
                                
                                <div className="p-4 border rounded-lg">
                                  <h4 className="font-medium mb-2">Resource Sharing</h4>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    Share job opportunities and resources with family network
                                  </p>
                                  <Button variant="outline" size="sm">
                                    Share Resource
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="metrics" className="mt-4">
                          <PeerNetworkingMetrics />
                        </TabsContent>
                      </Tabs>
                    )}
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
                        <div>
                          <h2 className="text-2xl font-bold">Teams Hub</h2>
                          <p className="text-sm text-muted-foreground">Build meaningful professional relationships and grow together</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab('')}>
                        Back to Hub
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Quick Stats Overview */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
                      <Card className="p-3 lg:p-4">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-3">
                          <div className="p-1.5 lg:p-2 bg-blue-500/10 rounded-lg">
                            <GraduationCap className="h-4 w-4 lg:h-5 lg:w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-xs lg:text-sm text-muted-foreground">Active Mentors</p>
                            <p className="text-lg lg:text-xl font-bold">3</p>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-3 lg:p-4">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-3">
                          <div className="p-1.5 lg:p-2 bg-green-500/10 rounded-lg">
                            <UsersRound className="h-4 w-4 lg:h-5 lg:w-5 text-green-500" />
                          </div>
                          <div>
                            <p className="text-xs lg:text-sm text-muted-foreground">Peer Groups</p>
                            <p className="text-lg lg:text-xl font-bold">2</p>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-3 lg:p-4">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-3">
                          <div className="p-1.5 lg:p-2 bg-orange-500/10 rounded-lg">
                            <Target className="h-4 w-4 lg:h-5 lg:w-5 text-orange-500" />
                          </div>
                          <div>
                            <p className="text-xs lg:text-sm text-muted-foreground">Advisors</p>
                            <p className="text-lg lg:text-xl font-bold">1</p>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-3 lg:p-4">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-3">
                          <div className="p-1.5 lg:p-2 bg-purple-500/10 rounded-lg">
                            <Users className="h-4 w-4 lg:h-5 lg:w-5 text-purple-500" />
                          </div>
                          <div>
                            <p className="text-xs lg:text-sm text-muted-foreground">Team Projects</p>
                            <p className="text-lg lg:text-xl font-bold">{teams.length}</p>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Main Action Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                      {/* Teams & Mentors Combined Section */}
                      <div className="lg:col-span-2">
                        <Card className="hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-3 lg:pb-4 px-4 lg:px-6">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                              <div className="p-2 lg:p-3 bg-blue-500/10 rounded-xl">
                                <Users className="h-5 w-5 lg:h-6 lg:w-6 text-blue-500" />
                              </div>
                              <div>
                                <h3 className="text-lg lg:text-xl font-bold">Teams & Mentors</h3>
                                <p className="text-sm text-muted-foreground">Collaborate and get guidance in one unified space</p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <Tabs defaultValue="mentors" className="space-y-4">
                              <TabsList className="bg-muted/50 p-1 rounded-lg w-full">
                                <TabsTrigger value="mentors" className="flex-1">Mentors</TabsTrigger>
                                <TabsTrigger value="teams" className="flex-1">Teams</TabsTrigger>
                              </TabsList>
                              <TabsContent value="mentors">
                                <MentorDashboard openChatId={chatRelationshipId} onChatOpened={clearChatParam} />
                              </TabsContent>
                              <TabsContent value="teams">
                                <div className="space-y-6">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h3 className="text-xl font-bold">Collaboration Teams</h3>
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
                                      <CardContent className="text-center py-8 lg:py-12 px-4">
                                        <Users className="h-12 w-12 lg:h-16 lg:w-16 mx-auto text-muted-foreground mb-3 lg:mb-4" />
                                        <h3 className="text-lg lg:text-xl font-semibold mb-2">No Teams Yet</h3>
                                        <p className="text-sm lg:text-base text-muted-foreground mb-4 lg:mb-6">
                                          Create a team to collaborate with others and share resume templates
                                        </p>
                                        <Button onClick={() => setCreateDialogOpen(true)} size="default" className="w-full lg:w-auto">
                                          <Plus className="h-4 w-4 mr-2" />
                                          Create Your First Team
                                        </Button>
                                      </CardContent>
                                    </Card>
                                  ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
                                      {teams.map((team) => (
                                        <TeamCard key={team.id} team={team} onUpdate={fetchTeams} />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </TabsContent>
                            </Tabs>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Build Community Card */}
                      <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3 lg:pb-4 px-4 lg:px-6">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                            <div className="p-2 lg:p-3 bg-green-500/10 rounded-xl">
                              <UsersRound className="h-5 w-5 lg:h-6 lg:w-6 text-green-500" />
                            </div>
                            <div>
                              <h3 className="text-base lg:text-lg font-bold">Build Community</h3>
                              <p className="text-xs lg:text-sm text-muted-foreground">Join peer groups and support networks</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 lg:px-6">
                          <p className="text-xs lg:text-sm text-muted-foreground mb-3 lg:mb-4">
                            Connect with peers facing similar challenges and share experiences
                          </p>
                          <div className="space-y-3">
                            {userPeerGroups && userPeerGroups.length > 0 ? (
                              userPeerGroups.slice(0, 2).map((membership, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                      {membership.peer_support_groups?.group_name?.substring(0, 2).toUpperCase() || 'PG'}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">{membership.peer_support_groups?.group_name || 'Unnamed Group'}</p>
                                      <p className="text-xs text-muted-foreground">{membership.peer_support_groups?.member_count || 0} members</p>
                                    </div>
                                  </div>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Member</span>
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center justify-center p-6 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30">
                                <div className="text-center">
                                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                  <p className="text-sm text-muted-foreground">No peer groups yet</p>
                                  <p className="text-xs text-muted-foreground">Join groups to connect with peers</p>
                                </div>
                              </div>
                            )}
                            <Button variant="outline" className="w-full" onClick={() => setActiveTab('peer-groups')}>
                              {userPeerGroups && userPeerGroups.length > 0 ? 'View My Groups' : 'Browse Groups'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Stay Accountable Card */}
                      <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3 lg:pb-4 px-4 lg:px-6">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                            <div className="p-2 lg:p-3 bg-orange-500/10 rounded-xl">
                              <Target className="h-5 w-5 lg:h-6 lg:w-6 text-orange-500" />
                            </div>
                            <div>
                              <h3 className="text-base lg:text-lg font-bold">Your Advisors</h3>
                              <p className="text-xs lg:text-sm text-muted-foreground">Get guidance from trusted advisors</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 lg:px-6">
                          <p className="text-xs lg:text-sm text-muted-foreground mb-3 lg:mb-4">
                            Connect with advisors and mentors to get guidance on your career goals
                          </p>
                          <div className="space-y-3">
                            {userAccountabilityPartners && userAccountabilityPartners.length > 0 ? (
                              userAccountabilityPartners.slice(0, 2).map((partnership, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                      {partnership.partner_initials}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">{partnership.partner_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {partnership.check_in_frequency === 'weekly' ? 'Weekly check-ins' : 
                                         partnership.check_in_frequency === 'bi_weekly' ? 'Bi-weekly check-ins' :
                                         partnership.check_in_frequency === 'monthly' ? 'Monthly check-ins' :
                                         'Regular check-ins'}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Active</span>
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center justify-center p-6 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30">
                                <div className="text-center">
                                  <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                  <p className="text-sm text-muted-foreground">No advisors yet</p>
                                  <p className="text-xs text-muted-foreground">Connect with advisors for guidance</p>
                                </div>
                              </div>
                            )}
                            <Button variant="outline" className="w-full" asChild>
                              <Link to="/external-advisors">
                                {userAccountabilityPartners && userAccountabilityPartners.length > 0 ? 'Manage Advisors' : 'Find Advisors'}
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Main Layout: Contacts + Action Cards - Only show when no active tab or sheet-based tabs */}
          {(!activeTab || activeTab === 'maintenance' || activeTab === 'linkedin' || activeTab === 'contacts') && (
            <div id="networking-tabs" className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Left Area - Contacts */}
              <div className="lg:col-span-1 w-full min-w-0 h-auto lg:h-[calc(100vh-var(--nav-height,4.5rem)-10rem)] min-h-[50vh] lg:min-h-[60vh] order-2 lg:order-1">
                <div className="w-full h-auto lg:h-full lg:overflow-y-auto p-4 pb-8">
                  <ProfessionalContactsManager />
                </div>
              </div>

              {/* Right Content Area - Action Cards */}
              <div className="lg:col-span-1 w-full min-w-0 space-y-3 lg:space-y-4 order-1 lg:order-2">
                {/* Quick Action Cards Grid */}
                <div className="w-full space-y-3 lg:space-y-4">
                  {/* LinkedIn Integration Card */}
                  <Card className="w-full hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98]" onClick={() => setActiveTab(activeTab === 'linkedin' ? '' : 'linkedin')}>
                      <CardHeader className="pb-3 pt-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-700/10 rounded-lg">
                            <Linkedin className="h-5 w-5 text-blue-700" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold">LinkedIn</h3>
                            <p className="text-sm text-muted-foreground">Connect account</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <p className="text-sm text-muted-foreground mb-3">
                          Sync your LinkedIn connections.
                        </p>
                        <Button variant="outline" size="default" className="w-full h-10 text-sm">
                          Connect LinkedIn
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>

                  {/* Relationship Maintenance Card */}
                  <Card className="w-full hover:shadow-lg transition-all duration-200 active:scale-[0.98]">
                    <CardHeader className="pb-3 pt-4 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2 bg-orange-500/10 rounded-lg flex-shrink-0">
                              <Bell className="h-5 w-5 text-orange-500" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-bold">Maintenance</h3>
                              <p className="text-sm text-muted-foreground">Stay connected</p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setActiveTab(activeTab === 'maintenance' ? '' : 'maintenance')}
                            className="h-6 w-6 p-0"
                          >
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        <div className="space-y-2">
                          <div 
                            className="flex items-center p-3 bg-muted/50 rounded text-sm cursor-pointer hover:bg-muted transition-colors"
                            onClick={() => setActiveTab('maintenance')}
                          >
                            <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mr-3"></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium text-sm">Follow up with Sarah Chen</span>
                                <span className="text-muted-foreground text-xs whitespace-nowrap flex-shrink-0">Due today</span>
                              </div>
                            </div>
                          </div>
                          <div 
                            className="flex items-center p-3 bg-muted/50 rounded text-sm cursor-pointer hover:bg-muted transition-colors"
                            onClick={() => setActiveTab('maintenance')}
                          >
                            <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mr-3"></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium text-sm">Check in with Marcus Rodriguez</span>
                                <span className="text-muted-foreground text-xs whitespace-nowrap flex-shrink-0">Dec 15</span>
                              </div>
                            </div>
                          </div>
                          <div 
                            className="flex items-center p-3 bg-muted/50 rounded text-sm cursor-pointer hover:bg-muted transition-colors"
                            onClick={() => setActiveTab('maintenance')}
                          >
                            <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0 mr-3"></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium text-sm">Thank Emma Thompson for referral</span>
                                <span className="text-muted-foreground text-xs whitespace-nowrap flex-shrink-0">Dec 16</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t">
                          <Button 
                            variant="outline" 
                            size="default" 
                            className="w-full h-10 text-sm"
                            onClick={() => setActiveTab('maintenance')}
                          >
                            View All Reminders
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                  {/* Events Card */}
                  <Card className="w-full hover:shadow-lg transition-all duration-200 active:scale-[0.98]">
                    <CardHeader className="pb-3 pt-4 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-purple-500/10 rounded-lg flex-shrink-0">
                            <Calendar className="h-5 w-5 text-purple-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold truncate">Events</h3>
                            <p className="text-sm text-muted-foreground truncate">Upcoming networking</p>
                          </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            asChild
                            className="h-8 w-8 p-0 flex-shrink-0"
                          >
                            <Link to="/events">
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <p className="text-sm text-muted-foreground mb-3 break-words">
                          Stay on top of networking opportunities.
                        </p>
                        <div className="w-full min-w-0 space-y-2">
                          <div 
                            className="flex items-center p-3 bg-muted/50 rounded text-sm cursor-pointer hover:bg-muted transition-colors"
                          >
                            <Link to="/events" className="flex items-center w-full">
                              <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mr-3"></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-medium text-sm">React Developer Meetup</span>
                                  <span className="text-muted-foreground text-xs whitespace-nowrap flex-shrink-0">Dec 14</span>
                                </div>
                              </div>
                            </Link>
                          </div>
                          <div 
                            className="flex items-center p-3 bg-muted/50 rounded text-sm cursor-pointer hover:bg-muted transition-colors"
                          >
                            <Link to="/events" className="flex items-center w-full">
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mr-3"></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-medium text-sm">Tech Career Fair 2025</span>
                                  <span className="text-muted-foreground text-xs whitespace-nowrap flex-shrink-0">Dec 20</span>
                                </div>
                              </div>
                            </Link>
                          </div>
                          <div 
                            className="flex items-center p-3 bg-muted/50 rounded text-sm cursor-pointer hover:bg-muted transition-colors"
                          >
                            <Link to="/events" className="flex items-center w-full">
                              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mr-3"></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-medium text-sm">AI & ML Summit 2025</span>
                                  <span className="text-muted-foreground text-xs whitespace-nowrap flex-shrink-0">Jan 3</span>
                                </div>
                              </div>
                            </Link>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t">
                          <Button 
                            variant="outline" 
                            size="default" 
                            className="w-full h-10 text-sm"
                            asChild
                          >
                            <Link to="/events">
                              View All Events
                              <ChevronRight className="h-3 w-3 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                </div>
              </div>
            </div>
          )}

          {/* Dialog Popout for Maintenance */}
          <Dialog open={activeTab === 'maintenance'} onOpenChange={(open) => !open && setActiveTab('')}>
            <DialogContent className="w-[95vw] max-w-6xl h-[90vh] max-h-[90vh] overflow-hidden p-0">
              <DialogHeader className="flex flex-row items-center justify-between p-4 border-b bg-background">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-500" />
                  <DialogTitle className="text-lg font-semibold">Relationship Maintenance</DialogTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setActiveTab('')}
                  className="h-8 w-8 md:hidden"
                >
                  <span className="text-lg font-bold">×</span>
                </Button>
              </DialogHeader>
              <div className="p-6 overflow-y-auto h-full">
                <RelationshipMaintenance />
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog Popout for LinkedIn */}
          <Dialog open={activeTab === 'linkedin'} onOpenChange={(open) => !open && setActiveTab('')}>
            <DialogContent className="w-[95vw] max-w-6xl h-[90vh] max-h-[90vh] overflow-hidden p-0">
              <DialogHeader className="flex flex-row items-center justify-between p-4 border-b bg-background">
                <div className="flex items-center gap-2">
                  <Linkedin className="h-5 w-5 text-blue-700" />
                  <DialogTitle className="text-lg font-semibold">LinkedIn Integration</DialogTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setActiveTab('')}
                  className="h-8 w-8 md:hidden"
                >
                  <span className="text-lg font-bold">×</span>
                </Button>
              </DialogHeader>
              <div className="p-6 overflow-y-auto h-full">
                <LinkedInIntegration />
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog Popout for Events */}
          <Dialog open={activeTab === 'events'} onOpenChange={(open) => !open && setActiveTab('')}>
            <DialogContent className="w-[95vw] max-w-6xl h-[90vh] max-h-[90vh] overflow-hidden p-0">
              <DialogHeader className="flex flex-row items-center justify-between p-4 border-b bg-background">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-500" />
                  <DialogTitle className="text-lg font-semibold">Networking Events</DialogTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setActiveTab('')}
                  className="h-8 w-8 md:hidden"
                >
                  <span className="text-lg font-bold">×</span>
                </Button>
              </DialogHeader>
              <div className="p-6 overflow-y-auto h-full">
                <NetworkingOpportunities />
              </div>
            </DialogContent>
          </Dialog>
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
