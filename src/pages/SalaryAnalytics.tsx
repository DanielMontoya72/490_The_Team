import { AppNav } from "@/components/layout/AppNav";
import { AnalyticsSidebar } from "@/components/layout/AnalyticsSidebar";
import { SalaryAnalyticsDashboard } from "@/components/salary/SalaryAnalyticsDashboard";

export default function SalaryAnalytics() {
  return (
    <>
      <AppNav />
      
      <div className="flex min-h-screen bg-background pt-16">
        <AnalyticsSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-hidden lg:ml-56">
          <div className="h-full overflow-y-auto">
            <div className="container mx-auto px-4 py-8 max-w-7xl lg:pt-0 pt-16">
              <SalaryAnalyticsDashboard />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
