import { useState } from "react";
import { AppNav } from "@/components/layout/AppNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfessionalContactsManager } from "@/components/jobs/ProfessionalContactsManager";
import { ContactDiscovery } from "@/components/contacts/ContactDiscovery";
import { NetworkingOpportunities } from "@/components/contacts/NetworkingOpportunities";
import { RelationshipMaintenance } from "@/components/contacts/RelationshipMaintenance";
import LinkedInIntegration from "@/components/contacts/LinkedInIntegration";
import InformationalInterviewManager from "@/components/contacts/InformationalInterviewManager";
import { Users, Sparkles, Calendar, Bell, Linkedin, Coffee } from "lucide-react";

export default function Contacts() {
  const [activeTab, setActiveTab] = useState("contacts");

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="container mx-auto py-8 px-4">
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
  );
}