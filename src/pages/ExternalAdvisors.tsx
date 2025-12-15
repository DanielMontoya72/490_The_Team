import { AppNav } from "@/components/layout/AppNav";
import { ExternalAdvisorsDashboard } from "@/components/advisors/ExternalAdvisorsDashboard";

export default function ExternalAdvisors() {
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="container mx-auto py-8 px-4">
        <ExternalAdvisorsDashboard />
      </div>
    </div>
  );
}
