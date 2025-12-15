import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Heart, Mail, Clock, Trash2, Settings, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { FamilySharingSettingsDialog } from "./FamilySharingSettingsDialog";
import { useState } from "react";

interface FamilySupportersListProps {
  onInvite: () => void;
}

export function FamilySupportersList({ onInvite }: FamilySupportersListProps) {
  const queryClient = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedSupporter, setSelectedSupporter] = useState<any>(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: supporters, isLoading } = useQuery({
    queryKey: ['family-supporters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_supporters')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (supporterId: string) => {
      const { error } = await supabase
        .from('family_supporters')
        .delete()
        .eq('id', supporterId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-supporters'] });
      toast.success("Supporter removed");
    },
    onError: () => {
      toast.error("Failed to remove supporter");
    },
  });

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case 'family': return '👨‍👩‍👧‍👦';
      case 'partner': return '💑';
      case 'friend': return '🤝';
      default: return '👤';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'declined':
        return <Badge variant="destructive">Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!supporters || supporters.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Heart className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Supporters Yet</h3>
          <p className="text-muted-foreground text-center max-w-md mb-4">
            Invite family members or friends to support your job search journey. 
            They'll receive family-friendly progress updates without sensitive details.
          </p>
          <Button onClick={onInvite}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Your First Supporter
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Your Support Network
          </CardTitle>
          <CardDescription>
            People who are supporting your job search journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {supporters.map((supporter) => (
              <div
                key={supporter.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl">
                    {getRelationshipIcon(supporter.relationship_type)}
                  </div>
                  <div>
                    <h4 className="font-semibold">{supporter.supporter_name}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {supporter.supporter_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {supporter.supporter_email}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(supporter.invite_status)}
                      <Badge variant="outline" className="capitalize">
                        {supporter.relationship_type}
                      </Badge>
                      {supporter.last_viewed_at && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last viewed {formatDistanceToNow(new Date(supporter.last_viewed_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedSupporter(supporter);
                      setSettingsOpen(true);
                    }}
                    title="Sharing Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(supporter.id)}
                    className="text-destructive hover:text-destructive"
                    title="Remove Supporter"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedSupporter && (
        <FamilySharingSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          supporter={selectedSupporter}
        />
      )}
    </div>
  );
}
