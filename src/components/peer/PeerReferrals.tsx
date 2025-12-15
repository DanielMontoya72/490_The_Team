import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Briefcase, MapPin, DollarSign, ExternalLink, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface PeerReferralsProps {
  groupId: string;
}

export function PeerReferrals({ groupId }: PeerReferralsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    role_title: "",
    role_description: "",
    location: "",
    is_remote: false,
    salary_range: "",
    application_url: "",
    referral_contact: "",
  });

  const queryClient = useQueryClient();

  const { data: referrals, isLoading } = useQuery({
    queryKey: ["peer-referrals", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peer_referrals")
        .select("*")
        .eq("group_id", groupId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createReferral = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("peer_referrals")
        .insert({
          ...data,
          group_id: groupId,
          posted_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peer-referrals", groupId] });
      toast.success("Referral posted successfully!");
      setDialogOpen(false);
      setFormData({
        company_name: "",
        role_title: "",
        role_description: "",
        location: "",
        is_remote: false,
        salary_range: "",
        application_url: "",
        referral_contact: "",
      });
    },
    onError: (error) => {
      toast.error("Failed to post referral: " + error.message);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Peer Referrals</h3>
          <p className="text-sm text-muted-foreground">
            Share job opportunities and help each other grow
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Briefcase className="h-4 w-4 mr-2" />
          Post Referral
        </Button>
      </div>

      {isLoading ? (
        <p>Loading referrals...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {referrals?.map((referral) => (
            <Card key={referral.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      {referral.is_remote && <Badge variant="secondary">Remote</Badge>}
                    </div>
                    <CardTitle className="text-lg">{referral.role_title}</CardTitle>
                    <CardDescription>{referral.company_name}</CardDescription>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(referral.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>{referral.interested_count}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {referral.role_description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {referral.role_description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  {referral.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{referral.location}</span>
                    </div>
                  )}
                  {referral.salary_range && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{referral.salary_range}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {referral.application_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(referral.application_url, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Apply
                    </Button>
                  )}
                  {referral.referral_contact && (
                    <Button variant="default" size="sm" className="flex-1">
                      Contact Referrer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {referrals?.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              No referrals available yet. Be the first to share an opportunity!
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post Job Referral</DialogTitle>
            <DialogDescription>
              Help your peers by sharing job opportunities
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="e.g., Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role_title">Role Title *</Label>
                <Input
                  id="role_title"
                  value={formData.role_title}
                  onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role_description">Job Description</Label>
              <Textarea
                id="role_description"
                value={formData.role_description}
                onChange={(e) => setFormData({ ...formData, role_description: e.target.value })}
                placeholder="Describe the role, requirements, and responsibilities..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., San Francisco, CA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary_range">Salary Range</Label>
                <Input
                  id="salary_range"
                  value={formData.salary_range}
                  onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                  placeholder="e.g., $120k - $150k"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_remote"
                checked={formData.is_remote}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_remote: checked as boolean })
                }
              />
              <label htmlFor="is_remote" className="text-sm font-medium">
                Remote position
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="application_url">Application URL</Label>
              <Input
                id="application_url"
                type="url"
                value={formData.application_url}
                onChange={(e) => setFormData({ ...formData, application_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referral_contact">Referral Contact (Optional)</Label>
              <Input
                id="referral_contact"
                value={formData.referral_contact}
                onChange={(e) => setFormData({ ...formData, referral_contact: e.target.value })}
                placeholder="Email or LinkedIn URL for direct referral"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createReferral.mutate(formData)}
                disabled={!formData.company_name || !formData.role_title || createReferral.isPending}
              >
                Post Referral
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}