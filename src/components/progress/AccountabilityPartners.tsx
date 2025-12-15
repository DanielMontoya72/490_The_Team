import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Users, TrendingUp, MessageCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AddPartnerDialog } from "./AddPartnerDialog";
import { PartnerEngagementChart } from "./PartnerEngagementChart";

export function AccountabilityPartners() {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: partners, isLoading } = useQuery({
    queryKey: ["accountability-partners"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("accountability_partners")
        .select("*")
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const partnerIds = data.map(p => 
        p.user_id === user.id ? p.partner_id : p.user_id
      );

      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", partnerIds);

      return data.map(p => {
        const partnerId = p.user_id === user.id ? p.partner_id : p.user_id;
        const profile = profiles?.find(pr => pr.user_id === partnerId);
        return {
          ...p,
          partner_name: profile 
            ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email
            : "Unknown Partner"
        };
      });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("accountability_partners")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountability-partners"] });
      toast.success("Partner status updated");
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/10 text-green-500";
      case "pending": return "bg-yellow-500/10 text-yellow-500";
      case "inactive": return "bg-gray-500/10 text-gray-500";
      default: return "";
    }
  };

  const getRelationshipTypeIcon = (type: string) => {
    switch (type) {
      case "mentor": return "👨‍🏫";
      case "coach": return "🎯";
      case "peer": return "🤝";
      default: return "👤";
    }
  };

  if (isLoading) {
    return <div>Loading partners...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Accountability Partners
              </CardTitle>
              <CardDescription>
                Connect with mentors, coaches, and peers to stay motivated
              </CardDescription>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Partner
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!partners || partners.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No accountability partners yet</p>
              <p className="text-sm">Add partners to share your progress and stay motivated</p>
            </div>
          ) : (
            <div className="space-y-4">
              {partners.map((partner) => (
                <Card key={partner.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{getRelationshipTypeIcon(partner.relationship_type)}</span>
                          <div>
                            <h3 className="font-semibold">{partner.partner_name}</h3>
                            <p className="text-sm text-muted-foreground capitalize">
                              {partner.relationship_type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getStatusColor(partner.status)}>
                            {partner.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Check-ins: {partner.check_in_frequency}
                          </span>
                          {partner.engagement_score > 0 && (
                            <div className="flex items-center gap-1 text-sm">
                              <TrendingUp className="h-3 w-3" />
                              <span>{partner.engagement_score.toFixed(1)}% engaged</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {partner.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus.mutate({ id: partner.id, status: "active" })}
                          >
                            Accept
                          </Button>
                        )}
                        {partner.status === "active" && (
                          <Button size="sm" variant="outline">
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {partners && partners.length > 0 && <PartnerEngagementChart partners={partners} />}

      <AddPartnerDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </div>
  );
}
