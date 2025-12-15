import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, Users, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, isAfter, isBefore } from "date-fns";

interface GroupChallengesProps {
  groupId: string;
}

export function GroupChallenges({ groupId }: GroupChallengesProps) {
  const queryClient = useQueryClient();

  const { data: challenges, isLoading } = useQuery({
    queryKey: ["peer-challenges", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peer_support_challenges")
        .select("*")
        .eq("group_id", groupId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: userParticipation } = useQuery({
    queryKey: ["user-challenge-participation", groupId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("peer_challenge_participants")
        .select("challenge_id, current_progress")
        .eq("user_id", user.id);

      if (error) throw error;
      return data;
    },
  });

  const joinChallenge = useMutation({
    mutationFn: async (challengeId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("peer_challenge_participants")
        .insert({ challenge_id: challengeId, user_id: user.id });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-challenge-participation"] });
      toast.success("Successfully joined the challenge!");
    },
    onError: (error) => {
      toast.error("Failed to join challenge: " + error.message);
    },
  });

  const isParticipating = (challengeId: string) =>
    userParticipation?.some((p) => p.challenge_id === challengeId);

  const getProgress = (challengeId: string) =>
    userParticipation?.find((p) => p.challenge_id === challengeId)?.current_progress || 0;

  const getChallengeStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isBefore(now, start)) return "upcoming";
    if (isAfter(now, end)) return "ended";
    return "active";
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">Group Challenges</h3>
        <p className="text-sm text-muted-foreground">
          Join challenges and track your progress with the community
        </p>
      </div>

      {isLoading ? (
        <p>Loading challenges...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges?.map((challenge) => {
            const status = getChallengeStatus(challenge.start_date, challenge.end_date);
            const progress = getProgress(challenge.id);
            const progressPercentage = (progress / challenge.target_value) * 100;

            return (
              <Card key={challenge.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            status === "active"
                              ? "default"
                              : status === "upcoming"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {status}
                        </Badge>
                        <Badge variant="outline">{challenge.challenge_type}</Badge>
                      </div>
                      <CardTitle className="text-lg">{challenge.challenge_name}</CardTitle>
                    </div>
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <CardDescription>{challenge.challenge_description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {challenge.target_metric}: {challenge.target_value}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{challenge.participants_count} participants</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {format(new Date(challenge.start_date), "MMM d")} -{" "}
                        {format(new Date(challenge.end_date), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>

                  {isParticipating(challenge.id) ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Your Progress</span>
                        <span className="font-medium">
                          {progress} / {challenge.target_value}
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                  ) : (
                    status === "active" && (
                      <Button
                        className="w-full"
                        onClick={() => joinChallenge.mutate(challenge.id)}
                        disabled={joinChallenge.isPending}
                      >
                        Join Challenge
                      </Button>
                    )
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {challenges?.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              No challenges available yet. Check back soon!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}