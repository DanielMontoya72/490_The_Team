import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamMembersTab } from "./TeamMembersTab";
import { TeamSettingsTab } from "./TeamSettingsTab";
import { TeamDashboardTab } from "./TeamDashboardTab";
import { TeamBillingTab } from "./TeamBillingTab";
import { TeamCommunicationTab } from "./TeamCommunicationTab";
import { TeamReportsTab } from "./TeamReportsTab";
import { TeamProgressSharingTab } from "./TeamProgressSharingTab";
import { TeamSharedJobsTab } from "./TeamSharedJobsTab";

interface TeamSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: {
    id: string;
    name: string;
    description: string;
  };
  onUpdate: () => void;
}

export const TeamSettingsDialog = ({
  open,
  onOpenChange,
  team,
  onUpdate,
}: TeamSettingsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{team.name}</DialogTitle>
          <DialogDescription>Manage your team settings, members, and progress sharing</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="communication">Notes</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <TeamDashboardTab teamId={team.id} />
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <TeamMembersTab teamId={team.id} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="jobs" className="space-y-4">
            <TeamSharedJobsTab teamId={team.id} />
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <TeamProgressSharingTab teamId={team.id} />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <TeamReportsTab teamId={team.id} />
          </TabsContent>

          <TabsContent value="communication" className="space-y-4">
            <TeamCommunicationTab teamId={team.id} />
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <TeamBillingTab teamId={team.id} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <TeamSettingsTab team={team} onUpdate={onUpdate} onClose={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
