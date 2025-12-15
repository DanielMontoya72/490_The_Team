import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Calendar, Clock, Users, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { format, isFuture, isPast } from "date-fns";

interface GroupSessionsProps {
  groupId: string;
}

export function GroupSessions({ groupId }: GroupSessionsProps) {
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["peer-group-sessions", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peer_group_sessions")
        .select("*")
        .eq("group_id", groupId)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: userRegistrations } = useQuery({
    queryKey: ["user-session-registrations", groupId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("peer_session_registrations")
        .select("session_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map(r => r.session_id);
    },
  });

  const registerForSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("peer_session_registrations")
        .insert({ session_id: sessionId, user_id: user.id });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-session-registrations"] });
      toast.success("Successfully registered for session!");
    },
    onError: (error) => {
      toast.error("Failed to register: " + error.message);
    },
  });

  const isRegistered = (sessionId: string) => userRegistrations?.includes(sessionId);

  const upcomingSessions = sessions?.filter(s => isFuture(new Date(s.scheduled_at)));
  const pastSessions = sessions?.filter(s => isPast(new Date(s.scheduled_at)));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">Group Sessions & Webinars</h3>
        <p className="text-sm text-muted-foreground">
          Join coaching sessions, workshops, and community events
        </p>
      </div>

      {isLoading ? (
        <p>Loading sessions...</p>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Sessions */}
          {upcomingSessions && upcomingSessions.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold">Upcoming Sessions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingSessions.map((session) => (
                  <Card key={session.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Video className="h-5 w-5 text-primary" />
                            <Badge variant="secondary">{session.session_type}</Badge>
                            <Badge variant={session.status === "scheduled" ? "default" : "outline"}>
                              {session.status}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg">{session.session_title}</CardTitle>
                          {session.facilitator_name && (
                            <CardDescription>
                              Facilitated by {session.facilitator_name}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {session.session_description}
                      </p>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(new Date(session.scheduled_at), "PPP")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(new Date(session.scheduled_at), "p")} ({session.duration_minutes} min)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {session.registered_count} registered
                            {session.max_participants && ` / ${session.max_participants} max`}
                          </span>
                        </div>
                      </div>

                      {isRegistered(session.id) ? (
                        <div className="space-y-2">
                          <Button variant="secondary" className="w-full" disabled>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Registered
                          </Button>
                          {session.meeting_link && (
                            <Button
                              variant="default"
                              className="w-full"
                              onClick={() => window.open(session.meeting_link, "_blank")}
                            >
                              <Video className="h-4 w-4 mr-2" />
                              Join Session
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => registerForSession.mutate(session.id)}
                          disabled={
                            registerForSession.isPending ||
                            (session.max_participants && session.registered_count >= session.max_participants)
                          }
                        >
                          Register for Session
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Past Sessions with Recordings */}
          {pastSessions && pastSessions.filter(s => s.recording_url).length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold">Past Sessions (Recorded)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastSessions
                  .filter(s => s.recording_url)
                  .map((session) => (
                    <Card key={session.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <Badge variant="outline">{session.session_type}</Badge>
                            <CardTitle className="text-lg">{session.session_title}</CardTitle>
                            {session.facilitator_name && (
                              <CardDescription>
                                Facilitated by {session.facilitator_name}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {session.session_description}
                        </p>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(session.scheduled_at), "PPP")}
                        </div>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => window.open(session.recording_url, "_blank")}
                        >
                          <Video className="h-4 w-4 mr-2" />
                          Watch Recording
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {sessions?.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              No sessions scheduled yet. Check back soon for upcoming events!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}