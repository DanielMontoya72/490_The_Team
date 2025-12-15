import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Trophy, Sparkles, Briefcase, Video } from "lucide-react";
import { GroupDiscussions } from "./GroupDiscussions";
import { GroupChallenges } from "./GroupChallenges";
import { SuccessStories } from "./SuccessStories";
import { PeerReferrals } from "./PeerReferrals";
import { GroupSessions } from "./GroupSessions";

interface GroupDetailsViewProps {
  groupId: string;
  onBack: () => void;
}

export function GroupDetailsView({ groupId, onBack }: GroupDetailsViewProps) {
  const [activeTab, setActiveTab] = useState("discussions");

  const { data: group, isLoading } = useQuery({
    queryKey: ["peer-support-group", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peer_support_groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading group details...</div>;
  }

  if (!group) {
    return <div>Group not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{group.group_name}</h2>
          <p className="text-muted-foreground">{group.group_description}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Group Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Type</p>
            <p className="font-medium">{group.group_type}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Members</p>
            <p className="font-medium">{group.member_count}</p>
          </div>
          {group.industry && (
            <div>
              <p className="text-sm text-muted-foreground">Industry</p>
              <p className="font-medium">{group.industry}</p>
            </div>
          )}
          {group.role_focus && (
            <div>
              <p className="text-sm text-muted-foreground">Role Focus</p>
              <p className="font-medium">{group.role_focus}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="discussions">
            <MessageSquare className="h-4 w-4 mr-2" />
            Discussions
          </TabsTrigger>
          <TabsTrigger value="challenges">
            <Trophy className="h-4 w-4 mr-2" />
            Challenges
          </TabsTrigger>
          <TabsTrigger value="stories">
            <Sparkles className="h-4 w-4 mr-2" />
            Stories
          </TabsTrigger>
          <TabsTrigger value="referrals">
            <Briefcase className="h-4 w-4 mr-2" />
            Referrals
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Video className="h-4 w-4 mr-2" />
            Sessions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discussions" className="mt-6">
          <GroupDiscussions groupId={groupId} />
        </TabsContent>

        <TabsContent value="challenges" className="mt-6">
          <GroupChallenges groupId={groupId} />
        </TabsContent>

        <TabsContent value="stories" className="mt-6">
          <SuccessStories groupId={groupId} />
        </TabsContent>

        <TabsContent value="referrals" className="mt-6">
          <PeerReferrals groupId={groupId} />
        </TabsContent>

        <TabsContent value="sessions" className="mt-6">
          <GroupSessions groupId={groupId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}