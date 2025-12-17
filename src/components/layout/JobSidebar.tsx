import { Link, useLocation } from "react-router-dom";
import { Briefcase, LayoutGrid, Building2, Calendar, BarChart3, DollarSign, Map, ChevronRight } from "lucide-react";

interface JobSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function JobSidebar({ activeTab, onTabChange }: JobSidebarProps) {
  const location = useLocation();
  const isCurrentPage = (path: string) => location.pathname === path;
  const isJobsPage = location.pathname === "/jobs";

  const handleTabClick = (tab: string) => {
    if (onTabChange && isJobsPage) {
      onTabChange(tab);
    }
  };

  const navigationItems = [
    {
      path: "/jobs",
      icon: Briefcase,
      label: "Hub Overview",
      tab: "overview",
      isButton: true
    },
    {
      path: "/jobs",
      icon: LayoutGrid,
      label: "Applications", 
      tab: "applications",
      isButton: true
    },
    {
      path: "/jobs",
      icon: Building2,
      label: "Platforms",
      tab: "platforms", 
      isButton: true
    },
    {
      path: "/jobs",
      icon: Calendar,
      label: "Interviews",
      tab: "interviews",
      isButton: true
    },
    {
      path: "/jobs",
      icon: BarChart3,
      label: "Analytics",
      tab: "analytics",
      isButton: true
    },
    {
      path: "/jobs",
      icon: DollarSign,
      label: "Salary Negotiation",
      tab: "salary",
      isButton: true
    },
    {
      path: "/job-map",
      icon: Map,
      label: "Job Map",
      tab: "job-map",
      isButton: false
    }
  ];

  return (
    <>
      {/* Job Application Sidebar - Mobile Dropdown */}
      <aside className="lg:hidden fixed left-0 top-16 right-0 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 border-b border-yellow-400/90 shadow-lg z-40">
        <details className="group">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
              <h3 className="font-bold text-base text-white">Job Application Hub</h3>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
          </summary>
          <div className="px-4 pb-4 space-y-1 bg-card border-t">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isJobsPage ? activeTab === item.tab : isCurrentPage(item.path);
              
              if (item.isButton && isJobsPage) {
                return (
                  <button
                    key={item.tab}
                    onClick={() => handleTabClick(item.tab)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg transition-colors group min-h-[40px] ${
                      isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                    }`}
                  >
                    <Icon className={`h-4 w-4 transition-colors flex-shrink-0 ${
                      isActive ? "text-primary" : "text-white"
                    }`} />
                    <span className={`text-sm font-medium transition-colors truncate text-left leading-relaxed ${
                      isActive ? "text-primary" : "text-white group-hover:text-primary"
                    }`}>{item.label}</span>
                  </button>
                );
              } else {
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg transition-colors group min-h-[40px] ${
                      isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                    }`}
                  >
                    <Icon className={`h-4 w-4 transition-colors flex-shrink-0 ${
                      isActive ? "text-primary" : "text-white"
                    }`} />
                    <span className={`text-sm font-medium transition-colors truncate text-left leading-relaxed ${
                      isActive ? "text-primary" : "text-white group-hover:text-primary"
                    }`}>{item.label}</span>
                  </Link>
                );
              }
            })}
          </div>
        </details>
      </aside>

      {/* Job Application Sidebar - Desktop */}
      <aside className="hidden lg:block w-56 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 border-r border-yellow-400/90 shadow-lg flex-shrink-0 fixed left-0 top-16 h-[calc(100vh-4rem)] overflow-y-auto z-30">
        <div className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
            <h3 className="font-bold text-base text-white">Job Application Hub</h3>
          </div>
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isJobsPage ? activeTab === item.tab : isCurrentPage(item.path);
              
              if (item.isButton && isJobsPage) {
                return (
                  <button
                    key={item.tab}
                    onClick={() => handleTabClick(item.tab)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg transition-colors group min-h-[40px] ${
                      isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                    }`}
                  >
                    <Icon className={`h-4 w-4 transition-colors flex-shrink-0 ${
                      isActive ? "text-primary" : "text-white"
                    }`} />
                    <span className={`text-sm font-medium transition-colors truncate text-left leading-relaxed ${
                      isActive ? "text-primary" : "text-white group-hover:text-primary"
                    }`}>{item.label}</span>
                  </button>
                );
              } else {
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg transition-colors group min-h-[40px] ${
                      isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                    }`}
                  >
                    <Icon className={`h-4 w-4 transition-colors flex-shrink-0 ${
                      isActive ? "text-primary" : "text-white"
                    }`} />
                    <span className={`text-sm font-medium transition-colors truncate text-left leading-relaxed ${
                      isActive ? "text-primary" : "text-white group-hover:text-primary"
                    }`}>{item.label}</span>
                  </Link>
                );
              }
            })}
          </div>
        </div>
      </aside>
    </>
  );
}