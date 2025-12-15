import { useState } from "react";
import { AppNav } from "@/components/layout/AppNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Heart, UserPlus, TrendingUp, PartyPopper, Shield, BookOpen, MessageSquare } from "lucide-react";
import { FamilySupportersList } from "@/components/family-support/FamilySupportersList";
import { InviteFamilyMemberDialog } from "@/components/family-support/InviteFamilyMemberDialog";
import { WellbeingTracker } from "@/components/family-support/WellbeingTracker";
import { MilestoneSharing } from "@/components/family-support/MilestoneSharing";
import { BoundarySettings } from "@/components/family-support/BoundarySettings";
import { SupportResources } from "@/components/family-support/SupportResources";
import { FamilyUpdates } from "@/components/family-support/FamilyUpdates";
import { FamilyProgressSummary } from "@/components/family-support/FamilyProgressSummary";

export default function FamilySupport() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Heart className="h-8 w-8 text-primary" />
              Family & Personal Support
            </h1>
            <p className="text-muted-foreground mt-2">
              Include your support network in your job search journey with appropriate privacy controls
            </p>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Supporter
          </Button>
        </div>

        <Tabs defaultValue="supporters" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
            <TabsTrigger value="supporters" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Supporters</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Progress</span>
            </TabsTrigger>
            <TabsTrigger value="wellbeing" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Wellbeing</span>
            </TabsTrigger>
            <TabsTrigger value="milestones" className="flex items-center gap-2">
              <PartyPopper className="h-4 w-4" />
              <span className="hidden sm:inline">Milestones</span>
            </TabsTrigger>
            <TabsTrigger value="updates" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Updates</span>
            </TabsTrigger>
            <TabsTrigger value="boundaries" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Boundaries</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Resources</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="supporters">
            <FamilySupportersList onInvite={() => setInviteDialogOpen(true)} />
          </TabsContent>

          <TabsContent value="progress">
            <FamilyProgressSummary />
          </TabsContent>

          <TabsContent value="wellbeing">
            <WellbeingTracker />
          </TabsContent>

          <TabsContent value="milestones">
            <MilestoneSharing />
          </TabsContent>

          <TabsContent value="updates">
            <FamilyUpdates />
          </TabsContent>

          <TabsContent value="boundaries">
            <BoundarySettings />
          </TabsContent>

          <TabsContent value="resources">
            <SupportResources />
          </TabsContent>
        </Tabs>

        <InviteFamilyMemberDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
        />
      </main>
    </div>
  );
}
