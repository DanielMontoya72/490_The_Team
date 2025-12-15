import { AppNav } from "@/components/layout/AppNav";
import { SalaryAnalyticsDashboard } from "@/components/salary/SalaryAnalyticsDashboard";

export default function SalaryAnalytics() {
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="container mx-auto py-6 px-4">
        <SalaryAnalyticsDashboard />
      </div>
    </div>
  );
}
