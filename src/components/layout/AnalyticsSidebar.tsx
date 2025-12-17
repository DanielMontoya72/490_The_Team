import { Link, useLocation } from "react-router-dom";
import { BarChart3, DollarSign, TrendingUp, GitCompare, Activity, Map, ChevronRight, Brain } from "lucide-react";

export function AnalyticsSidebar() {
  const location = useLocation();
  const isCurrentPage = (path: string) => location.pathname === path;

  const navigationItems = [
    {
      path: "/analytics-hub",
      icon: BarChart3,
      label: "Hub Overview"
    },
    {
      path: "/stats",
      icon: BarChart3,
      label: "Job Stats"
    },
    {
      path: "/salary-analytics",
      icon: DollarSign,
      label: "Salary Analytics"
    },
    {
      path: "/predictive-analytics",
      icon: TrendingUp,
      label: "Predictive Analytics"
    },
    {
      path: "/offer-comparison",
      icon: GitCompare,
      label: "Offer Comparison"
    },
    {
      path: "/monitoring-dashboard",
      icon: Activity,
      label: "Monitoring"
    },
    {
      path: "/job-map",
      icon: Map,
      label: "Job Map"
    }
  ];

  return (
    <>
      {/* Analytics Sidebar - Mobile Dropdown */}
      <aside className="lg:hidden fixed left-0 top-16 right-0 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 border-b border-yellow-400/90 shadow-lg z-40">
        <details className="group">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary flex-shrink-0" />
              <h3 className="font-bold text-base text-white">Analytics Hub</h3>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
          </summary>
          <div className="px-4 pb-4 space-y-1 bg-card border-t">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg transition-colors group min-h-[40px] ${
                    isCurrentPage(item.path) ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                  }`}
                >
                  <Icon className={`h-4 w-4 transition-colors flex-shrink-0 ${
                    isCurrentPage(item.path) ? "text-primary" : "text-white"
                  }`} />
                  <span className={`text-sm font-medium transition-colors truncate text-left leading-relaxed ${
                    isCurrentPage(item.path) ? "text-primary" : "text-white group-hover:text-primary"
                  }`}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </details>
      </aside>

      {/* Analytics Sidebar - Desktop */}
      <aside className="hidden lg:block w-56 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 border-r border-yellow-400/90 shadow-lg overflow-y-auto flex-shrink-0 fixed left-0 top-16 h-[calc(100vh-4rem)] z-30">
        <div className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-primary flex-shrink-0" />
            <h3 className="font-bold text-base text-white">Analytics Hub</h3>
          </div>
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg transition-colors group min-h-[40px] ${
                    isCurrentPage(item.path) ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                  }`}
                >
                  <Icon className={`h-4 w-4 transition-colors flex-shrink-0 ${
                    isCurrentPage(item.path) ? "text-primary" : "text-white"
                  }`} />
                  <span className={`text-sm font-medium transition-colors truncate text-left leading-relaxed ${
                    isCurrentPage(item.path) ? "text-primary" : "text-white group-hover:text-primary"
                  }`}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}