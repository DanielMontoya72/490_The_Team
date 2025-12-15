import { useState } from "react";
import { AppNav } from "@/components/layout/AppNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignList } from "@/components/campaigns/CampaignList";
import { CampaignAnalytics } from "@/components/campaigns/CampaignAnalytics";
import { CampaignOutreachTracker } from "@/components/campaigns/CampaignOutreachTracker";
import { Target, TrendingUp, Users } from "lucide-react";

export default function NetworkingCampaigns() {
  const [activeTab, setActiveTab] = useState("campaigns");

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Networking Campaigns</h1>
          <p className="text-muted-foreground">
            Create targeted campaigns to systematically build relationships
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="outreach" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Outreach Tracking
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns">
            <CampaignList />
          </TabsContent>

          <TabsContent value="outreach">
            <CampaignOutreachTracker />
          </TabsContent>

          <TabsContent value="analytics">
            <CampaignAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
