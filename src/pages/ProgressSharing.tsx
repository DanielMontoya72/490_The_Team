import { useState } from "react";
import { AppNav } from "@/components/layout/AppNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressSharingSettings } from "@/components/progress/ProgressSharingSettings";
import { AccountabilityPartners } from "@/components/progress/AccountabilityPartners";
import { SharedProgressFeed } from "@/components/progress/SharedProgressFeed";
import { AccountabilityImpactInsights } from "@/components/progress/AccountabilityImpactInsights";
import { ProgressReports } from "@/components/progress/ProgressReports";
import { ShareProgressDialog } from "@/components/progress/ShareProgressDialog";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

const ProgressSharing = () => {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  return (
    <>
      <AppNav />
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Progress Sharing & Accountability</h1>
            <p className="text-muted-foreground mt-2">
              Share your journey, celebrate milestones, and stay accountable with your support network
            </p>
          </div>
          <Button onClick={() => setShareDialogOpen(true)}>
            <Share2 className="mr-2 h-4 w-4" />
            Share Progress
          </Button>
        </div>

        <Tabs defaultValue="feed" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="feed">Progress Feed</TabsTrigger>
            <TabsTrigger value="partners">Partners</TabsTrigger>
            <TabsTrigger value="insights">Impact Insights</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-6">
            <SharedProgressFeed />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <AccountabilityImpactInsights />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ProgressReports />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <ProgressSharingSettings />
          </TabsContent>
        </Tabs>

        <ShareProgressDialog 
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
        />
      </div>
    </>
  );
};

export default ProgressSharing;
