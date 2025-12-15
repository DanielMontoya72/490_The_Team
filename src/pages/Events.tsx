import { AppNav } from "@/components/layout/AppNav";
import { NetworkingOpportunities } from "@/components/contacts/NetworkingOpportunities";
import { Calendar } from "lucide-react";

export default function Events() {
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Events & Opportunities</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Discover and track networking events, career fairs, and professional opportunities
          </p>
        </div>

        <NetworkingOpportunities />
      </div>
    </div>
  );
}
