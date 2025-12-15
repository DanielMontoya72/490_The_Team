import { useState } from "react";
import { AppNav } from "@/components/layout/AppNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OffersList } from "@/components/offers/OffersList";
import { OfferComparisonMatrix } from "@/components/offers/OfferComparisonMatrix";
import { OfferScenarioAnalysis } from "@/components/offers/OfferScenarioAnalysis";
import { ArchivedOffers } from "@/components/offers/ArchivedOffers";
import { CareerPathSimulator } from "@/components/offers/CareerPathSimulator";
import { Scale, LayoutGrid, FlaskConical, Archive, TrendingUp } from "lucide-react";

export default function OfferComparison() {
  const [activeTab, setActiveTab] = useState("offers");

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="container mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Job Offer Comparison</h1>
          <p className="text-muted-foreground">
            Compare multiple job offers to make the best career decision
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="offers" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Offers
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Compare
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Scenarios
            </TabsTrigger>
            <TabsTrigger value="simulate" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Simulate
            </TabsTrigger>
            <TabsTrigger value="archived" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Archived
            </TabsTrigger>
          </TabsList>

          <TabsContent value="offers" className="mt-6">
            <OffersList />
          </TabsContent>

          <TabsContent value="compare" className="mt-6">
            <OfferComparisonMatrix />
          </TabsContent>

          <TabsContent value="scenarios" className="mt-6">
            <OfferScenarioAnalysis />
          </TabsContent>

          <TabsContent value="simulate" className="mt-6">
            <CareerPathSimulator />
          </TabsContent>

          <TabsContent value="archived" className="mt-6">
            <ArchivedOffers />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
