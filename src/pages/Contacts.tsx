import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppNav } from "@/components/layout/AppNav";
import { ContactSidebar } from "@/components/layout/ContactSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfessionalContactsManager } from "@/components/jobs/ProfessionalContactsManager";
import { ContactDiscovery } from "@/components/contacts/ContactDiscovery";
import { NetworkingOpportunities } from "@/components/contacts/NetworkingOpportunities";
import { RelationshipMaintenance } from "@/components/contacts/RelationshipMaintenance";
import LinkedInIntegration from "@/components/contacts/LinkedInIntegration";
import InformationalInterviewManager from "@/components/contacts/InformationalInterviewManager";
import { Users, Sparkles, Calendar, Bell, Linkedin, Coffee } from "lucide-react";

export default function Contacts() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || "contacts");

  // Update activeTab when URL parameter changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <>
      <AppNav />
      
      <div className="flex min-h-screen bg-background pt-16">
        <ContactSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden lg:ml-56">
          <div className="h-full overflow-y-auto">
            <div className="container mx-auto px-4 py-8 max-w-7xl lg:pt-0 pt-16">
              <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Professional Network</h1>
                <p className="text-muted-foreground">
                  Manage contacts, discover strategic connections, and find networking opportunities
                </p>
              </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              My Contacts
            </TabsTrigger>
            <TabsTrigger value="discovery" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Contact Discovery
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Relationship Maintenance
            </TabsTrigger>
            <TabsTrigger value="linkedin" className="flex items-center gap-2">
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </TabsTrigger>
            <TabsTrigger value="interviews" className="flex items-center gap-2">
              <Coffee className="h-4 w-4" />
              Info Interviews
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts">
            <ProfessionalContactsManager />
          </TabsContent>

          <TabsContent value="discovery">
            <ContactDiscovery />
          </TabsContent>

          <TabsContent value="maintenance">
            <RelationshipMaintenance />
          </TabsContent>

          <TabsContent value="linkedin">
            <LinkedInIntegration />
          </TabsContent>

          <TabsContent value="interviews">
            <InformationalInterviewManager />
          </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}