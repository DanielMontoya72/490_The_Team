import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MentorInviteDialog } from "./MentorInviteDialog";
import { MentorFeedbackList } from "./MentorFeedbackList";
import { MentorProgressReports } from "./MentorProgressReports";
import { MentorCommunication } from "./MentorCommunication";
import { InvitationChat } from "./InvitationChat";
import { GiveFeedbackDialog } from "./GiveFeedbackDialog";
import { MenteeEngagementMonitor } from "./MenteeEngagementMonitor";
import { CoachingInsightsGenerator } from "./CoachingInsightsGenerator";
import { AccountabilityTracker } from "./AccountabilityTracker";
import { MenteeProgressView } from "./MenteeProgressView";
import { MenteeNameDisplay } from "./MenteeNameDisplay";
import { useUserProfile } from "@/hooks/useUserProfile";
import { RelationshipCard } from "./RelationshipCard";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Users, MessageSquare, TrendingUp, Trash2, Check, Settings, FileText } from "lucide-react";
import { CollaborativeReviewDashboard } from "@/components/review/CollaborativeReviewDashboard";

interface MentorDashboardProps {
  openChatId?: string | null;
  onChatOpened?: () => void;
}

export function MentorDashboard({ openChatId, onChatOpened }: MentorDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<string | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<{id: string; mentor_name: string | null; mentor_email: string} | null>(null);

  // Auto-open chat if openChatId is provided
  useEffect(() => {
    if (openChatId) {
      setSelectedRelationship(openChatId);
      onChatOpened?.();
    }
  }, [openChatId, onChatOpened]);

  // Check for accepted invitations and create relationships on login
  useEffect(() => {
    const createPendingRelationships = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      // Find accepted invitations for this mentor's email that don't have relationships yet
      const { data: acceptedInvitations } = await supabase
        .from('mentor_invitations')
        .select('*')
        .eq('mentor_email', user.email)
        .eq('status', 'accepted');

      if (!acceptedInvitations || acceptedInvitations.length === 0) return;

      for (const invitation of acceptedInvitations) {
        // Check if relationship already exists
        const { data: existingRelationship } = await supabase
          .from('mentor_relationships')
          .select('id')
          .eq('mentor_id', user.id)
          .eq('mentee_id', invitation.user_id)
          .single();

        if (!existingRelationship) {
          // Create the relationship
          const { error } = await supabase
            .from('mentor_relationships')
            .insert({
              mentee_id: invitation.user_id,
              mentor_id: user.id,
              status: 'active',
              relationship_type: 'mentor',
              permissions: {
                can_view_profile: true,
                can_view_jobs: true,
                can_view_resumes: true,
                can_provide_feedback: true,
              },
            });

          if (!error) {
            console.log('Created mentor relationship for invitation:', invitation.id);
            queryClient.invalidateQueries({ queryKey: ['mentee-relationships'] });
            queryClient.invalidateQueries({ queryKey: ['mentor-relationships'] });
          }
        }
      }
    };

    createPendingRelationships();
  }, [queryClient]);

  // Real-time subscription for relationship changes
  useEffect(() => {
    const channel = supabase
      .channel('mentor-relationships-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mentor_relationships'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['mentor-relationships'] });
          queryClient.invalidateQueries({ queryKey: ['mentee-relationships'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Real-time subscription for invitation changes
  useEffect(() => {
    const channel = supabase
      .channel('mentor-invitations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mentor_invitations'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['mentor-invitations'] });
          queryClient.invalidateQueries({ queryKey: ['received-mentor-invitations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: relationships, isLoading: loadingRelationships } = useQuery({
    queryKey: ['mentor-relationships'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('mentor_relationships')
        .select('*')
        .eq('mentee_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      
      // Fetch mentor emails to help with deduplication
      if (data && data.length > 0) {
        const mentorIds = data.map(r => r.mentor_id);
        const { data: mentorProfiles } = await supabase
          .from('user_profiles')
          .select('user_id, email')
          .in('user_id', mentorIds);
        
        // Attach mentor email to each relationship
        return data.map(relationship => ({
          ...relationship,
          mentor_email: mentorProfiles?.find(p => p.user_id === relationship.mentor_id)?.email
        }));
      }
      
      return data;
    }
  });

  const { data: menteeRelationships, isLoading: loadingMentees } = useQuery({
    queryKey: ['mentee-relationships'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('mentor_relationships')
        .select('*')
        .eq('mentor_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      return data;
    }
  });

  const { data: invitations, isLoading: loadingInvitations } = useQuery({
    queryKey: ['mentor-invitations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('mentor_invitations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const { data: receivedInvitations, isLoading: loadingReceivedInvitations } = useQuery({
    queryKey: ['received-mentor-invitations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('mentor_invitations')
        .select('*')
        .eq('mentor_email', user.email)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch sender (mentee) profiles to show who sent each invitation
      if (data && data.length > 0) {
        const senderIds = data.map(inv => inv.user_id);
        const { data: senderProfiles } = await supabase
          .from('user_profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', senderIds);
        
        return data.map(invitation => ({
          ...invitation,
          sender_name: senderProfiles?.find(p => p.user_id === invitation.user_id)
            ? `${senderProfiles.find(p => p.user_id === invitation.user_id)?.first_name} ${senderProfiles.find(p => p.user_id === invitation.user_id)?.last_name}`
            : 'Unknown'
        }));
      }
      
      return data;
    }
  });

  const removeRelationship = useMutation({
    mutationFn: async (relationshipId: string) => {
      const { error } = await supabase
        .from('mentor_relationships')
        .delete()
        .eq('id', relationshipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-relationships'] });
      queryClient.invalidateQueries({ queryKey: ['mentee-relationships'] });
      toast({
        title: "Relationship removed",
        description: "The mentor relationship has been removed."
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove relationship",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('mentor_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['received-mentor-invitations'] });
      toast({
        title: "Invitation deleted",
        description: "The invitation has been removed."
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete invitation",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const acceptInvitation = useMutation({
    mutationFn: async (invitation: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if already accepted
      if (invitation.status === "accepted") {
        throw new Error("This invitation has already been accepted");
      }

      // Check if expired
      const expiresAt = new Date(invitation.expires_at);
      if (expiresAt < new Date()) {
        throw new Error("This invitation has expired");
      }

      // Check if the logged-in user's email matches the invitation
      if (user.email !== invitation.mentor_email) {
        throw new Error(`This invitation was sent to ${invitation.mentor_email}. Please log in with that email.`);
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from("mentor_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);

      if (updateError) throw updateError;

      // Create mentor relationship
      const { error: relationshipError } = await supabase
        .from("mentor_relationships")
        .insert({
          mentee_id: invitation.user_id,
          mentor_id: user.id,
          status: "active",
          relationship_type: "mentor",
          permissions: {
            can_view_profile: true,
            can_view_jobs: true,
            can_view_resumes: true,
            can_provide_feedback: true,
          },
        });

      if (relationshipError) throw relationshipError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['received-mentor-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['mentor-relationships'] });
      queryClient.invalidateQueries({ queryKey: ['mentee-relationships'] });
      toast({
        title: "Invitation accepted",
        description: "You have successfully accepted the mentor invitation!"
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to accept invitation",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (loadingRelationships || loadingInvitations || loadingReceivedInvitations || loadingMentees) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mentors & Career Coaches</h1>
          <p className="text-muted-foreground mt-1">
            Collaborate with mentors to get guidance on your job search
          </p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Mentor
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Mentors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                // Count relationships
                const relationshipCount = relationships?.length || 0;
                // Count accepted invitations that don't have a relationship yet
                const acceptedWithoutRelationship = invitations?.filter(i => {
                  if (i.status !== 'accepted') return false;
                  const hasRelationship = relationships?.some(r => 
                    (r as any).mentor_email?.toLowerCase() === i.mentor_email.toLowerCase()
                  );
                  return !hasRelationship;
                }).length || 0;
                return relationshipCount + acceptedWithoutRelationship;
              })()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Mentees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{menteeRelationships?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invitations?.filter(i => i.status === 'pending').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="mentors" className="space-y-4">
        <TabsList className="w-full h-14 grid grid-cols-6 gap-2 bg-transparent p-0 border-b-2 border-primary/20">
          <TabsTrigger 
            value="mentors" 
            className="h-full text-base font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none"
          >
            My Mentors
          </TabsTrigger>
          <TabsTrigger 
            value="mentees" 
            className="h-full text-base font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none"
          >
            My Mentees
          </TabsTrigger>
          <TabsTrigger 
            value="invitations" 
            className="h-full text-base font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none"
          >
            Invitations
          </TabsTrigger>
          <TabsTrigger 
            value="feedback" 
            className="h-full text-base font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none"
          >
            Feedback
          </TabsTrigger>
          <TabsTrigger 
            value="progress" 
            className="h-full text-base font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none"
          >
            Progress Reports
          </TabsTrigger>
          <TabsTrigger 
            value="reviews" 
            className="h-full text-base font-semibold data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none"
          >
            <FileText className="h-4 w-4 mr-2" />
            Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mentors" className="space-y-4">
          {/* Show accepted invitations only if mentor hasn't created account yet (no relationship exists) */}
          {invitations?.filter(i => {
            // Only show accepted invitations that don't have a corresponding relationship
            if (i.status !== 'accepted') return false;
            // Check if a relationship already exists for this mentor's email
            const hasRelationship = relationships?.some(r => 
              (r as any).mentor_email?.toLowerCase() === i.mentor_email.toLowerCase()
            );
            return !hasRelationship;
          }).map((invitation) => (
            <Card key={`inv-${invitation.id}`} className="mb-3 border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {invitation.mentor_name || invitation.mentor_email}
                      <Badge variant="default" className="bg-green-600">
                        Accepted
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Accepted on {invitation.accepted_at ? new Date(invitation.accepted_at).toLocaleDateString() : 'N/A'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      title="Available when mentor creates an account"
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Share Settings
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setSelectedInvitation({
                        id: invitation.id,
                        mentor_name: invitation.mentor_name,
                        mentor_email: invitation.mentor_email
                      })}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteInvitation.mutate(invitation.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {invitation.mentor_email} has accepted your invitation to be your mentor!
                </p>
              </CardContent>
            </Card>
          ))}
          
          {/* Show active mentor relationships */}
          {relationships && relationships.length > 0 && (
            relationships.map((relationship) => (
              <RelationshipCard
                key={relationship.id}
                relationship={relationship}
                isMentor={false}
                onMessage={setSelectedRelationship}
                onRemove={(id) => removeRelationship.mutate(id)}
              />
            ))
          )}
          
          {/* Show empty state only if no accepted invitations without relationships AND no relationships */}
          {(() => {
            const acceptedWithoutRelationship = invitations?.filter(i => {
              if (i.status !== 'accepted') return false;
              const hasRelationship = relationships?.some(r => 
                (r as any).mentor_email?.toLowerCase() === i.mentor_email.toLowerCase()
              );
              return !hasRelationship;
            }).length || 0;
            return acceptedWithoutRelationship === 0 && !relationships?.length;
          })() && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No active mentor relationships. Invite a mentor to get started!
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="mentees" className="space-y-4">
          {menteeRelationships && menteeRelationships.length > 0 ? (
            menteeRelationships.map((relationship) => (
              <Card key={relationship.id} className="mb-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>
                          {/* Show mentee name from profile */}
                          <MenteeNameDisplay menteeId={relationship.mentee_id} />
                        </CardTitle>
                        <CardDescription>
                          Started {new Date(relationship.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedRelationship(relationship.id)}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Message
                        </Button>
                        <GiveFeedbackDialog menteeId={relationship.mentee_id} relationshipId={relationship.id} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="grid w-full grid-cols-5 bg-transparent border-b-2 border-primary/20">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none">
                          Overview
                        </TabsTrigger>
                        <TabsTrigger value="engagement" className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none">
                          Engagement
                        </TabsTrigger>
                        <TabsTrigger value="insights" className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none">
                          AI Insights
                        </TabsTrigger>
                        <TabsTrigger value="accountability" className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none">
                          Milestones
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none">
                          <Settings className="h-4 w-4" />
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="space-y-4 mt-4">
                        <MenteeProgressView menteeId={relationship.mentee_id} relationshipId={relationship.id} />
                      </TabsContent>

                      <TabsContent value="engagement" className="space-y-4 mt-4">
                        <MenteeEngagementMonitor menteeId={relationship.mentee_id} />
                      </TabsContent>

                      <TabsContent value="insights" className="space-y-4 mt-4">
                        <CoachingInsightsGenerator menteeId={relationship.mentee_id} relationshipId={relationship.id} />
                      </TabsContent>

                      <TabsContent value="accountability" className="space-y-4 mt-4">
                        <AccountabilityTracker menteeId={relationship.mentee_id} relationshipId={relationship.id} />
                      </TabsContent>

                      <TabsContent value="settings" className="space-y-4 mt-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Relationship Settings</CardTitle>
                            <CardDescription>Manage your mentoring relationship</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div>
                                <p className="font-medium">Relationship Type</p>
                                <p className="text-sm text-muted-foreground">{relationship.relationship_type}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div>
                                <p className="font-medium">Status</p>
                                <p className="text-sm text-muted-foreground">{relationship.status}</p>
                              </div>
                            </div>
                            <Button
                              variant="destructive"
                              onClick={() => removeRelationship.mutate(relationship.id)}
                              className="w-full"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              End Mentoring Relationship
                            </Button>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No mentees yet. When someone invites you as their mentor, they'll appear here.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Sent Invitations</h3>
              {invitations && invitations.length > 0 ? (
                invitations.map((invitation) => (
                  <Card key={invitation.id} className="mb-3">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{invitation.mentor_name || invitation.mentor_email}</CardTitle>
                          <CardDescription>
                            Sent {new Date(invitation.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Badge
                            variant={
                              invitation.status === 'accepted' ? 'default' :
                              invitation.status === 'pending' ? 'secondary' :
                              'destructive'
                            }
                          >
                            {invitation.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteInvitation.mutate(invitation.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {invitation.message && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{invitation.message}</p>
                      </CardContent>
                    )}
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No invitations sent yet.
                  </CardContent>
                </Card>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Received Invitations</h3>
              {receivedInvitations && receivedInvitations.length > 0 ? (
                receivedInvitations.map((invitation) => (
                  <Card key={invitation.id} className="mb-3">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Invitation from {(invitation as any).sender_name || 'Unknown'}</CardTitle>
                          <CardDescription>
                            Received {new Date(invitation.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Badge
                            variant={
                              invitation.status === 'accepted' ? 'default' :
                              invitation.status === 'pending' ? 'secondary' :
                              'destructive'
                            }
                          >
                            {invitation.status}
                          </Badge>
                          {invitation.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => acceptInvitation.mutate(invitation)}
                              disabled={acceptInvitation.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteInvitation.mutate(invitation.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {invitation.message && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{invitation.message}</p>
                      </CardContent>
                    )}
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No invitations received yet.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="feedback">
          <MentorFeedbackList />
        </TabsContent>

        <TabsContent value="progress">
          <MentorProgressReports />
        </TabsContent>

        <TabsContent value="reviews">
          <CollaborativeReviewDashboard materialType="all" />
        </TabsContent>
      </Tabs>

      {selectedRelationship && (
        <MentorCommunication
          relationshipId={selectedRelationship}
          onClose={() => setSelectedRelationship(null)}
        />
      )}

      {selectedInvitation && (
        <InvitationChat
          invitation={selectedInvitation}
          onClose={() => setSelectedInvitation(null)}
        />
      )}

      <MentorInviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['mentor-invitations'] })}
      />
    </div>
  );
}
