import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Mail, Settings, Trash2, CheckCircle, XCircle, MessageSquare, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdvisorPermissionsDialog } from "./AdvisorPermissionsDialog";

interface AdvisorListProps {
  advisors: any[];
  loading: boolean;
  onRefresh: () => void;
  onSelectAdvisor: (id: string) => void;
}

export function AdvisorList({ advisors, loading, onRefresh, onSelectAdvisor }: AdvisorListProps) {
  const [permissionsDialog, setPermissionsDialog] = useState<{ open: boolean; advisor: any | null }>({
    open: false,
    advisor: null,
  });

  const getAdvisorTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      career_coach: "Career Coach",
      resume_expert: "Resume Expert",
      interview_coach: "Interview Coach",
      industry_advisor: "Industry Advisor",
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/10 text-green-500";
      case "pending": return "bg-yellow-500/10 text-yellow-500";
      case "inactive": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleStatusChange = async (advisorId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("external_advisors")
        .update({ 
          status: newStatus,
          accepted_at: newStatus === 'active' ? new Date().toISOString() : null
        })
        .eq("id", advisorId);

      if (error) throw error;
      toast.success(`Advisor status updated to ${newStatus}`);
      onRefresh();
    } catch (error: any) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (advisorId: string) => {
    if (!confirm("Are you sure you want to remove this advisor?")) return;

    try {
      const { error } = await supabase
        .from("external_advisors")
        .delete()
        .eq("id", advisorId);

      if (error) throw error;
      toast.success("Advisor removed");
      onRefresh();
    } catch (error: any) {
      toast.error("Failed to remove advisor");
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading advisors...</div>;
  }

  if (advisors.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">No advisors yet. Invite your first career coach or advisor to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {advisors.map((advisor) => (
        <Card key={advisor.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {advisor.advisor_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{advisor.advisor_name}</h3>
                  <p className="text-sm text-muted-foreground">{advisor.advisor_email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{getAdvisorTypeLabel(advisor.advisor_type)}</Badge>
                    <Badge className={getStatusColor(advisor.status)}>{advisor.status}</Badge>
                    {advisor.specialization && (
                      <Badge variant="secondary">{advisor.specialization}</Badge>
                    )}
                  </div>
                  {advisor.company && (
                    <p className="text-sm text-muted-foreground mt-1">{advisor.company}</p>
                  )}
                  {advisor.hourly_rate && (
                    <p className="text-sm font-medium mt-1">${advisor.hourly_rate}/hr</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onSelectAdvisor(advisor.id)}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Message
                </Button>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-1" />
                  Schedule
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setPermissionsDialog({ open: true, advisor })}>
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Permissions
                    </DropdownMenuItem>
                    {advisor.status === 'pending' && (
                      <DropdownMenuItem onClick={() => handleStatusChange(advisor.id, 'active')}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Active
                      </DropdownMenuItem>
                    )}
                    {advisor.status === 'active' && (
                      <DropdownMenuItem onClick={() => handleStatusChange(advisor.id, 'inactive')}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Deactivate
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => handleDelete(advisor.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Advisor
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <AdvisorPermissionsDialog
        open={permissionsDialog.open}
        onOpenChange={(open) => setPermissionsDialog({ ...permissionsDialog, open })}
        advisor={permissionsDialog.advisor}
        onSuccess={onRefresh}
      />
    </div>
  );
}
