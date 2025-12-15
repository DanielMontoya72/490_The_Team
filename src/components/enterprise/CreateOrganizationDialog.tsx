import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrganizationDialog({ open, onOpenChange }: CreateOrganizationDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    organization_name: '',
    organization_type: 'university',
    contact_email: '',
    contact_phone: '',
    website_url: '',
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('career_services_organizations')
        .insert({
          ...formData,
          contact_email: formData.contact_email || user?.email,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add current user as super admin
      const { error: adminError } = await supabase
        .from('organization_admins')
        .insert({
          organization_id: org.id,
          user_id: user?.id,
          admin_role: 'super_admin',
          permissions: {
            manage_users: true,
            view_analytics: true,
            manage_cohorts: true,
            export_data: true,
            manage_branding: true,
            manage_compliance: true,
          },
        });

      if (adminError) throw adminError;

      return org;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-admins'] });
      toast.success("Organization created successfully!");
      onOpenChange(false);
      setFormData({
        organization_name: '',
        organization_type: 'university',
        contact_email: '',
        contact_phone: '',
        website_url: '',
      });
    },
    onError: (error) => {
      console.error("Error creating organization:", error);
      toast.error("Failed to create organization");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Create Organization
          </DialogTitle>
          <DialogDescription>
            Set up your career services organization to start managing job seeker cohorts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name *</Label>
            <Input
              id="name"
              placeholder="e.g., State University Career Center"
              value={formData.organization_name}
              onChange={(e) => setFormData(s => ({ ...s, organization_name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Organization Type</Label>
            <Select
              value={formData.organization_type}
              onValueChange={(v) => setFormData(s => ({ ...s, organization_type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="university">🎓 University/College</SelectItem>
                <SelectItem value="bootcamp">💻 Bootcamp/Training Program</SelectItem>
                <SelectItem value="staffing_agency">🏢 Staffing Agency</SelectItem>
                <SelectItem value="nonprofit">❤️ Nonprofit Organization</SelectItem>
                <SelectItem value="corporate">🏛️ Corporate HR/Outplacement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Contact Email</Label>
            <Input
              id="email"
              type="email"
              placeholder={user?.email || "contact@organization.com"}
              value={formData.contact_email}
              onChange={(e) => setFormData(s => ({ ...s, contact_email: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Contact Phone (optional)</Label>
            <Input
              id="phone"
              placeholder="+1 (555) 123-4567"
              value={formData.contact_phone}
              onChange={(e) => setFormData(s => ({ ...s, contact_phone: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website (optional)</Label>
            <Input
              id="website"
              placeholder="https://careers.university.edu"
              value={formData.website_url}
              onChange={(e) => setFormData(s => ({ ...s, website_url: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!formData.organization_name || createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Organization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
