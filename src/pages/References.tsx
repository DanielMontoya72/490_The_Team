import { useState } from "react";
import { AppNav } from "@/components/layout/AppNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReferenceList } from "@/components/references/ReferenceList";
import { ReferenceRequests } from "@/components/references/ReferenceRequests";
import { ReferencePortfolios } from "@/components/references/ReferencePortfolios";
import { ReferenceAnalytics } from "@/components/references/ReferenceAnalytics";
import { Users, Send, FolderOpen, BarChart3 } from "lucide-react";

export default function References() {
  const [activeTab, setActiveTab] = useState("references");

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Professional References</h1>
          <p className="text-muted-foreground">
            Manage your professional references, track usage, and maintain relationships
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="references" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              My References
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Reference Requests
            </TabsTrigger>
            <TabsTrigger value="portfolios" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Portfolios
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="references">
            <ReferenceList />
          </TabsContent>

          <TabsContent value="requests">
            <ReferenceRequests />
          </TabsContent>

          <TabsContent value="portfolios">
            <ReferencePortfolios />
          </TabsContent>

          <TabsContent value="analytics">
            <ReferenceAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
