import { useState } from "react";
import { Link } from "react-router-dom";
import { AppNav } from "@/components/layout/AppNav";
import { AnalyticsSidebar } from "@/components/layout/AnalyticsSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OffersList } from "@/components/offers/OffersList";
import { OfferComparisonMatrix } from "@/components/offers/OfferComparisonMatrix";
import { OfferScenarioAnalysis } from "@/components/offers/OfferScenarioAnalysis";
import { ArchivedOffers } from "@/components/offers/ArchivedOffers";
import { CareerPathSimulator } from "@/components/offers/CareerPathSimulator";
import { GitCompare } from "lucide-react";
import { 
  Scale, 
  LayoutGrid, 
  FlaskConical, 
  Archive, 
  TrendingUp
} from "lucide-react";

export default function OfferComparison() {
  const [activeTab, setActiveTab] = useState("offers");

  return (
    <>
      <AppNav />
      
      <div className="flex min-h-screen bg-background pt-16">
        <AnalyticsSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-hidden lg:ml-56">
          <div className="h-full overflow-y-auto">
            <div className="container mx-auto px-4 py-8 max-w-7xl lg:pt-0 pt-16">
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-3">
                  <GitCompare className="h-8 w-8 text-primary" />
                  <h1 className="text-3xl font-bold">Job Offer Comparison</h1>
                </div>
                <p className="text-muted-foreground">
                  Compare multiple job offers to make the best career decision
                </p>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                  <TabsTrigger value="offers" className="flex items-center gap-2 text-xs sm:text-sm px-1 sm:px-2">
                    <Scale className="h-4 w-4 hidden sm:inline" />
                    Offers
                  </TabsTrigger>
                  <TabsTrigger value="compare" className="flex items-center gap-2 text-xs sm:text-sm px-1 sm:px-2">
                    <LayoutGrid className="h-4 w-4 hidden sm:inline" />
                    Compare
                  </TabsTrigger>
                  <TabsTrigger value="scenarios" className="flex items-center gap-2 text-xs sm:text-sm px-1 sm:px-2">
                    <FlaskConical className="h-4 w-4 hidden sm:inline" />
                    Scenarios
                  </TabsTrigger>
                  <TabsTrigger value="simulate" className="flex items-center gap-2 text-xs sm:text-sm px-1 sm:px-2">
                    <TrendingUp className="h-4 w-4 hidden sm:inline" />
                    Simulate
                  </TabsTrigger>
                  <TabsTrigger value="archived" className="flex items-center gap-2 text-xs sm:text-sm px-1 sm:px-2">
                    <Archive className="h-4 w-4 hidden sm:inline" />
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
        </main>
      </div>
    </>
  );
}
