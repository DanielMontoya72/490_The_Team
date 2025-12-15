import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Plus, UserPlus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { CreateSupportGroupDialog } from "./CreateSupportGroupDialog";

interface SupportGroupBrowserProps {
  onSelectGroup?: (groupId: string) => void;
}

export function SupportGroupBrowser({ onSelectGroup }: SupportGroupBrowserProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: groups, isLoading } = useQuery({
    queryKey: ["peer-support-groups", filterType],
    queryFn: async () => {
      let query = supabase
        .from("peer_support_groups")
        .select(`
          *,
          peer_support_group_members(count)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (filterType !== "all") {
        query = query.eq("group_type", filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: userMemberships } = useQuery({
    queryKey: ["user-group-memberships"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("peer_support_group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map(m => m.group_id);
    },
  });

  const joinGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("peer_support_group_members")
        .insert({ group_id: groupId, user_id: user.id });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-group-memberships"] });
      queryClient.invalidateQueries({ queryKey: ["peer-support-groups"] });
      toast.success("Successfully joined the group!");
    },
    onError: (error) => {
      toast.error("Failed to join group: " + error.message);
    },
  });

  const filteredGroups = groups?.filter(group =>
    group.group_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.group_description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isMember = (groupId: string) => userMemberships?.includes(groupId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Peer Support Groups</h2>
          <p className="text-muted-foreground">
            Connect with peers in your industry or role
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            <SelectItem value="industry">Industry</SelectItem>
            <SelectItem value="role">Role</SelectItem>
            <SelectItem value="location">Location</SelectItem>
            <SelectItem value="experience_level">Experience Level</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p>Loading groups...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups?.map((group) => (
            <Card key={group.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{group.group_name}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{group.group_type}</Badge>
                      {group.privacy_level === "private" && (
                        <Badge variant="outline">Private</Badge>
                      )}
                    </div>
                  </div>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardDescription className="line-clamp-2">
                  {group.group_description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{group.member_count} members</span>
                    {group.industry && <span>{group.industry}</span>}
                  </div>
                  {group.tags && group.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {group.tags.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {isMember(group.id) ? (
                      <>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => onSelectGroup?.(group.id)}
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          View Group
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="default"
                        className="flex-1"
                        onClick={() => joinGroup.mutate(group.id)}
                        disabled={joinGroup.isPending}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Join Group
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredGroups?.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No groups found matching your criteria.</p>
          </CardContent>
        </Card>
      )}

      <CreateSupportGroupDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}