import { AppNav } from "@/components/layout/AppNav";
import { PlatformTrackingDashboard } from "@/components/platforms/PlatformTrackingDashboard";

const PlatformTracking = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNav />
      <main className="flex-1 container mx-auto py-8 px-4">
        <PlatformTrackingDashboard />
      </main>
    </div>
  );
};

export default PlatformTracking;
