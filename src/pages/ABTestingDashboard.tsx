import React, { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { AppNav } from '@/components/layout/AppNav';
import { MaterialABTestDashboard } from '@/components/ab-testing/MaterialABTestDashboard';
import { FolderOpen, FileText, FlaskConical, Layout, Book, Rocket, HelpCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Document Management sidebar navigation
const docManagementNavigation = [
  { to: "/doc-management", icon: Layout, label: "Doc Management" },
  { to: "/resumes", icon: FileText, label: "Resumes" },
  { to: "/cover-letters", icon: BarChart3, label: "Cover Letters" },
  { to: "/ab-testing", icon: FlaskConical, label: "A/B Testing" },
];

export default function ABTestingDashboard() {
  const location = useLocation();

  useEffect(() => {
    document.title = 'A/B Testing Dashboard | The Team';
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <AppNav />
      
      <div className="relative pt-16 min-h-screen">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:block w-60 bg-card border-2 border-primary fixed left-0 top-16 h-[calc(100vh-4rem)] overflow-y-auto z-30 rounded-r-lg">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <FolderOpen className="h-5 w-5 text-primary flex-shrink-0" />
              <h3 className="font-bold text-base text-white">Document Hub</h3>
            </div>
            <div className="space-y-1">
              {docManagementNavigation.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={index}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors group",
                      isActive(item.to)
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-muted text-foreground hover:text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Dropdown */}
        <aside className="lg:hidden fixed left-0 top-16 right-0 bg-card/80 backdrop-blur-md border-2 border-primary z-40 rounded-b-lg mx-2">
          <details className="group">
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" />
                <h3 className="font-bold text-base text-foreground">Document Hub</h3>
              </div>
              <svg className="h-5 w-5 transition-transform group-open:rotate-180 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-4 pb-4 space-y-1 border-t bg-background/80 backdrop-blur-md">
              {docManagementNavigation.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={index}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors group",
                      isActive(item.to)
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-muted/50 text-foreground hover:text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </details>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 lg:ml-60 overflow-x-hidden">
          <div className="px-2 sm:px-4 md:px-6 py-8 md:py-10 max-w-full">
            <MaterialABTestDashboard />
          </div>
        </main>
      </div>
    </div>
  );
}
